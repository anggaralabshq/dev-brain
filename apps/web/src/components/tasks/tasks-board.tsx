"use client";

import { useState, useEffect, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Archive,
  MoreHorizontal,
  Trash2,
  Calendar,
  Timer,
  GripVertical,
} from "lucide-react";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction, deleteTaskAction } from "@/lib/actions/tasks";
import { TaskDetailModal } from "./task-detail-modal";

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  dueDate: string | null;
  createdAt?: string | Date;
  estimatedPomodoros?: number;
  completedPomodoros?: number;
};

const COLUMNS: Array<{
  id: Task["status"];
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "todo",        label: "To Do",       color: "text-muted-foreground", icon: Circle },
  { id: "in_progress", label: "In Progress", color: "text-blue-400",         icon: Clock },
  { id: "in_review",   label: "In Review",   color: "text-amber-400",        icon: Eye },
  { id: "done",        label: "Done",        color: "text-emerald-400",      icon: CheckCircle2 },
];

const priorityVariant: Record<string, "muted" | "info" | "warning" | "destructive"> = {
  low: "muted", medium: "info", high: "warning", urgent: "destructive",
};

// ── Task card content (shared between draggable + overlay) ───────────────────

function TaskCardInner({
  task,
  isDragging = false,
  dragHandleProps,
  onOpenDetail,
}: {
  task: Task;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onOpenDetail?: (task: Task) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [focusConfirmOpen, setFocusConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { state: pomodoroState, startSession } = usePomodoro();

  const setStatus = (status: string) => {
    startTransition(async () => {
      await updateTaskStatusAction(task.id, status);
    });
  };

  const handleFocus = () => {
    const otherActive =
      pomodoroState.taskId &&
      pomodoroState.taskId !== task.id &&
      (pomodoroState.status === "running" || pomodoroState.status === "paused");
    if (otherActive) {
      setFocusConfirmOpen(true);
      return;
    }
    startSession(task.id, task.title, task.projectId, task.estimatedPomodoros ?? 4);
  };

  const isActive = pomodoroState.taskId === task.id && pomodoroState.status !== "idle";
  const completed = task.completedPomodoros ?? 0;
  const estimated = task.estimatedPomodoros ?? 0;

  return (
    <Card
      className={cn(
        "group p-3 transition-all select-none",
        isDragging
          ? "rotate-1 scale-105 shadow-2xl border-primary/60 ring-1 ring-primary/30"
          : "hover:border-primary/40",
        isPending && "opacity-60",
        isActive && !isDragging && "border-primary/60 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-start gap-2">
        {/* drag handle */}
        <button
          type="button"
          {...dragHandleProps}
          className={cn(
            "mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 transition-opacity hover:text-muted-foreground",
            isDragging ? "opacity-100 cursor-grabbing" : "opacity-0 group-hover:opacity-100"
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => !isDragging && onOpenDetail?.(task)}
            className="text-left text-sm font-medium leading-snug hover:underline decoration-muted-foreground/40 underline-offset-2"
          >
            {task.title}
          </button>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              aria-label="Task actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setStatus("todo")}>
              <Circle className="h-3.5 w-3.5" />Mark as Todo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus("in_progress")}>
              <Clock className="h-3.5 w-3.5" />In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus("in_review")}>
              <Eye className="h-3.5 w-3.5" />In Review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus("done")}>
              <CheckCircle2 className="h-3.5 w-3.5" />Mark as Done
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant={priorityVariant[task.priority]} className="text-[9px] capitalize">
            {task.priority}
          </Badge>
          {task.createdAt && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70" title="Created date">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Due date">
              <Calendar className="h-2.5 w-2.5 text-amber-400" />
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {estimated > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              🍅 {completed}/{estimated}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.assigneeName && task.assigneeColor && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className={cn("text-[9px] text-white", task.assigneeColor)}>
                {task.assigneeName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
          )}
          <button
            type="button"
            onClick={handleFocus}
            title={isActive ? "Session active" : "Start focus session"}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              "opacity-0 group-hover:opacity-100",
              isActive
                ? "opacity-100 bg-primary/20 text-primary"
                : "border border-border hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-muted-foreground"
            )}
          >
            <Timer className="h-2.5 w-2.5" />
            {isActive ? "Active" : "Focus"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={focusConfirmOpen}
        onOpenChange={setFocusConfirmOpen}
        title="Switch focus session?"
        description={`Abandon "${pomodoroState.taskName}" and start this task?`}
        confirmLabel="Switch"
        variant="default"
        onConfirm={() => startSession(task.id, task.title, task.projectId, task.estimatedPomodoros ?? 4)}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete task?"
        description="This task will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => startTransition(async () => { await deleteTaskAction(task.id); })}
      />
    </Card>
  );
}

// ── Draggable task card ──────────────────────────────────────────────────────

function DraggableTaskCard({ task, onOpenDetail }: { task: Task; onOpenDetail: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardInner
        task={task}
        onOpenDetail={onOpenDetail}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  );
}

// ── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  tasks,
  onOpenDetail,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  onOpenDetail: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center justify-between px-1">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", col.color)}>
          <col.icon className="h-3.5 w-3.5" />
          {col.label}
        </div>
        <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[120px] rounded-lg p-1 flex flex-col gap-2 transition-colors duration-150",
          isOver ? "bg-primary/8 ring-1 ring-primary/30" : "bg-transparent"
        )}
      >
        {tasks.map((t) => (
          <DraggableTaskCard key={t.id} task={t} onOpenDetail={onOpenDetail} />
        ))}
        {tasks.length === 0 && (
          <div className={cn(
            "flex-1 rounded-md border border-dashed p-4 text-center text-[10px] transition-colors",
            isOver
              ? "border-primary/50 text-primary/70 bg-primary/5"
              : "border-border/50 text-muted-foreground"
          )}>
            {isOver ? "Drop here" : "No tasks"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main board ───────────────────────────────────────────────────────────────

export function TasksBoard({
  initialTasks,
  newTaskButton,
}: {
  initialTasks: Task[];
  newTaskButton?: React.ReactNode;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [, startTransition] = useTransition();

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id));

  function handleDragStart({ active }: DragStartEvent) {
    const task = active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const newStatus = over.id as Task["status"];
    if (!COLUMN_IDS.has(newStatus)) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t))
    );

    // Persist
    startTransition(async () => {
      await updateTaskStatusAction(String(active.id), newStatus);
    });
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.id),
  }));
  const archived = tasks.filter((t) => t.status === "archived");

  return (
    <div className="space-y-4">
      {newTaskButton && <div className="flex justify-end">{newTaskButton}</div>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {grouped.map((col) => (
            <DroppableColumn key={col.id} col={col} tasks={col.tasks} onOpenDetail={handleOpenDetail} />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardInner task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>

      {archived.length > 0 && (
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer p-3 text-xs font-medium text-muted-foreground">
            <Archive className="mr-1.5 inline h-3 w-3" />
            Archived ({archived.length})
          </summary>
          <div className="space-y-2 border-t border-border p-3">
            {archived.map((t) => (
              <TaskCardInner key={t.id} task={t} onOpenDetail={handleOpenDetail} />
            ))}
          </div>
        </details>
      )}

      <TaskDetailModal
        key={selectedTask?.id}
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}
