"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pause, Play, X, Minimize2, Maximize2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePomodoro, WORK_MS, BREAK_MS } from "@/contexts/pomodoro-context";

function formatMs(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer() {
  const { state, pauseSession, resumeSession, abandonSession, completeEarly } = usePomodoro();
  const [minimized, setMinimized] = useState(false);
  const [abandonConfirmOpen, setAbandonConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  const visible = state.status === "running" || state.status === "paused" || state.status === "break";
  if (!visible) return null;

  const isBreak = state.status === "break";
  const isPaused = state.status === "paused";
  const totalMs = isBreak ? BREAK_MS : WORK_MS;
  const progress = 1 - state.remainingMs / totalMs;
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - progress);

  if (minimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-xl transition-all hover:border-primary/50"
        onClick={() => setMinimized(false)}
      >
        <span className="text-sm">🍅</span>
        <span className={cn("text-sm font-mono font-semibold tabular-nums", isBreak ? "text-emerald-400" : "text-primary")}>
          {formatMs(state.remainingMs)}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Expand timer"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-64 rounded-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{isBreak ? "☕" : "🍅"}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {isBreak ? "Break time" : "Focus session"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Minimize"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          {!isBreak && (
            <button
              type="button"
              onClick={() => setAbandonConfirmOpen(true)}
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              aria-label="Abandon session"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center gap-3 px-4 py-4">
        {/* Circular progress + timer */}
        <div className="relative flex items-center justify-center">
          <svg width="80" height="80" className="-rotate-90">
            <circle
              cx="40" cy="40" r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <circle
              cx="40" cy="40" r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={cn("transition-[stroke-dashoffset]", isBreak ? "text-emerald-400" : "text-primary")}
            />
          </svg>
          <span className={cn(
            "absolute text-lg font-mono font-bold tabular-nums",
            isBreak ? "text-emerald-400" : "text-foreground"
          )}>
            {formatMs(state.remainingMs)}
          </span>
        </div>

        {/* Task info */}
        {state.taskName && (
          <div className="w-full text-center">
            <p className="truncate text-xs font-medium">{state.taskName}</p>
            {!isBreak && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Session {state.sessionCount + 1}/{state.estimatedSessions}
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        {!isBreak && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={isPaused ? resumeSession : pauseSession}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                "border border-border hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              )}
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setCompleteConfirmOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                "border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          </div>
        )}

        {isBreak && (
          <p className="text-[10px] text-muted-foreground text-center">
            Next session starts automatically
          </p>
        )}
      </div>

      {/* Session dots */}
      {!isBreak && (
        <div className="flex items-center justify-center gap-1 border-t border-border px-4 py-2">
          {Array.from({ length: state.estimatedSessions }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i < state.sessionCount ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={abandonConfirmOpen}
        onOpenChange={setAbandonConfirmOpen}
        title="Abandon session?"
        description="Your current focus session will be marked as abandoned."
        confirmLabel="Abandon"
        onConfirm={abandonSession}
      />
      <ConfirmDialog
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        title="Complete session early?"
        description="Session will be marked as completed and you can choose what to do next."
        confirmLabel="Complete"
        variant="default"
        onConfirm={completeEarly}
      />
    </div>
  );
}
