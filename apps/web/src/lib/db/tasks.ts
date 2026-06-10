/**
 * Server-side data access for tasks.
 */
import "server-only";
import { db } from "@devbrain/db";
import { tasks, users, projects } from "@devbrain/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";

export type TaskWithMeta = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const colorByName: Record<string, string> = {
  "Andi Pratama": "bg-violet-500",
  "Siti Aisyah": "bg-emerald-500",
  "Budi Santoso": "bg-blue-500",
  "Dewi Lestari": "bg-orange-500",
  "Rina Wijaya": "bg-pink-500",
  "Fajar Nugroho": "bg-cyan-500",
  "Maya Sari": "bg-yellow-500",
};

function colorFor(name: string): string {
  return colorByName[name] ?? "bg-muted-foreground";
}

export async function getTasksForProject(projectId: string): Promise<TaskWithMeta[]> {
  const rows = await db
    .select({
      task: tasks,
      assignee: { id: users.id, name: users.name },
      project: { name: projects.name },
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.createdAt));

  return rows.map((r) => ({
    ...r.task,
    projectName: r.project?.name ?? "",
    assigneeName: r.assignee?.name ?? null,
    assigneeColor: r.assignee ? colorFor(r.assignee.name) : null,
  }));
}

export async function getTaskById(id: string) {
  const [row] = await db
    .select({
      task: tasks,
      assignee: { id: users.id, name: users.name },
      project: { name: projects.name, slug: projects.slug },
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.id, id))
    .limit(1);

  if (!row) return null;
  return {
    ...row.task,
    projectName: row.project?.name ?? "",
    projectSlug: row.project?.slug ?? "",
    assigneeName: row.assignee?.name ?? null,
    assigneeColor: row.assignee ? colorFor(row.assignee.name) : null,
  };
}

export async function getOpenTaskCount(projectId: string) {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), inArray(tasks.status, ["todo", "in_progress", "in_review"])));
  return rows.length;
}
