"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { tasks, whiteboards } from "@devbrain/db/schema";
import { requireUser } from "@/lib/auth/current-user";
import { getProjectBySlug } from "@/lib/db/projects";
import { createNote } from "@/lib/db/notes";
import {
  createChat,
  listChats,
  getChat,
  getMessages,
  deleteChat,
} from "@/lib/db/ai-chats";
import type { AIAction, AIActionResult } from "@/lib/ai/types";

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line === "") {
      if (inList) { html.push("</ul>"); inList = false; }
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export async function executeAIAction(action: AIAction): Promise<AIActionResult> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const project = await getProjectBySlug(action.projectSlug, user.id);
  if (!project) return { ok: false, error: `Project "${action.projectSlug}" not found` };

  switch (action.type) {
    case "create_task": {
      const [created] = await db
        .insert(tasks)
        .values({
          projectId: project.id,
          title: action.title,
          description: action.description ?? "",
          status: "todo",
          priority: action.priority ?? "medium",
        })
        .returning();
      revalidatePath(`/projects/${action.projectSlug}/tasks`);
      return {
        ok: true,
        href: `/projects/${action.projectSlug}/tasks`,
        label: `Task "${created.title}" created`,
      };
    }

    case "create_note": {
      const htmlContent = markdownToHtml(action.content);
      const note = await createNote({
        title: action.title,
        content: htmlContent,
        projectId: project.id,
        authorId: user.id,
      });
      revalidatePath(`/projects/${action.projectSlug}/notes`);
      return {
        ok: true,
        href: `/notes/${note.slug}`,
        label: `Note "${note.title}" created`,
      };
    }

    case "create_whiteboard": {
      const [created] = await db
        .insert(whiteboards)
        .values({
          projectId: project.id,
          title: action.title,
          description: "",
          data: { version: 1, store: {} },
          authorId: user.id,
        })
        .returning();
      revalidatePath(`/projects/${action.projectSlug}/architecture`);
      return {
        ok: true,
        href: `/projects/${action.projectSlug}/architecture/${created.id}`,
        label: `Whiteboard "${created.title}" created`,
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
