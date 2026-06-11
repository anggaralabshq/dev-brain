"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getNotifications, markNotificationsSeen, getNotificationsSeenAt } from "@/lib/db/notifications";
import type { NotificationItem } from "@/lib/db/notifications";

export async function getNotificationsAction(): Promise<NotificationItem[]> {
  const user = await requireUser().catch(() => null);
  if (!user) return [];
  return getNotifications(user.id);
}

export async function markNotificationsSeenAction(): Promise<void> {
  const user = await requireUser().catch(() => null);
  if (!user) return;
  await markNotificationsSeen(user.id);
}

export async function getUnreadCountAction(): Promise<number> {
  const user = await requireUser().catch(() => null);
  if (!user) return 0;
  const [items, seenAt] = await Promise.all([
    getNotifications(user.id),
    getNotificationsSeenAt(user.id),
  ]);
  if (!seenAt) return items.length;
  return items.filter((n) => n.timestamp > seenAt).length;
}
