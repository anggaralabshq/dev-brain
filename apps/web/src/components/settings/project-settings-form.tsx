"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { Loader2, Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateProjectAction, deleteProjectAction, archiveProjectAction } from "@/lib/actions/projects";
import type { ProjectWithMeta } from "@/lib/db/projects";

const STATUS_OPTIONS = [
  { value: "planning",  label: "Planning" },
  { value: "active",    label: "Active" },
  { value: "on-hold",   label: "On Hold" },
  { value: "archived",  label: "Archived" },
] as const;

const COLOR_OPTIONS = [
  { value: "violet",  cls: "bg-violet-500" },
  { value: "emerald", cls: "bg-emerald-500" },
  { value: "blue",    cls: "bg-blue-500" },
  { value: "orange",  cls: "bg-orange-500" },
  { value: "pink",    cls: "bg-pink-500" },
  { value: "cyan",    cls: "bg-cyan-500" },
  { value: "yellow",  cls: "bg-yellow-500" },
];

const INPUT_CLS = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
const LABEL_CLS = "mb-1 block text-xs font-medium text-muted-foreground";

export function ProjectSettingsForm({ project }: { project: ProjectWithMeta }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [name, setName]             = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus]         = useState(project.status);
  const [color, setColor]           = useState(project.color);
  const [progress, setProgress]     = useState(project.progress);
  const [startDate, setStartDate]   = useState(project.startDate ?? "");
  const [targetDate, setTargetDate] = useState(project.targetDate ?? "");
  const [tags, setTags]             = useState<string[]>(project.tags);
  const [tagInput, setTagInput]     = useState("");

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setError(null);
    startTransition(async () => {
      const result = await updateProjectAction(project.slug, {
        name, description, status, color, progress,
        startDate: startDate || null,
        targetDate: targetDate || null,
        tags,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleArchive() {
    setArchiveConfirm(true);
  }

  function handleDelete() {
    setDeleteConfirm(true);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* General */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

          <div>
            <label className={LABEL_CLS}>Project Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
          </div>

          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={INPUT_CLS}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Progress ({progress}%)</label>
              <input type="range" min={0} max={100} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Target Date</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className={LABEL_CLS}>Color</label>
            <div className="flex gap-2 mt-1">
              {COLOR_OPTIONS.map((c) => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", c.cls,
                    color === c.value && "ring-2 ring-offset-2 ring-offset-background ring-white scale-110")} />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL_CLS}>Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  <Tag className="h-2.5 w-2.5" />
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag, press Enter"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white", m.color)}>
                    {m.initials}
                  </div>
                  <span className="text-sm">{m.name}</span>
                </div>
                <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-3">
            <div>
              <p className="text-sm font-medium">Archive project</p>
              <p className="text-xs text-muted-foreground">Hide from active projects. Data is preserved.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={isPending}>Archive</Button>
          </div>
          <div className="flex items-center justify-between rounded-md border border-destructive/30 px-3 py-3">
            <div>
              <p className="text-sm font-medium">Delete project</p>
              <p className="text-xs text-muted-foreground">Permanently delete all data. Cannot be undone.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>Delete</Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={archiveConfirm}
        onOpenChange={setArchiveConfirm}
        title="Archive project?"
        description="The project will be hidden from active projects. You can restore it from settings later."
        confirmLabel="Archive"
        variant="default"
        onConfirm={() => {
          startTransition(async () => {
            await archiveProjectAction(project.slug);
            router.push("/projects");
          });
        }}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title={`Delete "${project.name}"?`}
        description="Permanently deletes this project and all its tasks, notes, ADRs, diagrams, and meetings. This cannot be undone."
        confirmLabel="Delete forever"
        onConfirm={() => {
          startTransition(async () => {
            await deleteProjectAction(project.slug);
          });
        }}
      />
    </div>
  );
}
