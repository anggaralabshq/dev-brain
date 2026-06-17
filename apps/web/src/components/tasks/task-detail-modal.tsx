"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer } from "lucide-react";
import { updateTaskAction } from "@/lib/actions/tasks";
import type { Task } from "./tasks-board";

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updated: Task) => void;
}

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS: { value: Task["priority"]; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function TaskDetailModal({ task, open, onOpenChange, onUpdate }: TaskDetailModalProps) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "todo");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(
    task?.estimatedPomodoros != null ? String(task.estimatedPomodoros) : ""
  );

  // Sync fields when task changes
  if (task && task.id !== undefined) {
    // handled via key prop on Dialog
  }

  const handleSave = () => {
    if (!task) return;
    const estPomo = estimatedPomodoros === "" ? null : Number(estimatedPomodoros);

    startTransition(async () => {
      const res = await updateTaskAction(task.id, {
        title: title.trim() || task.title,
        description,
        status,
        priority,
        dueDate: dueDate === "" ? null : dueDate,
        estimatedPomodoros: estPomo,
      });

      if (res.ok) {
        onUpdate({
          ...task,
          title: title.trim() || task.title,
          description,
          status,
          priority,
          dueDate: dueDate === "" ? null : dueDate,
          estimatedPomodoros: estPomo ?? undefined,
        });
        onOpenChange(false);
      }
    });
  };

  if (!task) return null;

  const completed = task.completedPomodoros ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Task Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + Pomodoros row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Est. Pomodoros
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={estimatedPomodoros}
                  onChange={(e) => setEstimatedPomodoros(e.target.value)}
                  placeholder="e.g. 4"
                  className="text-sm"
                />
                {completed > 0 && (
                  <Badge variant="muted" className="shrink-0 gap-1 text-[10px]">
                    <Timer className="h-2.5 w-2.5" />
                    {completed} done
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
