import "server-only";
import { getNotes } from "@/lib/db/notes";
import { getTasksForProject } from "@/lib/db/tasks";
import { getAdrsForProject } from "@/lib/db/adrs";
import { getProjectBySlug, getAllProjects } from "@/lib/db/projects";

export type ContextEntity = {
  type: "note" | "project" | "task" | "adr";
  label: string;
  href: string;
};

export type BuildContextResult = {
  systemPrompt: string;
  entities: ContextEntity[];
};

export async function buildContext(opts: {
  userId: string;
  userName: string;
  projectSlug?: string | null;
}): Promise<BuildContextResult> {
  const { userId, userName, projectSlug } = opts;
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const base = `You are DevBrain AI, an intelligent assistant embedded in DevBrain — a second brain app for developers.
You help ${userName} with questions about their projects, notes, tasks, architecture decisions, and anything else related to their work.
Today is ${today}. Answer in the same language the user writes in (Indonesian or English).
Be concise, technical, and practical. Format code with backticks.`;

  // Global view — load all projects + all notes across all projects
  if (!projectSlug) {
    const [projects, allNotes] = await Promise.all([
      getAllProjects(userId),
      getNotes({ authorId: userId }),
    ]);

    const entities: ContextEntity[] = [
      ...projects.map((p) => ({
        type: "project" as const,
        label: p.name,
        href: `/projects/${p.slug}`,
      })),
      ...allNotes.map((n) => ({
        type: "note" as const,
        label: n.title,
        href: `/notes/${n.slug}`,
      })),
    ];

    const projectList = projects.length === 0
      ? "No projects yet."
      : projects.map((p) => `- ${p.name}${p.description ? ` — ${p.description}` : ""} (slug: ${p.slug})`).join("\n");

    // Group notes by project for readability
    const notesByProject = new Map<string, typeof allNotes>();
    for (const n of allNotes) {
      const key = n.projectName ?? "(no project)";
      if (!notesByProject.has(key)) notesByProject.set(key, []);
      notesByProject.get(key)!.push(n);
    }

    const notesSection = allNotes.length === 0
      ? "No notes yet."
      : Array.from(notesByProject.entries()).map(([projectName, notes]) => {
          const noteLines = notes.slice(0, 8).map((n) => {
            const preview = n.content
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 300);
            return `  ### ${n.title}\n  Slug: ${n.slug} | Tags: ${n.tags.join(", ") || "none"}\n  ${preview}`;
          }).join("\n\n");
          return `### Project: ${projectName}\n${noteLines}`;
        }).join("\n\n");

    return {
      systemPrompt: `${base}\n\nThe user is in the global view.\n\n## Projects (${projects.length} total):\n${projectList}\n\n## All Notes (${allNotes.length} total, grouped by project):\n${notesSection}`,
      entities,
    };
  }

  const project = await getProjectBySlug(projectSlug, userId);
  if (!project) {
    return { systemPrompt: base, entities: [] };
  }

  const [notes, tasks, adrs] = await Promise.all([
    getNotes({ projectId: project.id, authorId: userId }),
    getTasksForProject(project.id),
    getAdrsForProject(project.id),
  ]);

  const entities: ContextEntity[] = [
    { type: "project", label: project.name, href: `/projects/${project.slug}` },
    ...notes.map((n) => ({
      type: "note" as const,
      label: n.title,
      href: `/notes/${n.slug}`,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      label: t.title,
      href: `/projects/${project.slug}/tasks`,
    })),
    ...adrs.map((a) => ({
      type: "adr" as const,
      label: `ADR-${a.number}: ${a.title}`,
      href: `/projects/${project.slug}/adr/${a.id}`,
    })),
  ];

  const notesSection = notes.length === 0
    ? "No notes yet."
    : notes.slice(0, 10).map((n) => {
        const contentPreview = n.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        return `### Note: ${n.title}\nSlug: ${n.slug}\nTags: ${n.tags.join(", ") || "none"}\n${contentPreview}`;
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

  return {
    systemPrompt: `${base}

## Current Project Context: ${project.name}
${project.description ? `Description: ${project.description}` : ""}

## Notes (${notes.length} total, showing last 10 with content):
${notesSection}

## Open Tasks (${openTasks.length}/${tasks.length} open):
${tasksSection}

## Architecture Decision Records:
${adrsSection}`,
    entities,
  };
}

/** Match entities whose label appears in responseText (case-insensitive). */
export function matchEntities(responseText: string, entities: ContextEntity[]): ContextEntity[] {
  const lower = responseText.toLowerCase();
  const seen = new Set<string>();
  const results: ContextEntity[] = [];

  for (const entity of entities) {
    const key = entity.href;
    if (seen.has(key)) continue;
    if (lower.includes(entity.label.toLowerCase())) {
      seen.add(key);
      results.push(entity);
    }
  }

  return results.slice(0, 8); // cap at 8 suggestions
}
