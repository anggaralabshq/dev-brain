/**
 * Server-side data access for pomodoro sessions and settings.
 * All functions run server-side only (use in Server Components, Route Handlers, Server Actions).
 */
import "server-only";
import { db } from "@devbrain/db";
import { pomodoroSessions, pomodoroSettings, tasks } from "@devbrain/db/schema";
import { eq, and, gte, lte, desc, count, sql, isNull } from "drizzle-orm";

export type PomodoroSessionWithTask = {
  id: string;
  taskId: string | null;
  projectId: string;
  userId: string;
  workDurationMin: number;
  status: "running" | "completed" | "interrupted" | "abandoned";
  startedAt: Date;
  completedAt: Date | null;
  interruptedAt: Date | null;
  interruptionNote: string | null;
  sessionNote: string | null;
  createdAt: Date;
  taskTitle?: string | null;
};

export type PomodoroStats = {
  todayCount: number;
  weekCount: number;
  currentStreak: number;
  longestStreak: number;
  topTask: { id: string; title: string; sessionCount: number } | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export async function getSessionsByUser(
  userId: string,
  limit = 50
): Promise<PomodoroSessionWithTask[]> {
  const rows = await db
    .select({
      id: pomodoroSessions.id,
      taskId: pomodoroSessions.taskId,
      projectId: pomodoroSessions.projectId,
      userId: pomodoroSessions.userId,
      workDurationMin: pomodoroSessions.workDurationMin,
      status: pomodoroSessions.status,
      startedAt: pomodoroSessions.startedAt,
      completedAt: pomodoroSessions.completedAt,
      interruptedAt: pomodoroSessions.interruptedAt,
      interruptionNote: pomodoroSessions.interruptionNote,
      sessionNote: pomodoroSessions.sessionNote,
      createdAt: pomodoroSessions.createdAt,
      taskTitle: tasks.title,
    })
    .from(pomodoroSessions)
    .leftJoin(tasks, eq(tasks.id, pomodoroSessions.taskId))
    .where(eq(pomodoroSessions.userId, userId))
    .orderBy(desc(pomodoroSessions.startedAt))
    .limit(limit);

  return rows as PomodoroSessionWithTask[];
}

export async function getSessionsByProject(
  projectId: string,
  limit = 50
): Promise<PomodoroSessionWithTask[]> {
  const rows = await db
    .select({
      id: pomodoroSessions.id,
      taskId: pomodoroSessions.taskId,
      projectId: pomodoroSessions.projectId,
      userId: pomodoroSessions.userId,
      workDurationMin: pomodoroSessions.workDurationMin,
      status: pomodoroSessions.status,
      startedAt: pomodoroSessions.startedAt,
      completedAt: pomodoroSessions.completedAt,
      interruptedAt: pomodoroSessions.interruptedAt,
      interruptionNote: pomodoroSessions.interruptionNote,
      sessionNote: pomodoroSessions.sessionNote,
      createdAt: pomodoroSessions.createdAt,
      taskTitle: tasks.title,
    })
    .from(pomodoroSessions)
    .leftJoin(tasks, eq(tasks.id, pomodoroSessions.taskId))
    .where(eq(pomodoroSessions.projectId, projectId))
    .orderBy(desc(pomodoroSessions.startedAt))
    .limit(limit);

  return rows as PomodoroSessionWithTask[];
}

export async function getSessionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PomodoroSessionWithTask[]> {
  const rows = await db
    .select({
      id: pomodoroSessions.id,
      taskId: pomodoroSessions.taskId,
      projectId: pomodoroSessions.projectId,
      userId: pomodoroSessions.userId,
      workDurationMin: pomodoroSessions.workDurationMin,
      status: pomodoroSessions.status,
      startedAt: pomodoroSessions.startedAt,
      completedAt: pomodoroSessions.completedAt,
      interruptedAt: pomodoroSessions.interruptedAt,
      interruptionNote: pomodoroSessions.interruptionNote,
      sessionNote: pomodoroSessions.sessionNote,
      createdAt: pomodoroSessions.createdAt,
      taskTitle: tasks.title,
    })
    .from(pomodoroSessions)
    .leftJoin(tasks, eq(tasks.id, pomodoroSessions.taskId))
    .where(
      and(
        eq(pomodoroSessions.userId, userId),
        gte(pomodoroSessions.startedAt, startDate),
        lte(pomodoroSessions.startedAt, endDate)
      )
    )
    .orderBy(desc(pomodoroSessions.startedAt));

  return rows as PomodoroSessionWithTask[];
}

export async function getPomodoroSettingsByUserId(userId: string) {
  const [settings] = await db
    .select()
    .from(pomodoroSettings)
    .where(eq(pomodoroSettings.userId, userId))
    .limit(1);

  return settings ?? null;
}

export async function upsertPomodoroSettingsByUserId(
  userId: string,
  data: {
    workDurationMin?: number;
    shortBreakMin?: number;
    longBreakMin?: number;
    longBreakAfter?: number;
    autoStartBreaks?: boolean;
    dailyGoal?: number;
  }
) {
  const [result] = await db
    .insert(pomodoroSettings)
    .values({
      userId,
      workDurationMin: data.workDurationMin ?? 25,
      shortBreakMin: data.shortBreakMin ?? 5,
      longBreakMin: data.longBreakMin ?? 20,
      longBreakAfter: data.longBreakAfter ?? 4,
      autoStartBreaks: data.autoStartBreaks ?? false,
      dailyGoal: data.dailyGoal ?? 8,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pomodoroSettings.userId,
      set: {
        workDurationMin: data.workDurationMin ?? 25,
        shortBreakMin: data.shortBreakMin ?? 5,
        longBreakMin: data.longBreakMin ?? 20,
        longBreakAfter: data.longBreakAfter ?? 4,
        autoStartBreaks: data.autoStartBreaks ?? false,
        dailyGoal: data.dailyGoal ?? 8,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

export async function getPomodoroStats(userId: string): Promise<PomodoroStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);

  const [todayRows, weekRows, streakRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, userId),
          eq(pomodoroSessions.status, "completed"),
          gte(pomodoroSessions.startedAt, todayStart)
        )
      ),
    db
      .select({ n: count() })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, userId),
          eq(pomodoroSessions.status, "completed"),
          gte(pomodoroSessions.startedAt, weekStart)
        )
      ),
    db
      .select({
        startedAt: pomodoroSessions.startedAt,
      })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, userId),
          eq(pomodoroSessions.status, "completed")
        )
      )
      .orderBy(desc(pomodoroSessions.startedAt)),
  ]);

  const todayCount = todayRows[0]?.n ?? 0;
  const weekCount = weekRows[0]?.n ?? 0;

  const streak = calculateStreak(streakRows.map((r) => r.startedAt));
  const topTask = await getTopTaskForUser(userId);

  return {
    todayCount,
    weekCount,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    topTask,
  };
}

