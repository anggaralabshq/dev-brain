import "server-only";
import { db } from "@devbrain/db";
import { aiChats, aiMessages } from "@devbrain/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";

export async function createChat(opts: {
  userId: string;
  projectId?: string | null;
  title?: string;
}) {
  const [chat] = await db
    .insert(aiChats)
    .values({
      userId: opts.userId,
      projectId: opts.projectId ?? null,
      title: opts.title ?? "New Chat",
    })
    .returning();
  return chat;
}

export async function listChats(userId: string, projectId?: string | null) {
  const conditions = [eq(aiChats.userId, userId)];
  if (projectId !== undefined) {
    conditions.push(
      projectId ? eq(aiChats.projectId, projectId) : eq(aiChats.projectId, null as unknown as string)
    );
  }
  return db
    .select()
    .from(aiChats)
    .where(and(...conditions))
    .orderBy(desc(aiChats.updatedAt))
    .limit(20);
}

export async function getChat(id: string, userId: string) {
  const [chat] = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.id, id), eq(aiChats.userId, userId)))
    .limit(1);
  return chat ?? null;
}

export async function updateChatTitle(id: string, title: string) {
  await db
    .update(aiChats)
    .set({ title, updatedAt: new Date() })
    .where(eq(aiChats.id, id));
}

export async function touchChat(id: string) {
  await db
    .update(aiChats)
    .set({ updatedAt: new Date() })
    .where(eq(aiChats.id, id));
}

export async function deleteChat(id: string, userId: string) {
  await db
    .delete(aiChats)
    .where(and(eq(aiChats.id, id), eq(aiChats.userId, userId)));
}

export async function getMessages(chatId: string) {
  return db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.chatId, chatId))
    .orderBy(asc(aiMessages.createdAt));
}

export async function saveMessage(opts: {
  chatId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const [msg] = await db
    .insert(aiMessages)
    .values(opts)
    .returning();
  return msg;
}
