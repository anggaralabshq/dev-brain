"use server";

/**
 * Project Server Actions — called from client components via form actions or transitions.
 * All actions validate input, perform DB write, and revalidate the affected paths.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@devbrain/db";
import { projects, projectMembers } from "@devbrain/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";

// ---- helpers ----

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || `project-${Date.now()}`
  );
}

// ---- actions ----

export async function createProjectAction(formData: FormData) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false as const, error: "Not authenticated" };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const color = (formData.get("color") as string) || "violet";
  const template = (formData.get("template") as string) || "blank";
  const statusRaw = (formData.get("status") as string) || "planning";
  const status = (["active", "planning", "on-hold", "archived"].includes(statusRaw)
    ? statusRaw
    : "planning") as "active" | "planning" | "on-hold" | "archived";

  if (!name) {
    return { ok: false as const, error: "Project name is required" };
  }

  const slug = slugify(name);

  // Check slug uniqueness
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false as const, error: `A project with slug "${slug}" already exists` };
  }

  // Create project
  const [created] = await db
    .insert(projects)
    .values({
      slug,
      name,
      description,
      color,
      ownerId: user.id,
      status,
      progress: 0,
      tags: template !== "blank" ? [template] : [],
    })
    .returning();

  // Auto-add current user as owner
  await db.insert(projectMembers).values({
    projectId: created.id,
    userId: user.id,
    role: "owner",
  });

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath(`/projects/${slug}`);

  return { ok: true as const, slug, id: created.id };
}

export async function deleteProjectAction(slug: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return;
  await db.delete(projects).where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)));
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

export async function toggleStarAction(slug: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const [current] = await db
    .select({ starred: projects.starred })
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)))
    .limit(1);
  if (!current) return { ok: false as const, error: "Project not found" };

  await db
    .update(projects)
    .set({ starred: !current.starred, updatedAt: new Date() })
    .where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)));

  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true as const, starred: !current.starred };
}

export async function updateProjectProgressAction(slug: string, progress: number) {
  const user = await requireUser().catch(() => null);
  if (!user) return;
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  await db
    .update(projects)
    .set({ progress: clamped, updatedAt: new Date() })
    .where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)));
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");
}

export async function updateProjectAction(
  slug: string,
  data: {
    name?: string;
    description?: string;
    status?: "active" | "planning" | "on-hold" | "archived";
    color?: string;
    progress?: number;
    startDate?: string | null;
    targetDate?: string | null;
    tags?: string[];
  }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set.name = data.name.trim();
  if (data.description !== undefined) set.description = data.description.trim();
  if (data.status !== undefined) set.status = data.status;
  if (data.color !== undefined) set.color = data.color;
  if (data.progress !== undefined) set.progress = Math.max(0, Math.min(100, data.progress));
  if (data.startDate !== undefined) set.startDate = data.startDate;
  if (data.targetDate !== undefined) set.targetDate = data.targetDate;
  if (data.tags !== undefined) set.tags = data.tags;

  await db.update(projects).set(set).where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)));
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true as const };
}

export async function getProjectsForPickerAction(): Promise<
  { id: string; slug: string; name: string; color: string }[]
> {
  const user = await requireUser().catch(() => null);
  if (!user) return [];
  const rows = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.ownerId, user.id))
    .orderBy(projects.name);
  return rows;
}

export async function archiveProjectAction(slug: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };
  await db
    .update(projects)
    .set({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.slug, slug), eq(projects.ownerId, user.id)));
  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  return { ok: true as const };
}
