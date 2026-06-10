"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { whiteboards } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

export async function createWhiteboardAction(projectId: string, title: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  if (!projectId) return { ok: false as const, error: "Project is required" };

  const [created] = await db
    .insert(whiteboards)
    .values({
      projectId,
      title: title.trim() || "Untitled diagram",
      description: "",
      data: { version: 1, store: {} },
      authorId: user.id,
    })
    .returning();

  revalidatePath("/projects", "layout");
  revalidatePath(`/projects/${projectId}/architecture`);
  return { ok: true as const, id: created.id };
}

export async function saveWhiteboardAction(
  id: string,
  updates: { title?: string; description?: string; data?: string | unknown }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.title !== undefined) set.title = updates.title.trim();
  if (updates.description !== undefined) set.description = updates.description;
  if (updates.data !== undefined) {
    // Client sends JSON-stringified data to avoid RSC opaque-reference
    // errors with tldraw's Map/Set-based snapshot. Parse back to object
    // for JSONB storage.
    if (typeof updates.data === "string") {
      try {
        set.data = JSON.parse(updates.data);
      } catch {
        set.data = updates.data;
      }
    } else {
      set.data = updates.data;
    }
  }

  await db.update(whiteboards).set(set).where(eq(whiteboards.id, id));
  revalidatePath("/projects", "layout");
  return { ok: true as const };
}

export async function deleteWhiteboardAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await db.delete(whiteboards).where(eq(whiteboards.id, id));
  revalidatePath("/projects", "layout");
  return { ok: true as const };
}
