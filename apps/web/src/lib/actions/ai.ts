"use server";

import { requireUser } from "@/lib/auth/current-user";
import {
  createChat,
  listChats,
  getChat,
  getMessages,
  deleteChat,
} from "@/lib/db/ai-chats";

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
