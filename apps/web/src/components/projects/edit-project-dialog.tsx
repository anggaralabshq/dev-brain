"use client";

import { useState, useTransition } from "react";
import { Loader2, FolderKanban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProjectStatus = "planning" | "active" | "on-hold" | "archived";

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "archived", label: "Archived" },
];

const colorOptions = [
  { name: "violet", class: "bg-violet-500" },
  { name: "emerald", class: "bg-emerald-500" },
  { name: "blue", class: "bg-blue-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "pink", class: "bg-pink-500" },
  { name: "cyan", class: "bg-cyan-500" },
  { name: "yellow", class: "bg-yellow-500" },
];

export type EditProjectInput = {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
};

type EditResult = { ok: true } | { ok: false; error: string };

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { name: string; description: string; status: ProjectStatus; color: string };
  onSave: (data: EditProjectInput) => Promise<EditResult>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [color, setColor] = useState(project.color);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await onSave({ name, description, status, color });
      if (result.ok) {
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Edit project
            </DialogTitle>
            <DialogDescription>
              Update project name, description, status, or color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Name */}
            <div>
              <label htmlFor="edit-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Project name
              </label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-desc" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <div className="flex gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      status === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-accent text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Accent color
              </label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={cn(
                      "h-7 w-7 rounded-md transition-all",
                      c.class,
                      color === c.name
                        ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                        : "opacity-60 hover:opacity-100"
                    )}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
