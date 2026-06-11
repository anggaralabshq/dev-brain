import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { buildContext, matchEntities } from "@/lib/ai/context";
import type { AIAction } from "@/lib/ai/types";
import {
  createChat,
  getChat,
  getMessages,
  saveMessage,
  touchChat,
  updateChatTitle,
} from "@/lib/db/ai-chats";

const ACTION_TAG_RE = /<devbrain-action>([\s\S]*?)<\/devbrain-action>/g;

function parseActions(text: string): { stripped: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  const stripped = text.replace(ACTION_TAG_RE, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim()) as AIAction;
      if (parsed.type) actions.push(parsed);
    } catch { /* skip malformed */ }
    return "";
  }).trim();
  return { stripped, actions };
}

const MINIMAX_API_URL = process.env.MINIMAX_API_URL ?? "https://api.minimax.io/v1/text/chatcompletion_v2";
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M2.7-Highspeed";

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json() as {
    message: string;
    chatId?: string | null;
    projectSlug?: string | null;
  };

  const { message, chatId: inputChatId, projectSlug } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
  }

  // Resolve or create chat
  let chatId = inputChatId ?? null;
  if (chatId) {
    const existing = await getChat(chatId, user.id);
    if (!existing) chatId = null;
  }
  if (!chatId) {
    const chat = await createChat({
      userId: user.id,
      title: message.slice(0, 60),
    });
    chatId = chat.id;
  }

  // Save user message
  await saveMessage({ chatId, role: "user", content: message });

  // Build history (last 20 messages)
  const history = await getMessages(chatId);
  const historyMessages = history.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Build system prompt + entities for suggestion matching
  const { systemPrompt, entities } = await buildContext({
    userId: user.id,
    userName: user.name,
    projectSlug: projectSlug ?? null,
  });

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "MINIMAX_API_KEY not configured" }), { status: 500 });
  }

  const minimaxRes = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
      ],
    }),
  });

  if (!minimaxRes.ok) {
    const errText = await minimaxRes.text();
    return new Response(JSON.stringify({ error: `MiniMax error: ${errText}` }), { status: 502 });
  }

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chatId })}\n\n`));

      const reader = minimaxRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Persist assistant reply (strip action tags before saving)
      if (fullContent) {
        const { stripped, actions: pendingActions } = parseActions(fullContent);
        const contentToSave = stripped || fullContent;

        await saveMessage({ chatId: chatId!, role: "assistant", content: contentToSave });
        await touchChat(chatId!);
        const chat = await getChat(chatId!, user.id);
        if (chat?.title === "New Chat") {
          await updateChatTitle(chatId!, message.slice(0, 60));
        }

        // Send stripped content as a corrective event so client shows clean text
        if (stripped !== fullContent) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ finalContent: stripped })}\n\n`)
          );
        }

        // Send matched entity suggestions
        const suggestions = matchEntities(contentToSave, entities);
        if (suggestions.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ suggestions })}\n\n`)
          );
        }

        // Send pending actions for user confirmation
        if (pendingActions.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ pendingActions })}\n\n`)
          );
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
