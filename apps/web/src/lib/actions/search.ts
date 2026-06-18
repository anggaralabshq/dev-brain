"use server";

import { db } from "@devbrain/db";
import { notes, tasks, projects, adrs } from "@devbrain/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

export type SearchResultType = "note" | "task" | "project" | "adr";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const user = await requireUser().catch(() => null);
  if (!user) return [];

  const like = `%${q}%`;

  const [notesRes, tasksRes, projectsRes, adrsRes] = await Promise.all([
    db
      .select({ id: notes.id, title: notes.title, slug: notes.slug, excerpt: notes.excerpt })
      .from(notes)
      .where(and(eq(notes.authorId, user.id), or(ilike(notes.title, like), ilike(notes.content, like))))
      .limit(5),
    db
      .select({ id: tasks.id, title: tasks.title, projectSlug: projects.slug, projectName: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(projects.ownerId, user.id), ilike(tasks.title, like)))
      .limit(5),
    db
      .select({ id: projects.id, name: projects.name, slug: projects.slug, status: projects.status })
      .from(projects)
      .where(and(eq(projects.ownerId, user.id), or(ilike(projects.name, like), ilike(projects.description, like))))
      .limit(5),
    db
      .select({ id: adrs.id, title: adrs.title, number: adrs.number, projectSlug: projects.slug, projectName: projects.name })
      .from(adrs)
      .innerJoin(projects, eq(adrs.projectId, projects.id))
      .where(and(eq(projects.ownerId, user.id), ilike(adrs.title, like)))
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const n of notesRes) {
    results.push({
      id: n.id,
      type: "note",
      title: n.title,
      subtitle: n.excerpt || undefined,
      href: `/notes/${n.slug}`,
    });
  }
  for (const t of tasksRes) {
    results.push({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: t.projectName ?? undefined,
      href: `/projects/${t.projectSlug}/tasks`,
    });
  }
  for (const p of projectsRes) {
    results.push({
      id: p.id,
      type: "project",
      title: p.name,
      subtitle: p.status,
      href: `/projects/${p.slug}`,
    });
  }
  for (const a of adrsRes) {
    results.push({
      id: a.id,
      type: "adr",
      title: `ADR-${a.number}: ${a.title}`,
      subtitle: a.projectName ?? undefined,
      href: `/projects/${a.projectSlug}/adr/${a.id}`,
    });
  }

  return results;
}
