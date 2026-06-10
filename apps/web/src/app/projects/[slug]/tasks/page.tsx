import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProjectBySlug } from "@/lib/db/projects";
import { getTasksForProject } from "@/lib/db/tasks";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const tasks = await getTasksForProject(project.id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Tasks</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} in {project.name}. Click a card to cycle status.
          </p>
        </div>
      </div>

      <TasksBoard
        initialTasks={tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate,
        }))}
        newTaskButton={<CreateTaskDialog projectId={project.id} />}
      />
    </div>
  );
}
