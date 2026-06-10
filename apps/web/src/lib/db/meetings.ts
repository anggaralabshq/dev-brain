import "server-only";
import { db } from "@devbrain/db";
import { meetings, users } from "@devbrain/db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

export type MeetingWithMeta = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  location: string;
  meetingNotes: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getMeetingsForProject(
  projectId: string,
  opts?: { from?: Date; to?: Date }
): Promise<MeetingWithMeta[]> {
  const conditions = [eq(meetings.projectId, projectId)];
  if (opts?.from) conditions.push(gte(meetings.startAt, opts.from));
  if (opts?.to) conditions.push(lte(meetings.startAt, opts.to));

  const rows = await db
    .select({ meeting: meetings, authorName: users.name })
    .from(meetings)
    .leftJoin(users, eq(users.id, meetings.authorId))
    .where(and(...conditions))
    .orderBy(asc(meetings.startAt));

  return rows.map((r) => ({
    ...r.meeting,
    authorName: r.authorName ?? "Unknown",
  }));
}

export async function getMeetingById(id: string): Promise<MeetingWithMeta | null> {
  const [row] = await db
    .select({ meeting: meetings, authorName: users.name })
    .from(meetings)
    .leftJoin(users, eq(users.id, meetings.authorId))
    .where(eq(meetings.id, id))
    .limit(1);

  if (!row) return null;
  return { ...row.meeting, authorName: row.authorName ?? "Unknown" };
}
