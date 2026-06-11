import "server-only";
import { db } from "@devbrain/db";
import { tasks, meetings, adrs, projectMembers, projects } from "@devbrain/db/schema";
import { eq, and, gte, lte, inArray, desc, ne } from "drizzle-orm";

export type NotificationItem = {
  id: string;
  type: "meeting_soon" | "task_assigned" | "task_overdue" | "task_due_soon" | "adr_created";
  title: string;
  body: string;
  href: string;
  timestamp: Date;
};

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const memberRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberRows.map((r) => r.projectId);
  if (projectIds.length === 0) return [];

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [upcomingMeetings, assignedTasks, recentAdrs, projectRows] = await Promise.all([
    db
      .select({ id: meetings.id, title: meetings.title, startAt: meetings.startAt, projectId: meetings.projectId })
      .from(meetings)
      .where(
        and(
          inArray(meetings.projectId, projectIds),
          gte(meetings.startAt, now),
          lte(meetings.startAt, in24h),
          ne(meetings.status, "cancelled"),
        )
      )
      .orderBy(meetings.startAt)
      .limit(5),

    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, projectId: tasks.projectId, createdAt: tasks.createdAt })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          inArray(tasks.status, ["todo", "in_progress", "in_review"]),
        )
      )
      .orderBy(desc(tasks.createdAt))
      .limit(10),

    db
      .select({ id: adrs.id, title: adrs.title, number: adrs.number, projectId: adrs.projectId, createdAt: adrs.createdAt })
      .from(adrs)
      .where(and(inArray(adrs.projectId, projectIds), gte(adrs.createdAt, ago7d)))
      .orderBy(desc(adrs.createdAt))
      .limit(5),

    db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .where(inArray(projects.id, projectIds)),
  ]);

  const slugOf = new Map(projectRows.map((p) => [p.id, p.slug]));

  const items: NotificationItem[] = [];

  for (const m of upcomingMeetings) {
    const slug = slugOf.get(m.projectId);
    const diffMin = Math.round((m.startAt.getTime() - now.getTime()) / 60000);
    const when = diffMin < 60 ? `in ${diffMin}m` : `in ${Math.round(diffMin / 60)}h`;
    items.push({
      id: `meeting:${m.id}`,
      type: "meeting_soon",
      title: "Upcoming meeting",
      body: `${m.title} — starts ${when}`,
      href: slug ? `/projects/${slug}/meetings` : "/",
      timestamp: m.startAt,
    });
  }

  for (const t of assignedTasks) {
    const slug = slugOf.get(t.projectId);
    const href = slug ? `/projects/${slug}/tasks` : "/";
    const due = t.dueDate ? new Date(t.dueDate) : null;
    if (due && due < now) {
      items.push({
        id: `task:overdue:${t.id}`,
        type: "task_overdue",
        title: "Overdue task",
        body: t.title,
        href,
        timestamp: due,
      });
    } else if (due && due <= tomorrow) {
      items.push({
        id: `task:duesoon:${t.id}`,
        type: "task_due_soon",
        title: "Task due soon",
        body: t.title,
        href,
        timestamp: due,
      });
    } else {
      items.push({
        id: `task:assigned:${t.id}`,
        type: "task_assigned",
        title: "Task assigned to you",
        body: t.title,
        href,
        timestamp: t.createdAt,
      });
    }
  }

  for (const a of recentAdrs) {
    const slug = slugOf.get(a.projectId);
    items.push({
      id: `adr:${a.id}`,
      type: "adr_created",
      title: "New ADR created",
      body: `ADR-${a.number}: ${a.title}`,
      href: slug ? `/projects/${slug}/adr/${a.id}` : "/",
      timestamp: a.createdAt,
    });
  }

  // Sort: overdue/meeting_soon first, then by timestamp desc
  const priority = (type: NotificationItem["type"]) =>
    type === "task_overdue" || type === "meeting_soon" ? 0 : 1;

  items.sort((a, b) => {
    const pd = priority(a.type) - priority(b.type);
    if (pd !== 0) return pd;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return items.slice(0, 20);
}

export async function getNotificationsSeenAt(userId: string): Promise<Date | null> {
  const { users } = await import("@devbrain/db/schema");
  const [row] = await db
    .select({ notificationsSeenAt: users.notificationsSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.notificationsSeenAt ?? null;
}

export async function markNotificationsSeen(userId: string): Promise<void> {
  const { users } = await import("@devbrain/db/schema");
  await db
    .update(users)
    .set({ notificationsSeenAt: new Date() })
    .where(eq(users.id, userId));
}
