/**
 * Server-side data access for notes.
 */
import "server-only";
import { db } from "@devbrain/db";
import { notes, users, projects } from "@devbrain/db/schema";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { extractNoteLinks, makeExcerpt, slugifyNoteRef } from "@/lib/notes/links";

export type NoteWithMeta = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  projectId: string | null;
  projectName: string | null;
  projectSlug: string | null;
  authorId: string;
  authorName: string;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  outgoingLinks: string[]; // slugs of notes this note links to
  createdAt: Date;
  updatedAt: Date;
};

/** Get all notes accessible to user (optionally filter by project) */
export async function getNotes(opts?: {
  projectId?: string;
  includeArchived?: boolean;
  authorId?: string;
}) {
  const conditions = [];
  if (opts?.projectId) conditions.push(eq(notes.projectId, opts.projectId));
  if (!opts?.includeArchived) conditions.push(eq(notes.archived, false));
  if (opts?.authorId) conditions.push(eq(notes.authorId, opts.authorId));

  const rows = await db
    .select({
      note: notes,
      author: users.name,
      projectName: projects.name,
      projectSlug: projects.slug,
    })
    .from(notes)
    .leftJoin(users, eq(users.id, notes.authorId))
    .leftJoin(projects, eq(projects.id, notes.projectId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));

  return rows.map((r) => ({
    ...r.note,
    authorName: r.author ?? "Unknown",
    projectName: r.projectName ?? null,
    projectSlug: r.projectSlug ?? null,
    outgoingLinks: extractNoteLinks(r.note.content),
  }));
}

/** Get single note by slug (slug is globally unique) */
export async function getNoteBySlug(slug: string) {
  const [row] = await db
    .select({
      note: notes,
      author: users.name,
      projectName: projects.name,
      projectSlug: projects.slug,
    })
    .from(notes)
    .leftJoin(users, eq(users.id, notes.authorId))
    .leftJoin(projects, eq(projects.id, notes.projectId))
    .where(eq(notes.slug, slug))
    .limit(1);

  if (!row) return null;
  return {
    ...row.note,
    authorName: row.author ?? "Unknown",
    projectName: row.projectName ?? null,
    projectSlug: row.projectSlug ?? null,
    outgoingLinks: extractNoteLinks(row.note.content),
  };
}

/** Get notes that link TO a given note slug (backlinks) */
export async function getBacklinks(targetSlug: string) {
  // Get all notes (not archived) and filter by outgoingLinks
  const all = await getNotes();
  return all.filter((n) => n.outgoingLinks.includes(targetSlug));
}

export type CreateNoteInput = {
  title: string;
  content?: string;
  projectId?: string | null;
  authorId: string;
  tags?: string[];
  pinned?: boolean;
};

export type UpdateNoteInput = {
  id: string;
  title?: string;
  content?: string;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
};

/** Helper to make a slug unique (globally) */
async function uniqueSlug(base: string): Promise<string> {
  const slug = slugifyNoteRef(base) || `note-${Date.now()}`;

  const [existing] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(eq(notes.slug, slug))
    .limit(1);

  if (!existing) return slug;
  // Append numeric suffix
  let i = 2;
  while (i < 1000) {
    const candidate = `${slug}-${i}`;
    const [found] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.slug, candidate))
      .limit(1);
    if (!found) return candidate;
    i++;
  }
  return `${slug}-${Date.now()}`;
}

export async function createNote(input: CreateNoteInput) {
  const slug = await uniqueSlug(input.title);
  const content = input.content ?? "";
  const excerpt = makeExcerpt(content);

  const [created] = await db
    .insert(notes)
    .values({
      slug,
      title: input.title.trim(),
      content,
      excerpt,
      projectId: input.projectId ?? null,
      authorId: input.authorId,
      pinned: input.pinned ?? false,
      tags: input.tags ?? [],
    })
    .returning();

  return created;
}

export async function updateNote(input: UpdateNoteInput) {
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.content !== undefined) {
    update.content = input.content;
    update.excerpt = makeExcerpt(input.content);
  }
  if (input.pinned !== undefined) update.pinned = input.pinned;
  if (input.archived !== undefined) update.archived = input.archived;
  if (input.tags !== undefined) update.tags = input.tags;

  const [updated] = await db
    .update(notes)
    .set(update)
    .where(eq(notes.id, input.id))
    .returning();

  return updated;
}

export async function deleteNote(id: string) {
  await db.delete(notes).where(eq(notes.id, id));
}
