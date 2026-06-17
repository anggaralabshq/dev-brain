"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPomodoroSession, updatePomodoroSession, getPomodoroStatsAction } from "@/lib/actions/pomodoro";

export const WORK_MS = 25 * 60 * 1000;
export const BREAK_MS = 5 * 60 * 1000;
const STORAGE_KEY = "devbrain_pomodoro_v1";

export type PomodoroStatus = "idle" | "running" | "paused" | "complete" | "break";

export type PomodoroState = {
  taskId: string | null;
  taskName: string | null;
  projectId: string | null;
  serverSessionId: string | null;
  sessionCount: number;
  estimatedSessions: number;
  status: PomodoroStatus;
  startedAt: number | null;
  remainingMs: number;
  todaySessions: number;
  dailyGoal: number;
  streakDays: number;
  lastActiveDate: string;
  topTaskId: string | null;
  topTaskName: string | null;
  topTaskCount: number;
};

export type CompleteSessionOpts = {
  note?: string;
  takeBreak?: boolean;
  continueTask?: boolean;
  markDone?: boolean;
};

type PomodoroCtx = {
  state: PomodoroState;
  startSession: (taskId: string, taskName: string, projectId: string, estimatedSessions?: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  abandonSession: () => void;
  completeSession: (opts?: CompleteSessionOpts) => void;
  completeEarly: () => void;
};

const defaultState: PomodoroState = {
  taskId: null,
  taskName: null,
  projectId: null,
  serverSessionId: null,
  sessionCount: 0,
  estimatedSessions: 4,
  status: "idle",
  startedAt: null,
  remainingMs: WORK_MS,
  todaySessions: 0,
  dailyGoal: 8,
  streakDays: 0,
  lastActiveDate: "",
  topTaskId: null,
  topTaskName: null,
  topTaskCount: 0,
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function loadState(): PomodoroState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as PomodoroState;
    // Account for elapsed time while page was closed
    if (parsed.status === "running" && parsed.startedAt) {
      const elapsed = Date.now() - parsed.startedAt;
      const remaining = parsed.remainingMs - elapsed;
      if (remaining <= 0) {
        return { ...parsed, status: "complete", remainingMs: 0, startedAt: null };
      }
      return { ...parsed, remainingMs: remaining, startedAt: Date.now() };
    }
    if (parsed.status === "break" && parsed.startedAt) {
      const elapsed = Date.now() - parsed.startedAt;
      const remaining = parsed.remainingMs - elapsed;
      if (remaining <= 0) {
        return { ...parsed, status: "idle", remainingMs: WORK_MS, startedAt: null };
      }
      return { ...parsed, remainingMs: remaining, startedAt: Date.now() };
    }
    return parsed;
  } catch {
    return defaultState;
  }
}

