"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Pencil, Calendar, Clock, MapPin, Video, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { createMeetingAction, updateMeetingAction, deleteMeetingAction } from "@/lib/actions/meetings";
import type { MeetingWithMeta } from "@/lib/db/meetings";

// ── helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeStr(d: Date) {
  const m = d.getMinutes() >= 30 ? 30 : 0;
  return `${pad(d.getHours())}:${pad(m)}`;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function toISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

function fmt12(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

function fmtDateFull(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) =>
  `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`
);

const DURATION_PRESETS = [
  { label: "30 min", mins: 30 },
  { label: "1 hr",   mins: 60 },
  { label: "1.5 hr", mins: 90 },
  { label: "2 hr",   mins: 120 },
  { label: "3 hr",   mins: 180 },
];

const STATUS_OPTIONS = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
] as const;

const STATUS_BADGE: Record<string, "info" | "warning" | "success" | "muted"> = {
  scheduled: "info", in_progress: "warning", completed: "success", cancelled: "muted",
};

const INPUT_CLS = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function getInitialDefaults(meeting?: MeetingWithMeta | null, initialDate?: Date) {
  if (meeting) {
    const s = new Date(meeting.startAt);
    const e = new Date(meeting.endAt);
    return { date: toDateStr(s), startTime: toTimeStr(s), endTime: toTimeStr(e) };
  }
  const base = initialDate ? new Date(initialDate) : new Date();
  base.setMinutes(base.getMinutes() >= 30 ? 30 : 0, 0, 0);
  const startTime = toTimeStr(base);
  return { date: toDateStr(base), startTime, endTime: addMinutes(startTime, 60) };
}

// ── View mode ────────────────────────────────────────────────────────────────

