"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { projectFiles } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadFileAction(projectId: string, formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false as const, error: "No file provided" };
  if (file.size > MAX_SIZE) return { ok: false as const, error: "File exceeds 5 MB limit" };

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  await db.insert(projectFiles).values({
    projectId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: base64,
    uploaderId: user.id,
  });

  revalidatePath(`/projects`, "layout");
  return { ok: true as const };
}

export async function deleteFileAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await db.delete(projectFiles).where(eq(projectFiles.id, id));
  revalidatePath(`/projects`, "layout");
  return { ok: true as const };
}
