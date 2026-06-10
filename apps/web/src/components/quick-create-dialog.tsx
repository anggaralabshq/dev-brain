"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, StickyNote, Network, ScrollText, CheckSquare,
  Calendar, FolderOpen, ChevronLeft, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getProjectsForPickerAction } from "@/lib/actions/projects";
import { createNoteAction } from "@/lib/actions/notes";
import { createWhiteboardAction } from "@/lib/actions/whiteboards";
import { createAdrAction } from "@/lib/actions/adrs";
import { createTaskAction } from "@/lib/actions/tasks";
import { createMeetingAction } from "@/lib/actions/meetings";

export type CreateType = "note" | "whiteboard" | "adr" | "task" | "meeting";

const TYPE_CONFIG: Record<CreateType, {
  label: string;
  namePlaceholder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  note:       { label: "New Note",       namePlaceholder: "Note title…",      icon: StickyNote  },
  whiteboard: { label: "New Diagram",    namePlaceholder: "Diagram name…",    icon: Network     },
  adr:        { label: "New ADR",        namePlaceholder: "Decision title…",  icon: ScrollText  },
  task:       { label: "New Task",       namePlaceholder: "Task title…",      icon: CheckSquare },
  meeting:    { label: "New Meeting",    namePlaceholder: "Meeting title…",   icon: Calendar    },
};

const COLOR_CLS: Record<string, string> = {
  violet: "bg-violet-500", emerald: "bg-emerald-500", blue: "bg-blue-500",
  orange: "bg-orange-500", pink:    "bg-pink-500",    cyan: "bg-cyan-500",
  yellow: "bg-yellow-500",
};

const pad = (n: number) => String(n).padStart(2, "0");
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) =>
  `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`
);

function defaultDateStr() {
  return new Date().toISOString().slice(0, 10);
}
function defaultTimeStr() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const next = Math.ceil((mins + 1) / 30) * 30;
  return `${pad(Math.floor(next / 60) % 24)}:${next % 60 === 0 ? "00" : "30"}`;
}

type Project = { id: string; slug: string; name: string; color: string };
type Step = "project" | "form";

interface Props {
  open: boolean;
  type: CreateType | null;
  onClose: () => void;
}

export function QuickCreateDialog({ open, type, onClose }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [step, setStep] = useState<Step>("project");
  const [query, setQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(defaultDateStr());
  const [meetingStart, setMeetingStart] = useState(defaultTimeStr());
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);

  // Load projects when dialog opens
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const list = await getProjectsForPickerAction();
      setProjects(list);
    });
  }, [open]);

  // Reset on close or type change
  useEffect(() => {
    if (!open) {
      setStep("project");
      setQuery("");
      setSelectedProject(null);
      setTitle("");
      setError(null);
      setMeetingDate(defaultDateStr());
      setMeetingStart(defaultTimeStr());
      setMeetingDuration(60);
    }
  }, [open]);

  const filtered = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  function selectProject(p: Project) {
    setSelectedProject(p);
    setStep("form");
    setQuery("");
  }

  async function handleCreate() {
    if (!type || !selectedProject || !title.trim()) return;
    setError(null);
    setIsPending(true);

    try {
      if (type === "note") {
        const fd = new FormData();
        fd.set("title", title.trim());
        fd.set("projectId", selectedProject.id);
        fd.set("content", "");
        const res = await createNoteAction(fd);
        if (!res.ok) { setError(res.error); return; }
        onClose();
        router.push(`/notes/${res.slug}`);

      } else if (type === "whiteboard") {
        const res = await createWhiteboardAction(selectedProject.id, title.trim());
        if (!res.ok) { setError(res.error); return; }
        onClose();
        router.push(`/projects/${selectedProject.slug}/architecture/${res.id}`);

      } else if (type === "adr") {
        const fd = new FormData();
        fd.set("projectId", selectedProject.id);
        fd.set("title", title.trim());
        const res = await createAdrAction(fd);
        if (!res.ok) { setError(res.error); return; }
        onClose();
        router.push(`/projects/${selectedProject.slug}/adr/${res.id}`);

      } else if (type === "task") {
        const fd = new FormData();
        fd.set("projectId", selectedProject.id);
        fd.set("title", title.trim());
        const res = await createTaskAction(fd);
        if (!res.ok) { setError(res.error); return; }
        onClose();
        router.push(`/projects/${selectedProject.slug}/tasks`);

      } else if (type === "meeting") {
        const startDt = new Date(`${meetingDate}T${meetingStart}:00`);
        const endDt = new Date(startDt.getTime() + meetingDuration * 60000);
        const res = await createMeetingAction(selectedProject.id, {
          title: title.trim(),
          startAt: startDt.toISOString(),
          endAt: endDt.toISOString(),
        });
        if (!res.ok) { setError(res.error); return; }
        onClose();
        router.push(`/projects/${selectedProject.slug}/meetings`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  const cfg = type ? TYPE_CONFIG[type] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {cfg && <cfg.icon className="h-4 w-4 text-primary" />}
            {cfg?.label ?? "Quick Create"}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Project picker ── */}
        {step === "project" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select a project.</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-56 overflow-y-auto -mx-1 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 opacity-40" />
                  <p className="text-xs">{query ? "No match." : "No projects yet."}</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <button key={p.slug} type="button" onClick={() => selectProject(p)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left">
                    <div className={`h-3 w-3 shrink-0 rounded-sm ${COLOR_CLS[p.color] ?? "bg-muted"}`} />
                    <span className="truncate font-medium">{p.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Details form ── */}
        {step === "form" && selectedProject && cfg && (
          <div className="space-y-4">
            {/* Selected project chip + back */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStep("project")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                <div className={`h-2 w-2 rounded-sm ${COLOR_CLS[selectedProject.color] ?? "bg-muted"}`} />
                <span className="text-xs font-medium">{selectedProject.name}</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isPending) handleCreate(); }}
                placeholder={cfg.namePlaceholder}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Meeting-specific fields */}
            {type === "meeting" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Start time</label>
                    <select value={meetingStart} onChange={(e) => setMeetingStart(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration</label>
                    <select value={meetingDuration} onChange={(e) => setMeetingDuration(Number(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                      <option value={180}>3 hours</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            <Button
              onClick={handleCreate}
              disabled={isPending || !title.trim()}
              className="w-full"
            >
              {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              {isPending ? "Creating…" : `Create ${cfg.label.replace("New ", "")}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
