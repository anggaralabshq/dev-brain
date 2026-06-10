/**
 * Server-side data access for ADRs (Architecture Decision Records).
 */
import "server-only";
import { db } from "@devbrain/db";
import { adrs, users, projects } from "@devbrain/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export type AdrWithMeta = {
  id: string;
  projectId: string;
  projectName: string;
  number: number;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  context: string;
  decision: string;
  consequences: string;
  decisionDate: string | null;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAdrsForProject(projectId: string): Promise<AdrWithMeta[]> {
  const rows = await db
    .select({
      adr: adrs,
      author: users.name,
      project: projects.name,
    })
    .from(adrs)
    .leftJoin(users, eq(users.id, adrs.authorId))
    .leftJoin(projects, eq(projects.id, adrs.projectId))
    .where(eq(adrs.projectId, projectId))
    .orderBy(desc(adrs.number));

  return rows.map((r) => ({
    ...r.adr,
    authorName: r.author ?? "Unknown",
    projectName: r.project ?? "",
  }));
}

export async function getAdrById(id: string) {
  const [row] = await db
    .select({
      adr: adrs,
      author: users.name,
      project: { name: projects.name, slug: projects.slug },
    })
    .from(adrs)
    .leftJoin(users, eq(users.id, adrs.authorId))
    .leftJoin(projects, eq(projects.id, adrs.projectId))
    .where(eq(adrs.id, id))
    .limit(1);

  if (!row) return null;
  return {
    ...row.adr,
    authorName: row.author ?? "Unknown",
    projectName: row.project?.name ?? "",
    projectSlug: row.project?.slug ?? "",
  };
}

/** Get next ADR number for a project (max + 1) */
export async function getNextAdrNumber(projectId: string): Promise<number> {
  const [result] = await db
    .select({ max: sql<number>`COALESCE(MAX(${adrs.number}), 0)::int` })
    .from(adrs)
    .where(eq(adrs.projectId, projectId));
  return (result?.max ?? 0) + 1;
}

export async function getAdrCount(projectId: string) {
  const rows = await db
    .select({ id: adrs.id })
    .from(adrs)
    .where(eq(adrs.projectId, projectId));
  return rows.length;
}