async function getTopTaskForUser(
  userId: string
): Promise<{ id: string; title: string; sessionCount: number } | null> {
  const [row] = await db
    .select({
      taskId: pomodoroSessions.taskId,
      taskTitle: tasks.title,
      sessionCount: count(),
    })
    .from(pomodoroSessions)
    .leftJoin(tasks, eq(tasks.id, pomodoroSessions.taskId))
    .where(
      and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.status, "completed"),
        isNull(pomodoroSessions.taskId)
      )
    )
    .groupBy(pomodoroSessions.taskId, tasks.title)
    .orderBy(desc(count()))
    .limit(1);

  if (!row || !row.taskId || !row.taskTitle) return null;

  return {
    id: row.taskId,
    title: row.taskTitle,
    sessionCount: row.sessionCount,
  };
}

function calculateStreak(completedDates: Date[]): {
  current: number;
  longest: number;
} {
  if (completedDates.length === 0) return { current: 0, longest: 0 };

  const uniqueDays = new Set<string>();
  for (const d of completedDates) {
    const day = startOfDay(d).toISOString().split("T")[0];
    uniqueDays.add(day);
  }

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  const today = startOfDay(new Date()).toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  let current = 0;
  let longest = 0;
  let streak = 0;
  let prev: Date | null = null;

  if (sortedDays[0] === today || sortedDays[0] === yesterday) {
    for (const dayStr of sortedDays) {
      const day = new Date(dayStr);
      if (!prev) {
        streak = 1;
      } else {
        const diff = (prev.getTime() - day.getTime()) / 86400000;
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      prev = day;
    }
    current = streak;
  }

  streak = 0;
  prev = null;
  for (const dayStr of sortedDays) {
    const day = new Date(dayStr);
    if (!prev) {
      streak = 1;
    } else {
      const diff = (prev.getTime() - day.getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    longest = Math.max(longest, streak);
    prev = day;
  }

  return { current, longest };
}

export async function getTodaySessionCount(userId: string): Promise<number> {
  const todayStart = startOfDay(new Date());
  const [row] = await db
    .select({ n: count() })
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.status, "completed"),
        gte(pomodoroSessions.startedAt, todayStart)
      )
    );

  return row?.n ?? 0;
}
