"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { tasks, projects } from "@devbrain/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

async function recalcProjectProgress(projectId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done:  sql<number>`count(*) filter (where status = 'done')::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "archived")));

  const total = row?.total ?? 0;
  const done  = row?.done  ?? 0;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  await db
    .update(projects)
    .set({ progress, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const projectId = (formData.get("projectId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as string) || "todo";
  const priority = (formData.get("priority") as string) || "medium";
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const dueDate = (formData.get("dueDate") as string) || null;

  if (!projectId) return { ok: false as const, error: "Project is required" };
  if (!title) return { ok: false as const, error: "Title is required" };

  const [created] = await db
    .insert(tasks)
    .values({
      projectId,
      title,
      description,
      status: status as "todo" | "in_progress" | "in_review" | "done" | "archived",
      priority: priority as "low" | "medium" | "high" | "urgent",
      assigneeId: assigneeId === "" ? null : assigneeId,
      dueDate: dueDate === "" ? null : dueDate,
    })
    .returning();

  await recalcProjectProgress(projectId);
  revalidatePath(`/projects`);
  return { ok: true as const, id: created.id };
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const validStatuses = ["todo", "in_progress", "in_review", "done", "archived"];
  if (!validStatuses.includes(status)) {
    return { ok: false as const, error: "Invalid status" };
  }

  const completedAt = status === "done" ? new Date() : null;

  const [updated] = await db
    .update(tasks)
    .set({ status: status as "todo", completedAt, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning({ projectId: tasks.projectId });

  if (updated?.projectId) await recalcProjectProgress(updated.projectId);
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function deleteTaskAction(taskId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [deleted] = await db
    .delete(tasks)
    .where(eq(tasks.id, taskId))
    .returning({ projectId: tasks.projectId });

  if (deleted?.projectId) await recalcProjectProgress(deleted.projectId);
  revalidatePath("/projects");
  return { ok: true as const };
}
