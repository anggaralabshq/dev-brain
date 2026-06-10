"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MeetingDialog } from "./meeting-dialog";
import type { MeetingWithMeta } from "@/lib/db/meetings";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLOR: Record<string, string> = {
  scheduled:   "bg-blue-500/80",
  in_progress: "bg-amber-500/80",
  completed:   "bg-emerald-500/80",
  cancelled:   "bg-muted/60 line-through opacity-60",
};

const STATUS_BADGE: Record<string, "info" | "warning" | "success" | "muted"> = {
  scheduled:   "info",
  in_progress: "warning",
  completed:   "success",
  cancelled:   "muted",
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "am" : "pm";
  return `${h}:${m}${ampm}`;
}

function buildCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // pad from Sunday
  for (let i = 0; i < first.getDay(); i++) {
    days.push(new Date(year, month, 1 - (first.getDay() - i)));
  }
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  // pad to complete last row
  const remainder = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainder; i++) days.push(new Date(year, month + 1, i));
  return days;
}

export function MeetingsCalendar({
  projectId,
  initialMeetings,
}: {
  projectId: string;
  initialMeetings: MeetingWithMeta[];
}) {
  const today = new Date();
  const [curYear, setCurYear]       = useState(today.getFullYear());
  const [curMonth, setCurMonth]     = useState(today.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeMeeting, setActiveMeeting] = useState<MeetingWithMeta | null>(null);

  const days = buildCalendarDays(curYear, curMonth);

  const meetings = initialMeetings.map((m) => ({
    ...m,
    startAt: new Date(m.startAt),
    endAt: new Date(m.endAt),
  }));

  const monthLabel = new Date(curYear, curMonth).toLocaleString("default", { month: "long", year: "numeric" });

  function prevMonth() {
    if (curMonth === 0) { setCurYear(y => y - 1); setCurMonth(11); }
    else setCurMonth(m => m - 1);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurYear(y => y + 1); setCurMonth(0); }
    else setCurMonth(m => m + 1);
  }

  function openCreate(date: Date) {
    setActiveMeeting(null);
    setSelectedDate(date);
    setDialogOpen(true);
  }
  function openView(m: MeetingWithMeta) {
    setActiveMeeting({ ...m, startAt: new Date(m.startAt), endAt: new Date(m.endAt) });
    setSelectedDate(undefined);
    setDialogOpen(true);
  }

  const thisMonthMeetings = meetings.filter(
    (m) => m.startAt.getFullYear() === curYear && m.startAt.getMonth() === curMonth
  );
  const upcomingMeetings = thisMonthMeetings
    .filter((m) => m.status !== "cancelled" && m.startAt >= today)
    .slice(0, 6);

  return (
    <>
      <div className="flex gap-5">
        {/* ── Calendar ── */}
        <div className="min-w-0 flex-1">
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold">{monthLabel}</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="ml-1 h-7 text-xs"
                onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }}>
                Today
              </Button>
            </div>
            <Button size="sm" onClick={() => openCreate(today)}>
              <Plus className="h-3.5 w-3.5" />
              New Meeting
            </Button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-px">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
            {days.map((day, i) => {
              const isCurrentMonth = day.getMonth() === curMonth;
              const isToday = isSameDay(day, today);
              const dayMeetings = meetings.filter((m) => isSameDay(m.startAt, day));

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[96px] cursor-pointer bg-card p-1.5 transition-colors hover:bg-accent/40",
                    !isCurrentMonth && "opacity-40"
                  )}
                  onClick={() => openCreate(day)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {day.getDate()}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="text-[9px] text-muted-foreground">{dayMeetings.length}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        onClick={(e) => { e.stopPropagation(); openView(m); }}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[10px] font-medium text-white cursor-pointer hover:brightness-110",
                          STATUS_COLOR[m.status]
                        )}
                      >
                        {fmt12(m.startAt)} {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 3 && (
                      <div className="px-1 text-[9px] text-muted-foreground">+{dayMeetings.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex w-64 shrink-0 flex-col gap-4">
          {/* Legend */}
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold">Status</p>
            <div className="space-y-1.5">
              {[
                { key: "scheduled",   label: "Scheduled" },
                { key: "in_progress", label: "In Progress" },
                { key: "completed",   label: "Completed" },
                { key: "cancelled",   label: "Cancelled" },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-sm", STATUS_COLOR[s.key])} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming this month */}
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold">
              Upcoming · {new Date(curYear, curMonth).toLocaleString("default", { month: "short" })}
            </p>
            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming meetings</p>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openView(m)}
                    className="w-full rounded-md p-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="line-clamp-1 text-xs font-medium">{m.title}</p>
                      <Badge variant={STATUS_BADGE[m.status]} className="shrink-0 text-[9px] h-4 px-1">
                        {m.status === "in_progress" ? "Live" : m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {m.startAt.toLocaleDateString("default", { month: "short", day: "numeric" })} · {fmt12(m.startAt)}–{fmt12(m.endAt)}
                    </div>
                    {m.location && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {m.location.startsWith("http") ? <Video className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                        <span className="truncate">{m.location}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Month summary */}
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold">Summary</p>
            <div className="space-y-1">
              {[
                { label: "Total",       count: thisMonthMeetings.length },
                { label: "Scheduled",  count: thisMonthMeetings.filter(m => m.status === "scheduled").length },
                { label: "Completed",  count: thisMonthMeetings.filter(m => m.status === "completed").length },
                { label: "Cancelled",  count: thisMonthMeetings.filter(m => m.status === "cancelled").length },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        meeting={activeMeeting}
        initialDate={selectedDate}
      />
    </>
  );
}
