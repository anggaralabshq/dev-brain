"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, AlertCircle, Timer, Flame, BarChart2, Clock, Target, Activity, FolderKanban, ListTodo, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFocusAnalyticsAction, getSessionsForDateAction, type FocusRange } from "@/lib/actions/pomodoro";
import { EmptyState } from "@/components/empty-state";

type AnalyticsData = Awaited<ReturnType<typeof getFocusAnalyticsAction>>;

const RANGES: { value: FocusRange; label: string }[] = [
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const STATUS_CONFIG = {
  completed:   { label: "Completed",   icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500" },
  interrupted: { label: "Interrupted", icon: AlertCircle,  color: "text-amber-400",   bg: "bg-amber-500" },
  abandoned:   { label: "Abandoned",   icon: XCircle,      color: "text-red-400",     bg: "bg-red-500" },
};

// ── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({
  data,
  onDayClick,
  selectedDate,
}: {
  data: { date: string; count: number }[];
  onDayClick?: (date: string) => void;
  selectedDate?: string | null;
}) {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Use UTC dates to match PostgreSQL's to_char(startedAt, 'YYYY-MM-DD') output
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDay = new Date(today);
  startDay.setUTCDate(today.getUTCDate() - 83);
  startDay.setUTCDate(startDay.getUTCDate() - startDay.getUTCDay()); // align to Sunday

  const weeks: Date[][] = [];
  let cur = new Date(startDay);
  while (cur <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function utcDateKey(d: Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function intensity(count: number) {
    if (count === 0) return "bg-muted/40";
    const pct = count / maxCount;
    if (pct <= 0.25) return "bg-emerald-900/80";
    if (pct <= 0.5)  return "bg-emerald-700/80";
    if (pct <= 0.75) return "bg-emerald-500/90";
    return "bg-emerald-400";
  }

  return (
    <div className="space-y-1.5">
      {/* Month labels */}
      <div className="flex gap-px pl-6">
        {weeks.map((week, wi) => {
          const first = week[0];
          const showMonth = first.getUTCDate() <= 7;
          return (
            <div key={wi} className="w-3 shrink-0 text-[8px] text-muted-foreground">
              {showMonth ? MONTHS[first.getUTCMonth()] : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-px">
        {/* Day labels */}
        <div className="flex flex-col gap-px mr-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => (
            <div key={day} className={cn("h-3 text-[8px] text-muted-foreground leading-3", i % 2 === 0 ? "opacity-0" : "")}>
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-px">
            {week.map((day, di) => {
              const key = utcDateKey(day);
              const count = map.get(key) ?? 0;
              const isFuture = day > today;
              const isSelected = key === selectedDate;
              return (
                <div
                  key={di}
                  title={`${key}: ${count} session${count !== 1 ? "s" : ""}`}
                  onClick={() => !isFuture && onDayClick?.(key)}
                  className={cn(
                    "h-3 w-3 rounded-sm transition-all",
                    isFuture ? "opacity-0" : intensity(count),
                    !isFuture && onDayClick && "cursor-pointer hover:ring-1 hover:ring-primary/60",
                    isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 justify-end">
        <span className="text-[9px] text-muted-foreground">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} className={cn("h-2.5 w-2.5 rounded-sm", intensity(Math.round(v * maxCount)))} />
        ))}
        <span className="text-[9px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}

// ── Bar chart (trend) ────────────────────────────────────────────────────────

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        const day = new Date(d.date + "T12:00:00");
        const label = d.date === new Date().toISOString().split("T")[0]
          ? "Today"
          : DAY[day.getDay()];
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] text-muted-foreground">{d.count > 0 ? d.count : ""}</span>
            <div className="w-full flex flex-col justify-end" style={{ height: "64px" }}>
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all",
                  d.count > 0 ? "bg-primary/70" : "bg-muted/30"
                )}
                style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground truncate w-full text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Project bar ──────────────────────────────────────────────────────────────

function ProjectBar({
  project,
  maxSessions,
}: {
  project: { projectName: string; projectColor: string; totalSessions: number; completedSessions: number; totalMinutes: number; completionRate: number };
  maxSessions: number;
}) {
  const widthPct = maxSessions > 0 ? (project.totalSessions / maxSessions) * 100 : 0;
  const hours = Math.floor(project.totalMinutes / 60);
  const mins = project.totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", project.projectColor)} />
          <span className="text-xs font-medium truncate">{project.projectName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
          <span>{timeStr}</span>
          <span className={cn(
            "font-medium",
            project.completionRate >= 80 ? "text-emerald-400" :
            project.completionRate >= 50 ? "text-amber-400" : "text-red-400"
          )}>{project.completionRate}%</span>
          <span>{project.totalSessions} 🍅</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-all"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

// ── Session log ──────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: { id: string; status: string; startedAt: Date | string; workDurationMin: number; taskTitle?: string | null; [key: string]: unknown } }) {
  const cfg = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG];
  const Icon = cfg?.icon ?? Timer;
  const start = new Date(session.startedAt);
  const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg?.color ?? "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {session.taskTitle ?? (session as { projectName?: string }).projectName ?? "—"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {dateStr} · {timeStr}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium">{session.workDurationMin}m</p>
        <p className={cn("text-[10px]", cfg?.color ?? "text-muted-foreground")}>
          {cfg?.label ?? session.status}
        </p>
      </div>
    </div>
  );
}

// ── Daily task list ──────────────────────────────────────────────────────────

type DailySession = { id: string; status: string; startedAt: Date | string; workDurationMin: number; taskTitle?: string | null; [key: string]: unknown };

function DailyTaskList({
  date,
  sessions,
  isLoading,
  onClose,
}: {
  date: string;
  sessions: DailySession[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const totalMinutes = sessions.reduce((acc, s) => acc + s.workDurationMin, 0);
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const dateLabel = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold">{dateLabel}</p>
          {!isLoading && sessions.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {completedCount} completed · {timeStr} focus
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground text-center py-4">Loading…</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Timer} title="No sessions" description="No focus sessions recorded on this day." size="inline" />
      ) : (
        <div>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────

function FocusCalendar({
  activityMap,
  onDayClick,
  selectedDate,
}: {
  activityMap: Map<string, number>;
  onDayClick: (date: string) => void;
  selectedDate?: string | null;
}) {
  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  const [viewYear, setViewYear] = useState(now.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth());

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1));
  const startOffset = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function dotColor(count: number) {
    if (count === 0) return "";
    if (count <= 1) return "bg-emerald-900";
    if (count <= 3) return "bg-emerald-700";
    if (count <= 5) return "bg-emerald-500";
    return "bg-emerald-400";
  }

  const isCurrentMonth = viewYear === now.getUTCFullYear() && viewMonth === now.getUTCMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={cn("rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground", isCurrentMonth && "opacity-30 cursor-not-allowed")}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = dateKey(day);
          const count = activityMap.get(key) ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const isFuture = key > todayKey;

          return (
            <button
              key={i}
              type="button"
              disabled={isFuture}
              onClick={() => !isFuture && onDayClick(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors",
                isFuture ? "opacity-25 cursor-not-allowed" : "hover:bg-accent cursor-pointer",
                isToday && !isSelected && "ring-1 ring-inset ring-primary/40",
                isSelected && "bg-primary/20 ring-1 ring-inset ring-primary"
              )}
            >
              <span className={cn(
                "text-xs font-medium tabular-nums leading-none",
                isToday && "text-primary",
                isSelected && "text-primary font-semibold"
              )}>
                {day}
              </span>
              <div className={cn("h-1 w-1 rounded-full", count > 0 ? dotColor(count) : "opacity-0")}>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function FocusAnalytics({ initialData }: { initialData: AnalyticsData }) {
  const [data, setData] = useState(initialData);
  const [range, setRange] = useState<FocusRange>("30d");
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailySessions, setDailySessions] = useState<DailySession[]>([]);
  const [isDailyPending, startDailyTransition] = useTransition();

  function changeRange(r: FocusRange) {
    setRange(r);
    startTransition(async () => {
      const next = await getFocusAnalyticsAction(r);
      setData(next);
    });
  }

  function handleDayClick(date: string) {
    if (selectedDate === date) {
      setSelectedDate(null);
      setDailySessions([]);
      return;
    }
    setSelectedDate(date);
    startDailyTransition(async () => {
      const result = await getSessionsForDateAction(date);
      if (result.ok) setDailySessions(result.sessions as DailySession[]);
    });
  }

  if (!data.ok) {
    return (
      <EmptyState
        icon={Timer}
        title="No focus data yet"
        description="Start your first Pomodoro session to see analytics here. Sessions automatically link to projects and tasks."
        size="page"
      />
    );
  }

  const { overview, projectBreakdown, taskBreakdown, heatmap, trend, recentSessions } = data;
  const maxProjectSessions = Math.max(...projectBreakdown.map((p) => p.totalSessions), 1);
  const totalHours = Math.floor(overview.totalMinutes / 60);
  const totalMins = overview.totalMinutes % 60;

  return (
    <div className={cn("space-y-5 transition-opacity", isPending && "opacity-60")}>
      {/* Range filter */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1 w-fit">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => changeRange(r.value)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              range === r.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Sessions",     value: String(overview.totalSessions),    icon: Timer,        color: "text-violet-400" },
          { label: "Focus Time",   value: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`, icon: Clock, color: "text-blue-400" },
          { label: "Completed",    value: String(overview.completedSessions), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Completion",   value: `${overview.completionRate}%`,       icon: Target,       color: overview.completionRate >= 80 ? "text-emerald-400" : overview.completionRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Daily Avg",    value: String(overview.avgSessionsPerDay),  icon: BarChart2,    color: "text-pink-400" },
          { label: "Active Days",  value: String(overview.activeDays),         icon: Flame,        color: "text-orange-400" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-1.5">
              <s.icon className={cn("h-3.5 w-3.5", s.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
            <div className="mt-1.5 text-2xl font-semibold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Heatmap + Trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-3">
          <p className="mb-3 text-xs font-semibold">Activity Heatmap · last 12 weeks</p>
          {heatmap.length > 0
            ? <Heatmap data={heatmap} onDayClick={handleDayClick} selectedDate={selectedDate} />
            : <EmptyState icon={Activity} title="No activity yet" description="Complete focus sessions to build your heatmap." size="inline" />
          }
        </Card>

        <Card className="p-4 lg:col-span-2">
          <p className="mb-3 text-xs font-semibold">Daily Trend · last 14 days</p>
          {trend.length > 0
            ? <TrendChart data={trend} />
            : <EmptyState icon={BarChart2} title="No trend data" description="Sessions will appear here day by day." size="inline" />
          }
        </Card>
      </div>

      {/* Calendar + Daily task list */}
      {(() => {
        const activityMap = new Map(heatmap.map((d) => [d.date, d.count]));
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="p-4 lg:col-span-2">
              <div className="flex items-center gap-1.5 mb-4">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold">Activity Calendar</p>
              </div>
              <FocusCalendar
                activityMap={activityMap}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
              />
            </Card>

            <div className="lg:col-span-3">
              {selectedDate ? (
                <DailyTaskList
                  date={selectedDate}
                  sessions={dailySessions}
                  isLoading={isDailyPending}
                  onClose={() => { setSelectedDate(null); setDailySessions([]); }}
                />
              ) : (
                <Card className="p-4 h-full flex items-center justify-center">
                  <div className="text-center space-y-1.5">
                    <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">Click a day to see sessions</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        );
      })()}

      {/* Project breakdown + Task breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-4 text-xs font-semibold">Project Distribution</p>
          {projectBreakdown.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No project sessions" description="Link sessions to projects to see distribution." size="inline" />
          ) : (
            <div className="space-y-3">
              {projectBreakdown.map((p) => (
                <ProjectBar key={p.projectId} project={p} maxSessions={maxProjectSessions} />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-4 text-xs font-semibold">Top Tasks by Focus Time</p>
          {taskBreakdown.length === 0 ? (
            <EmptyState icon={ListTodo} title="No task sessions" description="Link sessions to tasks to track focus per task." size="inline" />
          ) : (
            <div className="space-y-2">
              {taskBreakdown.map((t, i) => {
                const hours = Math.floor(t.totalMinutes / 60);
                const mins = t.totalMinutes % 60;
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                const completionRate = t.totalSessions > 0
                  ? Math.round((t.completedSessions / t.totalSessions) * 100)
                  : 0;
                return (
                  <div key={t.taskId} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-right shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.taskTitle}</p>
                      <p className="text-[10px] text-muted-foreground">{t.projectName}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <p className="text-xs font-medium">{t.totalSessions} 🍅 · {timeStr}</p>
                      <p className={cn(
                        "text-[10px]",
                        completionRate >= 80 ? "text-emerald-400" :
                        completionRate >= 50 ? "text-amber-400" : "text-muted-foreground"
                      )}>{completionRate}% done</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent sessions */}
      <Card className="p-4">
        <p className="mb-3 text-xs font-semibold">Recent Sessions</p>
        {recentSessions.length === 0 ? (
          <EmptyState icon={Timer} title="No sessions yet" description="Completed Pomodoro sessions will appear here." size="inline" />
        ) : (
          <div>
            {recentSessions.map((s) => (
              <SessionRow key={s.id} session={s as Parameters<typeof SessionRow>[0]["session"]} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
