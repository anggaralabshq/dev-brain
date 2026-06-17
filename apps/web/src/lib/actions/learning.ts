"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import {
  createLearningItem,
  updateLearningItemStatus,
  updateLearningItemNote,
  deleteLearningItem,
} from "@/lib/db/learning";
import { db } from "@devbrain/db";
import { notes, adrs, projects as projectsTable } from "@devbrain/db/schema";
import { eq, desc } from "drizzle-orm";
import type { LearningStatus } from "@devbrain/db/schema";

export async function addToBacklogAction(data: {
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  category?: string;
  tags?: string[];
  stars?: number;
}) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const item = await createLearningItem({ userId: user.id, ...data });
  revalidatePath("/learn");
  return { ok: true as const, item };
}

export async function updateStatusAction(id: string, status: LearningStatus) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await updateLearningItemStatus(id, user.id, status);
  revalidatePath("/learn");
  return { ok: true as const };
}

export async function updateNoteAction(id: string, personalNote: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await updateLearningItemNote(id, user.id, personalNote);
  revalidatePath("/learn");
  return { ok: true as const };
}

export async function deleteLearningItemAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await deleteLearningItem(id, user.id);
  revalidatePath("/learn");
  return { ok: true as const };
}

export async function analyzeStackAction(): Promise<{
  ok: boolean;
  suggestions?: Array<{
    title: string;
    description: string;
    category: string;
    tags: string[];
  }>;
  error?: string;
}> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return { ok: false, error: "AI not configured" };

  // Gather context from user's notes, ADRs, projects
  const [userNotes, userAdrs, userProjects] = await Promise.all([
    db.select({ title: notes.title, tags: notes.tags })
      .from(notes)
      .where(eq(notes.authorId, user.id))
      .orderBy(desc(notes.updatedAt))
      .limit(30),
    db.select({ title: adrs.title, decision: adrs.decision })
      .from(adrs)
      .innerJoin(projectsTable, eq(adrs.projectId, projectsTable.id))
      .where(eq(projectsTable.ownerId, user.id))
      .limit(20),
    db.select({ name: projectsTable.name, description: projectsTable.description })
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, user.id))
      .limit(10),
  ]);

  const context = [
    `Projects: ${userProjects.map(p => `${p.name}${p.description ? ` (${p.description})` : ""}`).join(", ")}`,
    `Note topics: ${userNotes.map(n => n.title).join(", ")}`,
    `Note tags: ${[...new Set(userNotes.flatMap(n => n.tags))].join(", ")}`,
    `Architecture decisions: ${userAdrs.map(a => a.title).join(", ")}`,
  ].join("\n");

  const prompt = `You are a senior AI/ML engineer advisor. Based on this developer's current work context, suggest 6 trending technologies, tools, or skills they should explore next.

Developer context:
${context}

Return ONLY a JSON array (no markdown, no explanation) with exactly this shape:
[
  {
    "title": "Technology or skill name",
    "description": "1-2 sentences on what it is and why relevant to this developer",
    "category": "one of: llm|agents|infra|tools|framework|paper|practice",
    "tags": ["tag1", "tag2"]
  }
]

Focus on: LLM ecosystem, AI agents, MLOps, emerging frameworks. Be specific and current (2024-2025).`;

  try {
    const res = await fetch(
      process.env.MINIMAX_API_URL ?? "https://api.minimax.io/v1/text/chatcompletion_v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.MINIMAX_MODEL ?? "MiniMax-M2.7-Highspeed",
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (!res.ok) return { ok: false, error: "AI request failed" };

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestions = JSON.parse(cleaned);

    if (!Array.isArray(suggestions)) return { ok: false, error: "Invalid AI response" };

    return { ok: true, suggestions };
  } catch {
    return { ok: false, error: "Failed to parse AI response" };
  }
}