function saveState(s: PomodoroState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

const PomodoroContext = createContext<PomodoroCtx | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(defaultState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loaded = loadState();
    const today = todayStr();
    if (loaded.lastActiveDate && loaded.lastActiveDate !== today) {
      setState({ ...loaded, todaySessions: 0 });
    } else {
      setState(loaded);
    }

    async function loadStats() {
      const result = await getPomodoroStatsAction();
      if (result.ok && result.stats) {
        const { todayCount, currentStreak, topTask } = result.stats;
        setState(prev => ({
          ...prev,
          todaySessions: todayCount,
          streakDays: currentStreak,
          topTaskId: topTask?.id ?? null,
          topTaskName: topTask?.title ?? null,
          topTaskCount: topTask?.sessionCount ?? 0,
        }));
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const shouldTick = state.status === "running" || state.status === "break";
    if (!shouldTick) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const next = prev.remainingMs - 1000;
        if (next <= 0) {
          if (prev.status === "running") {
            return { ...prev, remainingMs: 0, status: "complete", startedAt: null };
          }
          // break finished
          return { ...prev, remainingMs: WORK_MS, status: "idle", startedAt: null };
        }
        return { ...prev, remainingMs: next };
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.status]);

  const startSession = useCallback(async (taskId: string, taskName: string, projectId: string, estimatedSessions = 4) => {
    const durationMin = Math.round(WORK_MS / 60000);
    const result = await createPomodoroSession({ taskId, projectId, workDurationMin: durationMin });

    let serverSessionId: string | null = null;
    if (result.ok && result.sessionId) {
      serverSessionId = result.sessionId;
    }

    setState(prev => ({
      ...prev,
      taskId,
      taskName,
      projectId,
      serverSessionId,
      estimatedSessions,
      sessionCount: prev.taskId === taskId ? prev.sessionCount : 0,
      status: "running",
      startedAt: Date.now(),
      remainingMs: WORK_MS,
    }));
  }, []);

  const pauseSession = useCallback(() => {
    setState(prev => {
      if (prev.status !== "running") return prev;
      return { ...prev, status: "paused", startedAt: null };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setState(prev => {
      if (prev.status !== "paused") return prev;
      return { ...prev, status: "running", startedAt: Date.now() };
    });
  }, []);

  const abandonSession = useCallback(async () => {
    const sessionId = state.serverSessionId;
    if (sessionId) {
      await updatePomodoroSession({ sessionId, status: "abandoned" });
    }
    setState(prev => ({
      ...defaultState,
      todaySessions: prev.todaySessions,
      dailyGoal: prev.dailyGoal,
      streakDays: prev.streakDays,
      lastActiveDate: prev.lastActiveDate,
      topTaskId: prev.topTaskId,
      topTaskName: prev.topTaskName,
      topTaskCount: prev.topTaskCount,
    }));
  }, [state.serverSessionId]);

  const completeSession = useCallback(async (opts?: CompleteSessionOpts) => {
    const sessionId = state.serverSessionId;
    if (sessionId) {
      await updatePomodoroSession({
        sessionId,
        status: "completed",
        sessionNote: opts?.note,
      });
    }

    setState(prev => {
      if (prev.status !== "complete" && prev.status !== "running") return prev;

      const today = todayStr();
      const newSessionCount = prev.sessionCount + 1;
      const todaySessions = prev.todaySessions + 1;

      let streakDays = prev.streakDays;
      if (prev.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        streakDays = prev.lastActiveDate === yesterday ? streakDays + 1 : 1;
      }

      let topTaskId = prev.topTaskId;
      let topTaskName = prev.topTaskName;
      let topTaskCount = prev.topTaskCount;
      if (prev.taskId && newSessionCount > topTaskCount) {
        topTaskId = prev.taskId;
        topTaskName = prev.taskName;
        topTaskCount = newSessionCount;
      }

      const base: PomodoroState = {
        ...prev,
        sessionCount: newSessionCount,
        todaySessions,
        streakDays,
        lastActiveDate: today,
        topTaskId,
        topTaskName,
        topTaskCount,
        startedAt: null,
        serverSessionId: null,
      };

      if (opts?.takeBreak) {
        return { ...base, status: "break", remainingMs: BREAK_MS, startedAt: Date.now() };
      }
      if (opts?.continueTask) {
        return { ...base, status: "running", remainingMs: WORK_MS, startedAt: Date.now() };
      }
      // skipBreak / markDone / default → idle
      return {
        ...base,
        status: "idle",
        remainingMs: WORK_MS,
        taskId: opts?.markDone ? null : prev.taskId,
        taskName: opts?.markDone ? null : prev.taskName,
        projectId: opts?.markDone ? null : prev.projectId,
      };
    });
  }, [state.serverSessionId]);

  const completeEarly = useCallback(() => {
    setState(prev => {
      if (prev.status !== "running" && prev.status !== "paused") return prev;
      return { ...prev, status: "complete", remainingMs: 0, startedAt: null };
    });
  }, []);

  return (
    <PomodoroContext.Provider value={{ state, startSession, pauseSession, resumeSession, abandonSession, completeSession, completeEarly }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}
