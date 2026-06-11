"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { notes, projects } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";
import { createNote as dbCreateNote, updateNote as dbUpdateNote, deleteNote as dbDeleteNote, searchNotes as dbSearchNotes, refreshAllExcerpts as dbRefreshAllExcerpts } from "@/lib/db/notes";

export async function createNoteAction(formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";
  const projectId = (formData.get("projectId") as string) || null;
  const tagsRaw = (formData.get("tags") as string) ?? "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!title) return { ok: false as const, error: "Title is required" };

  const created = await dbCreateNote({
    title,
    content,
    projectId: projectId === "" ? null : projectId,
    authorId: user.id,
    tags,
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${created.slug}`);
  if (created.projectId) {
    const [project] = await db
      .select({ slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, created.projectId))
      .limit(1);
    if (project) revalidatePath(`/projects/${project.slug}/notes`);
  }

  return { ok: true as const, slug: created.slug, id: created.id };
}

export async function updateNoteAction(formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const id = (formData.get("id") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";

  if (!id) return { ok: false as const, error: "Note id is required" };
  if (!title) return { ok: false as const, error: "Title is required" };

  const updated = await dbUpdateNote({ id, title, content });

  revalidatePath("/notes");
  revalidatePath(`/notes/${updated.slug}`);
  return { ok: true as const, slug: updated.slug };
}

export async function deleteNoteAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await dbDeleteNote(id);
  revalidatePath("/notes");
  return { ok: true as const };
}

export async function searchNotesAction(query: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return [];
  return dbSearchNotes({ query, authorId: user.id, limit: 10 });
}

export async function refreshAllExcerptsAction() {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const count = await dbRefreshAllExcerpts(user.id);
  revalidatePath("/notes");
  return { ok: true as const, count };
}

export async function togglePinAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [current] = await db
    .select({ pinned: notes.pinned, slug: notes.slug })
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1);
  if (!current) return { ok: false as const, error: "Note not found" };

  await db
    .update(notes)
    .set({ pinned: !current.pinned, updatedAt: new Date() })
    .where(eq(notes.id, id));

  revalidatePath("/notes");
  revalidatePath(`/notes/${current.slug}`);
  return { ok: true as const, pinned: !current.pinned };
}
