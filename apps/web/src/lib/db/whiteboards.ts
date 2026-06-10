/**
 * Server-side data access for whiteboards (architecture diagrams).
 */
import "server-only";
import { db } from "@devbrain/db";
import { whiteboards, users, projects } from "@devbrain/db/schema";
import { eq, desc } from "drizzle-orm";

export type WhiteboardWithMeta = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  data: unknown;
  thumbnail: string | null;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getWhiteboardsForProject(projectId: string): Promise<WhiteboardWithMeta[]> {
  const rows = await db
    .select({
      wb: whiteboards,
      author: users.name,
      project: projects.name,
    })
    .from(whiteboards)
    .leftJoin(users, eq(users.id, whiteboards.authorId))
    .leftJoin(projects, eq(projects.id, whiteboards.projectId))
    .where(eq(whiteboards.projectId, projectId))
    .orderBy(desc(whiteboards.updatedAt));

  return rows.map((r) => ({
    ...r.wb,
    authorName: r.author ?? "Unknown",
    projectName: r.project ?? "",
  }));
}

export async function getWhiteboardById(id: string): Promise<WhiteboardWithMeta | null> {
  const [row] = await db
    .select({
      wb: whiteboards,
      author: users.name,
      project: projects.name,
    })
    .from(whiteboards)
    .leftJoin(users, eq(users.id, whiteboards.authorId))
    .leftJoin(projects, eq(projects.id, whiteboards.projectId))
    .where(eq(whiteboards.id, id))
    .limit(1);

  if (!row) return null;
  return {
    ...row.wb,
    authorName: row.author ?? "Unknown",
    projectName: row.project ?? "",
  };
}

export async function getWhiteboardCount(projectId: string): Promise<number> {
  const rows = await db
    .select({ id: whiteboards.id })
    .from(whiteboards)
    .where(eq(whiteboards.projectId, projectId));
  return rows.length;
}
