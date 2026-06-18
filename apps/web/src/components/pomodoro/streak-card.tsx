"use client";

import { Flame, Trophy, Star, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DailyCount } from "@/lib/db/pomodoro";

const MILESTONES = [
  { days: 3,   label: "First Steps",    emoji: "🌱" },
  { days: 7,   label: "One Week",       emoji: "🔥" },
  { days: 14,  label: "Two Weeks",      emoji: "💪" },
  { days: 30,  label: "Monthly Master", emoji: "🏆" },
  { days: 60,  label: "Iron Focus",     emoji: "💎" },
  { days: 100, label: "Centurion",      emoji: "👑" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bestDay(heatmap: DailyCount[]): string | null {
  if (heatmap.length === 0) return null;
  const totals = new Array(7).fill(0);
  for (const { date, count } of heatmap) {
    const d = new Date(date + "T12:00:00");
    totals[d.getDay()] += count;
  }
  const max = Math.max(...totals);
  if (max === 0) return null;
  return DAY_LABELS[totals.indexOf(max)];
}

export type StreakData = {
  current: number;
  longest: number;
  heatmap: DailyCount[];
};

export function StreakCard({ data }: { data: StreakData }) {
  const { current, longest, heatmap } = data;
  const best = bestDay(heatmap);
  const achieved = MILESTONES.filter((m) => longest >= m.days);
  const next = MILESTONES.find((m) => longest < m.days);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-amber-400" />
          Focus Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Streak numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Flame className={cn("h-4 w-4", current > 0 ? "text-orange-400" : "text-muted-foreground")} />
              <span className={cn("text-2xl font-bold tabular-nums", current > 0 ? "text-foreground" : "text-muted-foreground")}>
                {current}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Current streak</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-2xl font-bold tabular-nums">{longest}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Longest streak</p>
          </div>
        </div>

        {/* Best day */}
        {best && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Most productive day: <span className="font-semibold text-foreground">{best}</span>
          </div>
        )}

        {/* Milestones */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Milestones
          </p>
          <div className="flex flex-wrap gap-2">
            {MILESTONES.map((m) => {
              const done = longest >= m.days;
              return (
                <div
                  key={m.days}
                  title={`${m.label} — ${m.days} days`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    done
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-border bg-muted/40 text-muted-foreground/40"
                  )}
                >
                  <span>{m.emoji}</span>
                  <span className="font-medium">{m.days}d</span>
                </div>
              );
            })}
          </div>
          {next && current > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {next.days - current} more day{next.days - current !== 1 ? "s" : ""} to unlock{" "}
              <span className="font-medium text-foreground">{next.emoji} {next.label}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
