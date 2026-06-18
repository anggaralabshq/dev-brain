"use client";

import { useTransition } from "react";
import { Play, Clock, Target, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePomodoro } from "@/contexts/pomodoro-context";
import type { TodayTask } from "@/lib/actions/pomodoro";

function fmtMin(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function GoalBar({ completed, goal }: { completed: number; goal: number }) {
  const pct = Math.min((completed / goal) * 100, 100);
  const done = completed >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Target className="h-3.5 w-3.5 text-primary" />
          Daily Goal
        </span>
        <span className={cn("font-semibold tabular-nums", done ? "text-emerald-400" : "text-muted-foreground")}>
          {completed} / {goal} pomodoros {done && "🎉"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", done ? "bg-emerald-400" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TodayTask }) {
  const { state, startSession } = usePomodoro();
  const [, startTransition] = useTransition();
  const isActive = state.taskId === task.taskId && (state.status === "running" || state.status === "paused");

  const handleContinue = () => {
    if (!task.taskId) return;
    startTransition(() => {
      startSession(task.taskId!, task.taskTitle ?? "Untitled", task.projectId, 4);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
      {/* pomodoro dots */}
      <div className="flex gap-0.5 shrink-0">
        {Array.from({ length: Math.min(task.completedCount, 8) }).map((_, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-primary/70" />
        ))}
        {task.completedCount === 0 && (
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug truncate">
          {task.taskTitle ?? "(no task)"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {task.projectName ?? "Unknown project"}
          {task.totalMin > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {fmtMin(task.totalMin)}
            </span>
          )}
        </p>
      </div>

      {/* session count badge */}
      <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
        {task.sessionCount}× 🍅
      </span>

      {/* continue button — only if has taskId */}
      {task.taskId && (
        <button
          onClick={handleContinue}
          disabled={isActive}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium flex items-center gap-1 transition-colors",
            isActive
              ? "bg-primary/10 text-primary cursor-default"
              : "opacity-0 group-hover:opacity-100 bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Play className="h-2.5 w-2.5" />
          {isActive ? "Active" : "Continue"}
        </button>
      )}
    </div>
  );
}

export type TodayPanelData = {
  todayTasks: TodayTask[];
  dailyGoal: number;
  completedToday: number;
};

export function TodayPanel({ data }: { data: TodayPanelData }) {
  const { completedToday, dailyGoal, todayTasks } = data;
  const totalMin = todayTasks.reduce((s, t) => s + t.totalMin, 0);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            Today
          </span>
          {totalMin > 0 && (
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtMin(totalMin)} focused
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <GoalBar completed={completedToday} goal={dailyGoal} />

        {todayTasks.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            No focus sessions yet today — start one from the task board
          </p>
        ) : (
          <div className="space-y-0.5">
            {todayTasks.map((t, i) => (
              <TaskRow key={t.taskId ?? i} task={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
