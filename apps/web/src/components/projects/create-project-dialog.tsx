"use client";

import { useState, useTransition } from "react";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const colorOptions = [
  { name: "violet", class: "bg-violet-500" },
  { name: "emerald", class: "bg-emerald-500" },
  { name: "blue", class: "bg-blue-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "pink", class: "bg-pink-500" },
  { name: "cyan", class: "bg-cyan-500" },
  { name: "yellow", class: "bg-yellow-500" },
];

const templates = [
  { id: "blank", name: "Blank Project", desc: "Start from scratch" },
  { id: "web", name: "Web Application", desc: "Frontend + Backend + DB" },
  { id: "mobile", name: "Mobile App", desc: "iOS + Android + API" },
  { id: "api", name: "API Service", desc: "REST + Auth + Docs" },
  { id: "ml", name: "ML Project", desc: "Data + Model + Deploy" },
];

type CreateInput = {
  name: string;
  description: string;
  color: string;
  template: string;
};

type CreateResult = { ok: true; slug: string; id: string } | { ok: false; error: string };

export function CreateProjectDialog({
  onCreate,
}: {
  onCreate: (input: CreateInput) => Promise<CreateResult>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("violet");
  const [template, setTemplate] = useState("blank");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setDescription("");
    setColor("violet");
    setTemplate("blank");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await onCreate({ name, description, color, template });
      if (result.ok) {
        reset();
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Create new project
            </DialogTitle>
            <DialogDescription>
              A project is the top-level container for notes, ADRs, diagrams, and tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Template */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "rounded-md border p-2.5 text-left text-xs transition-colors",
                      template === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Project name
              </label>
              <Input
                id="name"
                placeholder="e.g. Mobile App Refactor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="desc" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                id="desc"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
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
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
