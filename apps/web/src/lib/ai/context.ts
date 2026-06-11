import "server-only";
import { getNotes } from "@/lib/db/notes";
import { getTasksForProject } from "@/lib/db/tasks";
import { getAdrsForProject } from "@/lib/db/adrs";
import { getProjectBySlug } from "@/lib/db/projects";

export async function buildSystemPrompt(opts: {
  userId: string;
  userName: string;
  projectSlug?: string | null;
}): Promise<string> {
  const { userId, userName, projectSlug } = opts;
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const base = `You are DevBrain AI, an intelligent assistant embedded in DevBrain — a second brain app for developers.
You help ${userName} with questions about their projects, notes, tasks, architecture decisions, and anything else related to their work.
Today is ${today}. Answer in the same language the user writes in (Indonesian or English).
Be concise, technical, and practical. Format code with backticks.`;

  if (!projectSlug) {
    return base + "\n\nThe user is in the global view (no specific project context).";
  }

  const project = await getProjectBySlug(projectSlug, userId);
  if (!project) return base;

  const [notes, tasks, adrs] = await Promise.all([
    getNotes({ projectId: project.id, authorId: userId }),
    getTasksForProject(project.id),
    getAdrsForProject(project.id),
  ]);

  const notesSection = notes.length === 0
    ? "No notes yet."
    : notes.slice(0, 10).map((n) => {
        const contentPreview = n.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        return `### Note: ${n.title}\nTags: ${n.tags.join(", ") || "none"}\n${contentPreview}`;
      }).join("\n\n");

  const openTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived");
  const tasksSection = openTasks.length === 0
    ? "No open tasks."
    : openTasks.map((t) =>
        `- [${t.status.toUpperCase()}] ${t.title} (priority: ${t.priority}${t.dueDate ? `, due: ${t.dueDate}` : ""})`
      ).join("\n");

  const adrsSection = adrs.length === 0
    ? "No ADRs yet."
    : adrs.map((a) => `- ADR-${a.number}: ${a.title} [${a.status}]`).join("\n");

  return `${base}

## Current Project Context: ${project.name}
${project.description ? `Description: ${project.description}` : ""}

## Notes (${notes.length} total, showing last 10 with content):
${notesSection}

## Open Tasks (${openTasks.length}/${tasks.length} open):
${tasksSection}

## Architecture Decision Records:
${adrsSection}`;
}
