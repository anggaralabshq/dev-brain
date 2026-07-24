import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { resolveAnthropicApiKey } from "@/lib/ai/anthropic-key";
import type { DiagramNode, DiagramEdge } from "@/lib/ai/types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-fable-5";

const SYSTEM_PROMPT = `You turn a short prompt into a system/architecture diagram spec.
Emit the emit_diagram tool call with concise node labels (2-4 words) and only the edges needed to show the flow. Pick shapes/colors that make sense (e.g. cylinder+green for databases, rectangle+blue for services, diamond for decisions).`;

const EMIT_DIAGRAM_TOOL = {
  name: "emit_diagram",
  description: "Emit a structured architecture/flow diagram to render on the canvas.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "short unique id, e.g. 'api'" },
            label: { type: "string" },
            shape: { type: "string", enum: ["rectangle", "ellipse", "diamond", "cylinder", "hexagon", "circle"] },
            color: { type: "string", enum: ["blue", "violet", "green", "red", "orange", "yellow", "pink", "cyan", "grey"] },
          },
          required: ["id", "label"],
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
          },
          required: ["from", "to"],
        },
      },
    },
    required: ["title", "nodes", "edges"],
  },
};

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await req.json() as { prompt: string };
  if (!prompt?.trim()) {
    return Response.json({ error: "Prompt required" }, { status: 400 });
  }

  const apiKey = await resolveAnthropicApiKey(userId);
  if (!apiKey) {
    return Response.json({ error: "No Anthropic API key configured — add one in Settings → AI" }, { status: 500 });
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      tools: [EMIT_DIAGRAM_TOOL],
      tool_choice: { type: "tool", name: "emit_diagram" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return Response.json({ error: `Claude error: ${errText}` }, { status: 502 });
  }

  const data = await res.json() as {
    content: Array<{ type: string; input?: { title: string; nodes: DiagramNode[]; edges: DiagramEdge[] } }>;
  };
  const toolUse = data.content.find((b) => b.type === "tool_use");
  if (!toolUse?.input) {
    return Response.json({ error: "Model did not return a diagram" }, { status: 502 });
  }

  return Response.json(toolUse.input);
}