function MeetingView({
  meeting,
  onEdit,
  onDelete,
  onClose,
  isPending,
}: {
  meeting: MeetingWithMeta;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const start = new Date(meeting.startAt);
  const end   = new Date(meeting.endAt);
  const startStr = toTimeStr(start);
  const endStr   = toTimeStr(end);

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-3 pr-6">
          <DialogTitle className="text-base leading-snug">{meeting.title}</DialogTitle>
          <Badge variant={STATUS_BADGE[meeting.status]} className="shrink-0 text-[10px]">
            {meeting.status === "in_progress" ? "In Progress" : meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
          </Badge>
        </div>
      </DialogHeader>

      <div className="space-y-3 py-1 text-sm">
        {/* Date + time */}
        <div className="flex items-start gap-2.5">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">{fmtDateFull(start)}</p>
            <p className="text-muted-foreground">{fmt12(startStr)} – {fmt12(endStr)}</p>
          </div>
        </div>

        {/* Location */}
        {meeting.location && (
          <div className="flex items-center gap-2.5">
            {meeting.location.startsWith("http")
              ? <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            {meeting.location.startsWith("http") ? (
              <a href={meeting.location} target="_blank" rel="noreferrer"
                className="text-primary underline underline-offset-2 truncate">
                {meeting.location}
              </a>
            ) : (
              <span>{meeting.location}</span>
            )}
          </div>
        )}

        {/* Description */}
        {meeting.description && (
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">{meeting.description}</p>
          </div>
        )}

        {/* Notes / Agenda */}
        {meeting.meetingNotes && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notes / Agenda</p>
            <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground">
              {meeting.meetingNotes}
            </div>
          </div>
        )}

        {!meeting.description && !meeting.meetingNotes && !meeting.location && (
          <p className="text-xs text-muted-foreground italic">No additional details.</p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={isPending}
          className="mr-auto text-destructive hover:text-destructive">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        <Button size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Edit / Create form ───────────────────────────────────────────────────────

function MeetingForm({
  meeting,
  projectId,
  initialDate,
  onClose,
  onSuccess,
}: {
  meeting?: MeetingWithMeta | null;
  projectId: string;
  initialDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!meeting;

  const defaults = getInitialDefaults(meeting, initialDate);

  const [title, setTitle]               = useState(meeting?.title ?? "");
  const [description, setDescription]   = useState(meeting?.description ?? "");
  const [date, setDate]                 = useState(defaults.date);
  const [startTime, setStartTime]       = useState(defaults.startTime);
  const [endTime, setEndTime]           = useState(defaults.endTime);
  const [location, setLocation]         = useState(meeting?.location ?? "");
  const [meetingNotes, setMeetingNotes] = useState(meeting?.meetingNotes ?? "");
  const [status, setStatus]             = useState<"scheduled"|"in_progress"|"completed"|"cancelled">(meeting?.status ?? "scheduled");
  const [error, setError]               = useState<string | null>(null);

  function handleStartChange(t: string) {
    setStartTime(t);
    if (t >= endTime) setEndTime(addMinutes(t, 60));
  }

  function applyDuration(mins: number) {
    setEndTime(addMinutes(startTime, mins));
  }

  const activeDurationMins =
    (TIME_SLOTS.indexOf(endTime) - TIME_SLOTS.indexOf(startTime)) * 30;

  function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (startTime >= endTime) { setError("End time must be after start time"); return; }
    setError(null);

    startTransition(async () => {
      const data = {
        title, description,
        startAt: toISO(date, startTime),
        endAt:   toISO(date, endTime),
        location, meetingNotes, status,
      };
      const result = isEdit
        ? await updateMeetingAction(meeting!.id, data)
        : await createMeetingAction(projectId, data);

      if (result.ok) { onSuccess(); router.refresh(); }
      else setError(result.error);
    });
  }

  function handleDelete() {
    if (!meeting || !confirm("Delete this meeting?")) return;
    startTransition(async () => {
      await deleteMeetingAction(meeting.id);
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Meeting" : "New Meeting"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-3 py-1">
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint Planning" className={INPUT_CLS} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLS} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
          <div className="flex items-center gap-2">
            <select value={startTime} onChange={(e) => handleStartChange(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
            </select>
            <span className="shrink-0 text-xs text-muted-foreground">to</span>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              {TIME_SLOTS.filter((t) => t > startTime).map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
            </select>
          </div>
          <div className="mt-2 flex gap-1.5">
            {DURATION_PRESETS.map((p) => (
              <button key={p.mins} type="button" onClick={() => applyDuration(p.mins)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeDurationMins === p.mins
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Location / Link</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Teams link or room" className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={INPUT_CLS}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={2} placeholder="What's this meeting about?"
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes / Agenda</label>
          <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)}
            rows={3} placeholder="Agenda, decisions, action items…"
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      <DialogFooter className="gap-2">
        {isEdit && (
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
            className="mr-auto text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function MeetingDialog({
  open,
  onOpenChange,
  projectId,
  meeting,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  meeting?: MeetingWithMeta | null;
  initialDate?: Date;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // view = read-only detail, edit = edit form, create = new form
  const [mode, setMode] = useState<"view" | "edit" | "create">(() =>
    meeting ? "view" : "create"
  );

  // Reset mode when dialog opens/closes or meeting changes
  const effectiveMode = !open ? mode : (meeting ? (mode === "create" ? "view" : mode) : "create");

  function handleClose() {
    setMode(meeting ? "view" : "create");
    onOpenChange(false);
  }

  function handleSuccess() {
    setMode(meeting ? "view" : "create");
    onOpenChange(false);
  }

  function handleDelete() {
    if (!meeting || !confirm("Delete this meeting?")) return;
    startTransition(async () => {
      const { deleteMeetingAction } = await import("@/lib/actions/meetings");
      await deleteMeetingAction(meeting.id);
      handleClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        {effectiveMode === "view" && meeting ? (
          <MeetingView
            meeting={meeting}
            onEdit={() => setMode("edit")}
            onDelete={handleDelete}
            onClose={handleClose}
            isPending={false}
          />
        ) : (
          <MeetingForm
            meeting={effectiveMode === "edit" ? meeting : null}
            projectId={projectId}
            initialDate={initialDate}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
