"use client";

import { useEffect, useState } from "react";
import { Flame, Target, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPomodoroStatsAction } from "@/lib/actions/pomodoro";

type StatsData = {
  todayCount: number;
  weekCount: number;
  currentStreak: number;
  longestStreak: number;
  topTask: { id: string; title: string; sessionCount: number } | null;
} | null;

export function FocusStatsWidget() {
  const [stats, setStats] = useState<StatsData>(null);
  const [mounted, setMounted] = useState(false);
  const dailyGoal = 8;

  useEffect(() => {
    setMounted(true);
    async function load() {
      const result = await getPomodoroStatsAction();
      if (result.ok && result.stats) {
        setStats(result.stats);
      }
    }
    load();
  }, []);

  if (!mounted || !stats) return null;

  const { todayCount, currentStreak, topTask } = stats;
  const pct = Math.min(100, Math.round((todayCount / dailyGoal) * 100));

  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-base">🍅</span>
          Focus Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* Progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {todayCount} / {dailyGoal} sessions
            </span>
            <span className="text-[11px] font-semibold text-primary">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-2">
            <Flame className={`h-3.5 w-3.5 ${currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
            <div>
              <p className="text-[11px] text-muted-foreground">Streak</p>
              <p className="text-sm font-bold leading-none">{currentStreak}d</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">Goal</p>
              <p className="text-sm font-bold leading-none">{dailyGoal} sess.</p>
            </div>
          </div>
        </div>

        {/* Top task */}
        {topTask && topTask.sessionCount > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-2">
            <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Top task</p>
              <p className="truncate text-xs font-medium">{topTask.title}</p>
              <p className="text-[10px] text-muted-foreground">{topTask.sessionCount} sessions</p>
            </div>
          </div>
        )}

        {todayCount === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            No sessions yet today. Start focusing!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
