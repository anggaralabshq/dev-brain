"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { meetings } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

export type MeetingFormData = {
  title: string;
  description?: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  location?: string;
  meetingNotes?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
};

export async function createMeetingAction(projectId: string, data: MeetingFormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  if (!projectId) return { ok: false as const, error: "Project required" };

  const [created] = await db
    .insert(meetings)
    .values({
      projectId,
      title: data.title.trim(),
      description: data.description?.trim() ?? "",
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      location: data.location?.trim() ?? "",
      meetingNotes: data.meetingNotes?.trim() ?? "",
      status: data.status ?? "scheduled",
      authorId: user.id,
    })
    .returning();

  revalidatePath(`/projects`, "layout");
  return { ok: true as const, id: created.id };
}

export async function updateMeetingAction(id: string, data: Partial<MeetingFormData>) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) set.title = data.title.trim();
  if (data.description !== undefined) set.description = data.description.trim();
  if (data.startAt !== undefined) set.startAt = new Date(data.startAt);
  if (data.endAt !== undefined) set.endAt = new Date(data.endAt);
  if (data.location !== undefined) set.location = data.location.trim();
  if (data.meetingNotes !== undefined) set.meetingNotes = data.meetingNotes.trim();
  if (data.status !== undefined) set.status = data.status;

  await db.update(meetings).set(set).where(eq(meetings.id, id));
  revalidatePath(`/projects`, "layout");
  return { ok: true as const };
}

export async function deleteMeetingAction(id: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await db.delete(meetings).where(eq(meetings.id, id));
  revalidatePath(`/projects`, "layout");
  return { ok: true as const };
}
