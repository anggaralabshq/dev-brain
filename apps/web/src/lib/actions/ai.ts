"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { tasks, whiteboards, adrs, meetings, projects as projectsTable, projectMembers } from "@devbrain/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";
import { getProjectBySlug } from "@/lib/db/projects";
import { createNote } from "@/lib/db/notes";
import { getNextAdrNumber } from "@/lib/db/adrs";
import {
  createChat,
  listChats,
  getChat,
  getMessages,
  deleteChat,
} from "@/lib/db/ai-chats";
import { marked } from "marked";
import type { AIAction, AIActionResult } from "@/lib/ai/types";
import { diagramSpecToSnapshot } from "@/lib/ai/diagram";

function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

export async function executeAIAction(action: AIAction): Promise<AIActionResult> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  // Actions that don't need a project slug
  if (action.type === "create_project") {
    const slug = action.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.slug, slug)).limit(1);
    if (existing.length > 0) return { ok: false, error: `Project slug "${slug}" already exists` };

    const [created] = await db.insert(projectsTable).values({
      slug,
      name: action.name,
      description: action.description ?? "",
      color: action.color ?? "violet",
      ownerId: user.id,
      status: "planning",
      progress: 0,
      tags: [],
    }).returning();

    await db.insert(projectMembers).values({ projectId: created.id, userId: user.id, role: "owner" });
    revalidatePath("/projects");
    return { ok: true, href: `/projects/${slug}`, label: `Project "${action.name}" created` };
  }

  // All other actions need a valid project
  const project = await getProjectBySlug(action.projectSlug, user.id);
  if (!project) return { ok: false, error: `Project "${action.projectSlug}" not found` };

  switch (action.type) {
    case "create_task": {
      const [created] = await db.insert(tasks).values({
        projectId: project.id,
        title: action.title,
        description: action.description ?? "",
        status: "todo",
        priority: action.priority ?? "medium",
      }).returning();
      revalidatePath(`/projects/${action.projectSlug}/tasks`);
      return { ok: true, href: `/projects/${action.projectSlug}/tasks`, label: `Task "${created.title}" created` };
    }

    case "update_task_status": {
      const [updated] = await db.update(tasks)
        .set({ status: action.status })
        .where(and(eq(tasks.id, action.taskId), eq(tasks.projectId, project.id)))
        .returning();
      if (!updated) return { ok: false, error: "Task not found" };
      revalidatePath(`/projects/${action.projectSlug}/tasks`);
      return { ok: true, href: `/projects/${action.projectSlug}/tasks`, label: `Task marked as ${action.status}` };
    }

    case "delete_task": {
      await db.delete(tasks).where(and(eq(tasks.id, action.taskId), eq(tasks.projectId, project.id)));
      revalidatePath(`/projects/${action.projectSlug}/tasks`);
      return { ok: true, href: `/projects/${action.projectSlug}/tasks`, label: "Task deleted" };
    }

    case "create_note": {
      const note = await createNote({
        title: action.title,
        content: markdownToHtml(action.content),
        projectId: project.id,
        authorId: user.id,
      });
      revalidatePath(`/projects/${action.projectSlug}/notes`);
      return { ok: true, href: `/notes/${note.slug}`, label: `Note "${note.title}" created` };
    }

    case "create_whiteboard": {
      const [created] = await db.insert(whiteboards).values({
        projectId: project.id,
        title: action.title,
        description: "",
        data: { version: 1, store: {} },
        authorId: user.id,
      }).returning();
      revalidatePath(`/projects/${action.projectSlug}/architecture`);
      return { ok: true, href: `/projects/${action.projectSlug}/architecture/${created.id}`, label: `Whiteboard "${created.title}" created` };
    }

    case "create_adr": {
      const number = await getNextAdrNumber(project.id);
      const [created] = await db.insert(adrs).values({
        projectId: project.id,
        number,
        title: action.title,
        status: action.status ?? "proposed",
        context: action.context ?? "",
        decision: action.decision ?? "",
        consequences: action.consequences ?? "",
        authorId: user.id,
      }).returning();
      revalidatePath(`/projects/${action.projectSlug}/adr`);
      return { ok: true, href: `/projects/${action.projectSlug}/adr/${created.id}`, label: `ADR-${number}: ${action.title} created` };
    }

    case "create_meeting": {
      const [created] = await db.insert(meetings).values({
        projectId: project.id,
        title: action.title,
        description: action.description ?? "",
        startAt: new Date(action.startAt),
        endAt: new Date(action.endAt),
        location: action.location ?? "",
        meetingNotes: action.notes ?? "",
        status: "scheduled",
        authorId: user.id,
      }).returning();
      revalidatePath(`/projects/${action.projectSlug}/meetings`);
      return { ok: true, href: `/projects/${action.projectSlug}/meetings`, label: `Meeting "${created.title}" scheduled` };
    }

    case "create_diagram": {
      const snapshot = diagramSpecToSnapshot({ nodes: action.nodes, edges: action.edges });
      const [created] = await db.insert(whiteboards).values({
        projectId: project.id,
        title: action.title,
        description: "",
        data: snapshot,
        authorId: user.id,
      }).returning();
      revalidatePath(`/projects/${action.projectSlug}/architecture`);
      return {
        ok: true,
        href: `/projects/${action.projectSlug}/architecture/${created.id}`,
        label: `Diagram "${action.title}" created`,
      };
    }
  }
}

export async function createChatAction(opts: { projectId?: string | null; title?: string }) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const chat = await createChat({ userId: user.id, ...opts });
  return { ok: true as const, chat };
}

export async function listChatsAction(projectId?: string | null) {
  const user = await requireUser().catch(() => null);
  if (!user) return [];
  return listChats(user.id, projectId);
}

export async function getChatAction(chatId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return null;
  return getChat(chatId, user.id);
}

export async function getMessagesAction(chatId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return [];
  const chat = await getChat(chatId, user.id);
  if (!chat) return [];
  return getMessages(chatId);
}

export async function deleteChatAction(chatId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  await deleteChat(chatId, user.id);
  return { ok: true as const };
}
