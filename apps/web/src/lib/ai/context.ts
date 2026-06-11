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

  // Global view — load all projects + all notes
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

    const slugs = projects.map((p) => p.slug);
    return {
      systemPrompt: `${base}\n\nThe user is in the global view.\n\n## Projects (${projects.length} total):\n${projectList}\n\n## All Notes (${allNotes.length} total, grouped by project):\n${notesSection}${actionInstructions(slugs)}`,
      entities,
    };
  }

  const project = await getProjectBySlug(projectSlug, userId);
  if (!project) return { systemPrompt: base, entities: [] };

  const [notes, tasks, adrs] = await Promise.all([
    getNotes({ projectId: project.id, authorId: userId }),
    getTasksForProject(project.id),
    getAdrsForProject(project.id),
  ]);

  const entities: ContextEntity[] = [
    { type: "project", label: project.name, href: `/projects/${project.slug}` },
    ...notes.map((n) => ({ type: "note" as const, label: n.title, href: `/notes/${n.slug}` })),
    ...tasks.map((t) => ({ type: "task" as const, label: t.title, href: `/projects/${project.slug}/tasks` })),
    ...adrs.map((a) => ({ type: "adr" as const, label: `ADR-${a.number}: ${a.title}`, href: `/projects/${project.slug}/adr/${a.id}` })),
  ];

  const notesSection = notes.length === 0
    ? "No notes yet."
    : notes.slice(0, 10).map((n) => {
        const preview = n.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
        return `### Note: ${n.title}\nSlug: ${n.slug} | Tags: ${n.tags.join(", ") || "none"}\n${preview}`;
      }).join("\n\n");

  const allTasks = tasks.filter((t) => t.status !== "archived");
  const tasksSection = allTasks.length === 0
    ? "No tasks."
    : allTasks.map((t) =>
        `- [${t.status.toUpperCase()}] ${t.title} (id: ${t.id}, priority: ${t.priority}${t.dueDate ? `, due: ${t.dueDate}` : ""})`
      ).join("\n");

  const adrsSection = adrs.length === 0
    ? "No ADRs yet."
    : adrs.map((a) => `- ADR-${a.number}: ${a.title} [${a.status}] (id: ${a.id})`).join("\n");

  return {
    systemPrompt: `${base}

## Current Project Context: ${project.name}
${project.description ? `Description: ${project.description}` : ""}

## Notes (${notes.length} total):
${notesSection}

## Tasks (${allTasks.length} total):
${tasksSection}

## Architecture Decision Records:
${adrsSection}${actionInstructions([project.slug])}`,
    entities,
  };
}

function actionInstructions(slugs: string[]): string {
  const slugList = slugs.length > 0 ? slugs.join(", ") : "(none available)";
  return `

## Action Capabilities
When user explicitly asks you to CREATE, UPDATE, DELETE, or MANAGE something, emit action tags at the END of your response.
Explain what you're doing first, then emit the action tags.

### Create actions:
<devbrain-action>{"type":"create_task","title":"Task title","projectSlug":"slug","priority":"low|medium|high|urgent","description":"optional"}</devbrain-action>
<devbrain-action>{"type":"update_task_status","taskId":"uuid-from-context","status":"todo|in_progress|in_review|done","projectSlug":"slug"}</devbrain-action>
<devbrain-action>{"type":"delete_task","taskId":"uuid-from-context","projectSlug":"slug"}</devbrain-action>
<devbrain-action>{"type":"create_note","title":"Note title","projectSlug":"slug","content":"# Markdown content\\n\\nFull content in markdown..."}</devbrain-action>
<devbrain-action>{"type":"create_whiteboard","title":"Diagram title","projectSlug":"slug"}</devbrain-action>
<devbrain-action>{"type":"create_project","name":"Project name","description":"optional","color":"violet|blue|green|red|orange|yellow|pink|cyan"}</devbrain-action>
<devbrain-action>{"type":"create_adr","title":"ADR title","projectSlug":"slug","context":"problem context","decision":"decision made","consequences":"trade-offs","status":"proposed|accepted"}</devbrain-action>
<devbrain-action>{"type":"create_meeting","title":"Meeting title","projectSlug":"slug","description":"optional","startAt":"2024-01-15T09:00:00Z","endAt":"2024-01-15T10:00:00Z","location":"optional","notes":"optional meeting notes"}</devbrain-action>
<devbrain-action>{"type":"create_diagram","title":"Diagram title","projectSlug":"slug","nodes":[{"id":"n1","label":"Service A","color":"blue","shape":"rectangle"},{"id":"n2","label":"Database","color":"green","shape":"ellipse"}],"edges":[{"from":"n1","to":"n2","label":"SQL"}]}</devbrain-action>

Node colors: blue, violet, green, red, orange, yellow, grey, cyan, purple, pink
Node shapes: rectangle (default), ellipse, diamond, cylinder, hexagon, circle
Edges can have an optional label.
For create_diagram: design a proper architecture based on the use case. Include all relevant services, databases, queues, clients, and their connections.

Available project slugs: ${slugList}
For update_task_status and delete_task: use the task id from the Tasks section above.
Only emit action tags when user explicitly asks. Never speculate.`;
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

  return results.slice(0, 8);
}
