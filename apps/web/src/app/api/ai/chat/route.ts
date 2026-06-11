import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { buildSystemPrompt } from "@/lib/ai/context";
import {
  createChat,
  getChat,
  getMessages,
  saveMessage,
  touchChat,
  updateChatTitle,
} from "@/lib/db/ai-chats";

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
  let chatId = inputChatId;
  if (chatId) {
    const existing = await getChat(chatId, user.id);
    if (!existing) chatId = null;
  }
  if (!chatId) {
    const chat = await createChat({
      userId: user.id,
      projectId: undefined,
      title: message.slice(0, 60),
    });
    chatId = chat.id;
  }

  // Save user message
  await saveMessage({ chatId, role: "user", content: message });

  // Build history for MiniMax (last 20 messages)
  const history = await getMessages(chatId);
  const historyMessages = history.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Build system prompt with project context
  const systemPrompt = await buildSystemPrompt({
    userId: user.id,
    userName: user.name,
    projectSlug: projectSlug ?? null,
  });

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "MINIMAX_API_KEY not configured" }), { status: 500 });
  }

  // Call MiniMax streaming
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

  // Stream response back, collect full text, then save to DB
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      // Send chatId first so client can use it
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
                choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
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

      // Persist assistant reply
      if (fullContent) {
        await saveMessage({ chatId: chatId!, role: "assistant", content: fullContent });
        await touchChat(chatId!);
        // Update title from first real exchange if still default
        const chat = await getChat(chatId!, user.id);
        if (chat?.title === "New Chat") {
          await updateChatTitle(chatId!, message.slice(0, 60));
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
