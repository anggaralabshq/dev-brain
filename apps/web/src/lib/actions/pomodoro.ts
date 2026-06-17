"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { pomodoroSessions, pomodoroSettings, tasks } from "@devbrain/db/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";
import {
  getSessionsByUser,
  getSessionsByProject,
  getSessionsByDateRange,
  getPomodoroSettingsByUserId,
  upsertPomodoroSettingsByUserId,
  getPomodoroStats,
  getAnalyticsOverview,
  getProjectBreakdown,
  getTaskBreakdown,
  getDailyHeatmap,
  getDailyTrend,
  getRecentSessions,
  getSessionsForDate,
  type PomodoroSessionWithTask,
} from "@/lib/db/pomodoro";

export async function startSessionAction(
  projectId: string | undefined,
  taskId?: string,
  durationMin?: number
) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  let resolvedProjectId = projectId;

  if (!resolvedProjectId && taskId) {
    const [task] = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (task) resolvedProjectId = task.projectId;
  }

  if (!resolvedProjectId) return { ok: false as const, error: "Project is required" };

  const [created] = await db
    .insert(pomodoroSessions)
    .values({
      projectId: resolvedProjectId,
      taskId: taskId ?? null,
      userId: user.id,
      workDurationMin: durationMin ?? 25,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  revalidatePath("/");
  return { ok: true as const, sessionId: created.id };
}

export async function completeSessionAction(sessionId: string, note?: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [session] = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, sessionId),
        eq(pomodoroSessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return { ok: false as const, error: "Session not found" };

  await db.transaction(async (tx) => {
    await tx
      .update(pomodoroSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        sessionNote: note ?? null,
      })
      .where(eq(pomodoroSessions.id, sessionId));

    if (session.taskId) {
      await tx
        .update(tasks)
        .set({
          completedPomodoros: sql`${tasks.completedPomodoros} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, session.taskId));
    }
  });

  revalidatePath("/");
  return { ok: true as const };
}

export async function interruptSessionAction(sessionId: string, reason?: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [session] = await db
    .select({ id: pomodoroSessions.id })
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, sessionId),
        eq(pomodoroSessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return { ok: false as const, error: "Session not found" };

  await db
    .update(pomodoroSessions)
    .set({
      status: "interrupted",
      interruptedAt: new Date(),
      interruptionNote: reason ?? null,
    })
    .where(eq(pomodoroSessions.id, sessionId));

  revalidatePath("/");
  return { ok: true as const };
}

export async function abandonSessionAction(sessionId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [session] = await db
    .select({ id: pomodoroSessions.id })
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, sessionId),
        eq(pomodoroSessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return { ok: false as const, error: "Session not found" };

  await db
    .update(pomodoroSessions)
    .set({ status: "abandoned" })
    .where(eq(pomodoroSessions.id, sessionId));

  revalidatePath("/");
  return { ok: true as const };
}

export async function updateEstimatedPomodorosAction(
  taskId: string,
  count: number
) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  if (count < 0) return { ok: false as const, error: "Count must be >= 0" };

  await db
    .update(tasks)
    .set({ estimatedPomodoros: count, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath("/");
  return { ok: true as const };
}

export async function getSessionStatsAction(range: "today" | "week" | "month") {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const now = new Date();
  let since: Date;

  if (range === "today") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    since = new Date(now.getFullYear(), now.getMonth(), diff);
  } else {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [rows, pomodoroStats] = await Promise.all([
    db
      .select({
        status: pomodoroSessions.status,
        sessionCount: count(),
        totalMinutes: sum(pomodoroSessions.workDurationMin),
      })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, user.id),
          gte(pomodoroSessions.startedAt, since)
        )
      )
      .groupBy(pomodoroSessions.status),
    getPomodoroStats(user.id),
  ]);

  const stats = {
    completed: 0,
    interrupted: 0,
    abandoned: 0,
    running: 0,
    totalMinutes: 0,
    streakDays: pomodoroStats.currentStreak,
    topTask: pomodoroStats.topTask,
  };

  for (const row of rows) {
    const n = Number(row.sessionCount);
    const mins = Number(row.totalMinutes ?? 0);
    if (row.status === "completed") {
      stats.completed = n;
      stats.totalMinutes += mins;
    } else if (row.status === "interrupted") {
      stats.interrupted = n;
    } else if (row.status === "abandoned") {
      stats.abandoned = n;
    } else if (row.status === "running") {
      stats.running = n;
    }
  }

  return { ok: true as const, range, stats };
}

export async function upsertPomodoroSettingsAction(formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const workDurationMin = Number(formData.get("workDurationMin")) || 25;
  const shortBreakMin = Number(formData.get("shortBreakMin")) || 5;
  const longBreakMin = Number(formData.get("longBreakMin")) || 20;
  const longBreakAfter = Number(formData.get("longBreakAfter")) || 4;
  const autoStartBreaks = formData.get("autoStartBreaks") === "true";
  const dailyGoal = Number(formData.get("dailyGoal")) || 8;

  await db
    .insert(pomodoroSettings)
    .values({
      userId: user.id,
      workDurationMin,
      shortBreakMin,
      longBreakMin,
      longBreakAfter,
      autoStartBreaks,
      dailyGoal,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pomodoroSettings.userId,
      set: {
        workDurationMin,
        shortBreakMin,
        longBreakMin,
        longBreakAfter,
        autoStartBreaks,
        dailyGoal,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  return { ok: true as const };
}

export type CreatePomodoroSessionInput = {
  taskId?: string;
  projectId: string;
  workDurationMin?: number;
};

export async function createPomodoroSession(
  input: CreatePomodoroSessionInput
): Promise<
  | { ok: true; sessionId: string }
  | { ok: false; error: string }
> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.projectId) return { ok: false, error: "Project is required" };

  const [created] = await db
    .insert(pomodoroSessions)
    .values({
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      userId: user.id,
      workDurationMin: input.workDurationMin ?? 25,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  revalidatePath("/");
  return { ok: true, sessionId: created.id };
}

export type UpdatePomodoroSessionInput = {
  sessionId: string;
  status?: "running" | "completed" | "interrupted" | "abandoned";
  sessionNote?: string;
  interruptionNote?: string;
};

export async function updatePomodoroSession(
  input: UpdatePomodoroSessionInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const [session] = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, input.sessionId),
        eq(pomodoroSessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session) return { ok: false, error: "Session not found" };

  const updateData: {
    status: string;
    completedAt?: Date;
    interruptedAt?: Date;
    interruptionNote?: string | null;
    sessionNote?: string | null;
  } = {
    status: input.status ?? session.status,
  };

  if (input.status === "completed") {
    updateData.completedAt = new Date();
  } else if (input.status === "interrupted") {
    updateData.interruptedAt = new Date();
    updateData.interruptionNote = input.interruptionNote ?? null;
  }

  if (input.sessionNote !== undefined) {
    updateData.sessionNote = input.sessionNote ?? null;
  }

  if (input.status === "completed" && session.taskId) {
    await db
      .update(tasks)
      .set({
        completedPomodoros: sql`${tasks.completedPomodoros} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, session.taskId));
  }

  await db
    .update(pomodoroSessions)
    .set(updateData)
    .where(eq(pomodoroSessions.id, input.sessionId));

  revalidatePath("/");
  return { ok: true };
}

export type GetPomodoroSessionsInput = {
  userId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
};

export async function getPomodoroSessions(
  input: GetPomodoroSessionsInput
): Promise<PomodoroSessionWithTask[]> {
  const user = await requireUser().catch(() => null);
  if (!user) return [];

  if (input.projectId) {
    return getSessionsByProject(input.projectId, input.limit);
  }

  if (input.startDate && input.endDate) {
    return getSessionsByDateRange(user.id, input.startDate, input.endDate);
  }

  return getSessionsByUser(user.id, input.limit);
}

export async function getPomodoroSettings(): Promise<
  | { ok: true; settings: Awaited<ReturnType<typeof getPomodoroSettingsByUserId>> }
  | { ok: false; error: string }
> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await getPomodoroSettingsByUserId(user.id);
  return { ok: true, settings };
}

export type UpdatePomodoroSettingsInput = {
  workDurationMin?: number;
  shortBreakMin?: number;
  longBreakMin?: number;
  longBreakAfter?: number;
  autoStartBreaks?: boolean;
  dailyGoal?: number;
};

export async function updatePomodoroSettings(
  input: UpdatePomodoroSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  await upsertPomodoroSettingsByUserId(user.id, input);

  revalidatePath("/settings");
  return { ok: true };
}

export async function getPomodoroStatsAction() {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const stats = await getPomodoroStats(user.id);
  return { ok: true, stats };
}

export type FocusRange = "7d" | "30d" | "90d" | "all";

function sinceFromRange(range: FocusRange): Date {
  const now = new Date();
  if (range === "7d")  return new Date(now.getTime() - 7  * 86400000);
  if (range === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  return new Date(0); // all time
}

export async function getFocusAnalyticsAction(range: FocusRange = "30d") {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const since = sinceFromRange(range);

  const [overview, projectBreakdown, taskBreakdown, heatmap, trend, recentSessions] =
    await Promise.all([
      getAnalyticsOverview(user.id, since),
      getProjectBreakdown(user.id, since),
      getTaskBreakdown(user.id, since),
      getDailyHeatmap(user.id, 84),
      getDailyTrend(user.id, 14),
      getRecentSessions(user.id, 15, since),
    ]);

  return {
    ok: true as const,
    range,
    overview,
    projectBreakdown,
    taskBreakdown,
    heatmap,
    trend,
    recentSessions,
  };
}

export async function getSessionsForDateAction(date: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const sessions = await getSessionsForDate(user.id, date);
  return { ok: true as const, sessions };
}
