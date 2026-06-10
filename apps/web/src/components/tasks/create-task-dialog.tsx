"use client";

import { useState, useTransition } from "react";
import { Plus, CheckSquare, Loader2 } from "lucide-react";
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
import { createTaskAction } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

const PRIORITY = [
  { id: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { id: "medium", label: "Medium", color: "bg-info/15 text-info" },
  { id: "high", label: "High", color: "bg-warning/15 text-warning" },
  { id: "urgent", label: "Urgent", color: "bg-destructive/15 text-destructive" },
];

const TEAM = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Andi Pratama", initials: "AP", color: "bg-violet-500" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Siti Aisyah", initials: "SA", color: "bg-emerald-500" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Budi Santoso", initials: "BS", color: "bg-blue-500" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Dewi Lestari", initials: "DL", color: "bg-orange-500" },
];

export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | "">(4);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setAssigneeId("");
    setDueDate("");
    setEstimatedPomodoros(4);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);

    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title);
    fd.append("description", description);
    fd.append("status", status);
    fd.append("priority", priority);
    fd.append("assigneeId", assigneeId);
    fd.append("dueDate", dueDate);
    fd.append("estimatedPomodoros", String(estimatedPomodoros || 0));

    startTransition(async () => {
      const result = await createTaskAction(fd);
      if (result.ok) {
        reset();
        setOpen(false);
        router.refresh();
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
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              Create new task
            </DialogTitle>
            <DialogDescription>
              Add a task to track work for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="Add details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {STATUS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id)}
                      className={cn(
                        "rounded border px-2 py-1 text-xs",
                        status === s.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {PRIORITY.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={cn(
                        "rounded border px-2 py-1 text-xs",
                        priority === p.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Assignee
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setAssigneeId("")}
                    className={cn(
                      "rounded border px-2 py-1 text-xs",
                      !assigneeId
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    Unassigned
                  </button>
                  {TEAM.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAssigneeId(m.id)}
                      className={cn(
                        "flex items-center gap-1 rounded border px-2 py-1 text-xs",
                        assigneeId === m.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className={cn("h-3 w-3 rounded-full", m.color)} />
                      {m.initials}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                🍅 Estimated sessions
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="4"
                value={estimatedPomodoros}
                onChange={(e) => setEstimatedPomodoros(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-32"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">25-min focus sessions needed</p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
