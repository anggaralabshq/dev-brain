import "server-only";
import { db } from "@devbrain/db";
import { projectFiles, users } from "@devbrain/db/schema";
import { desc, eq } from "drizzle-orm";

export type ProjectFileWithMeta = {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: Date;
};

export async function getFilesForProject(projectId: string): Promise<ProjectFileWithMeta[]> {
  const rows = await db
    .select({ file: projectFiles, uploaderName: users.name })
    .from(projectFiles)
    .leftJoin(users, eq(users.id, projectFiles.uploaderId))
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.createdAt));

  return rows.map((r) => ({ ...r.file, uploaderName: r.uploaderName ?? "Unknown" }));
}
