/**
 * Server-side data access for projects.
 * All functions run server-side only (use in Server Components, Route Handlers, Server Actions).
 */
import "server-only";
import { db } from "@devbrain/db";
import { projects, projectMembers, users, notes, tasks, adrs, whiteboards } from "@devbrain/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

export type ProjectWithMeta = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "active" | "planning" | "on-hold" | "archived";
  progress: number;
  color: string;
  ownerId: string;
  startDate: string | null;
  targetDate: string | null;
  starred: boolean;
  tags: string[];
  members: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
    role: "owner" | "editor" | "viewer";
  }>;
  notesCount: number;
  tasksCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const colorToBg: Record<string, string> = {
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
  yellow: "bg-yellow-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hashToColor(name: string): string {
  // Deterministic color from name hash — placeholder for proper user avatars
  const colors = ["bg-violet-500", "bg-emerald-500", "bg-blue-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-yellow-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get all projects owned by a user (with member info) — used by /projects page
 */
export async function getAllProjects(userId: string): Promise<ProjectWithMeta[]> {
  const rows = await db
    .select({
      project: projects,
      memberUserId: projectMembers.userId,
      memberRole: projectMembers.role,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(projects)
    .leftJoin(projectMembers, eq(projectMembers.projectId, projects.id))
    .leftJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.updatedAt));

  // Group members by project
  const byProject = new Map<string, ProjectWithMeta>();
  for (const row of rows) {
    let p = byProject.get(row.project.id);
    if (!p) {
      p = {
        id: row.project.id,
        slug: row.project.slug,
        name: row.project.name,
        description: row.project.description,
        status: row.project.status,
        progress: row.project.progress,
        color: row.project.color,
        ownerId: row.project.ownerId,
        startDate: row.project.startDate,
        targetDate: row.project.targetDate,
        starred: row.project.starred,
        tags: row.project.tags,
        members: [],
        notesCount: 0,
        tasksCount: 0,
        createdAt: row.project.createdAt,
        updatedAt: row.project.updatedAt,
      };
      byProject.set(row.project.id, p);
    }
    if (row.memberUserId && row.memberName) {
      p.members.push({
        id: row.memberUserId,
        name: row.memberName,
        initials: getInitials(row.memberName),
        color: hashToColor(row.memberName),
        role: row.memberRole!,
      });
    }
  }

  return Array.from(byProject.values());
}

/**
 * Get single project by slug — only returns projects owned by userId (prevents cross-user access)
 */
export async function getProjectBySlug(slug: string, userId: string): Promise<ProjectWithMeta | null> {
  const list = await getAllProjects(userId);
  return list.find((p) => p.slug === slug) ?? null;
}

/**
 * Get starred projects (for sidebar) — limited to first 5
 */
export async function getStarredProjects(userId: string, limit = 5) {
  const all = await getAllProjects(userId);
  return all.filter((p) => p.starred).slice(0, limit);
}

/**
 * Create a new project. Returns the new project slug.
 */
export async function createProject(input: {
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  template?: string;
}) {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || `project-${Date.now()}`;

  const [created] = await db
    .insert(projects)
    .values({
      slug,
      name: input.name,
      description: input.description ?? "",
      color: input.color ?? "violet",
      ownerId: input.ownerId,
      status: "planning",
      progress: 0,
    })
    .returning();

  // Auto-add owner as project member
  await db.insert(projectMembers).values({
    projectId: created.id,
    userId: input.ownerId,
    role: "owner",
  });

  return created;
}

/**
 * Aggregate stats for a single project (used by overview page).
 */
export async function getProjectStats(projectId: string) {
  const [openTasksRows, overdueTasksRows, adrRows, noteRows, repoRows] =
    await Promise.all([
      db
        .select({
          openTasks: sql<number>`count(*)::int`,
        })
        .from(sql`tasks`)
        .where(sql`project_id = ${projectId} AND status IN ('todo', 'in_progress', 'in_review')`),
      db
        .select({
          overdueTasks: sql<number>`count(*)::int`,
        })
        .from(sql`tasks`)
        .where(
          sql`project_id = ${projectId} AND status != 'done' AND due_date < CURRENT_DATE`
        ),
      db
        .select({
          adrCount: sql<number>`count(*)::int`,
          lastAdr: sql<string | null>`(SELECT title FROM adrs WHERE project_id = ${projectId} ORDER BY number DESC LIMIT 1)`,
        })
        .from(sql`adrs`)
        .where(sql`project_id = ${projectId}`),
      db
        .select({
          noteCount: sql<number>`count(*)::int`,
        })
        .from(sql`notes`)
        .where(sql`project_id = ${projectId}`),
      db
        .select({
          repoCount: sql<number>`count(*)::int`,
        })
        .from(sql`project_members`)
        .where(sql`project_id = ${projectId} AND role = 'owner'`), // placeholder until repos table
    ]);

  const openTasks = openTasksRows[0]?.openTasks ?? 0;
  const overdueTasks = overdueTasksRows[0]?.overdueTasks ?? 0;
  const adrCount = adrRows[0]?.adrCount ?? 0;
  const lastAdr = adrRows[0]?.lastAdr ?? null;
  const noteCount = noteRows[0]?.noteCount ?? 0;
  const repoCount = repoRows[0]?.repoCount ?? 0;

  return {
    openTasks,
    overdueTasks,
    adrCount,
    lastAdr,
    noteCount,
    repoCount,
  };
}

/**
 * Aggregate stats scoped to a user's own projects (used by /projects page)
 */
export async function getGlobalProjectStats(userId: string) {
  // Get IDs of projects owned by this user
  const ownedProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));
  const projectIds = ownedProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    return { totalProjects: 0, totalNotes: 0, totalTasks: 0, totalAdrs: 0, totalDiagrams: 0, totalMembers: 0 };
  }

  const [pCount, nCount, tCount, aCount, wCount, mCount] = await Promise.all([
    Promise.resolve(projectIds.length),
    db.select({ n: sql<number>`count(*)::int` }).from(notes).where(inArray(notes.projectId, projectIds)).then(r => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(tasks).where(inArray(tasks.projectId, projectIds)).then(r => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(adrs).where(inArray(adrs.projectId, projectIds)).then(r => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(whiteboards).where(inArray(whiteboards.projectId, projectIds)).then(r => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(distinct ${projectMembers.userId})::int` }).from(projectMembers).where(inArray(projectMembers.projectId, projectIds)).then(r => r[0]?.n ?? 0),
  ]);
  return {
    totalProjects: pCount,
    totalNotes:    nCount,
    totalTasks:    tCount,
    totalAdrs:     aCount,
    totalDiagrams: wCount,
    totalMembers:  mCount,
  };
}
