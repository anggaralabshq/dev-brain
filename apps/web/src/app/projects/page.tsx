import { getAllProjects, getGlobalProjectStats, type ProjectWithMeta } from "@/lib/db/projects";
import { ProjectsView, type ProjectForView } from "@/components/projects/projects-view";
import { requireUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  let projects: ProjectWithMeta[] = [];
  let dbError: string | null = null;
  let stats = { totalProjects: 0, totalNotes: 0, totalTasks: 0, totalAdrs: 0, totalDiagrams: 0, totalMembers: 0 };

  try {
    [projects, stats] = await Promise.all([
      getAllProjects(user.id),
      getGlobalProjectStats(user.id),
    ]);
  } catch (err) {
    dbError = (err as Error).message;
    console.error("Failed to load projects from DB:", err);
  }

  const serialized: ProjectForView[] = projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProjectsView projects={serialized} dbError={dbError} globalStats={stats} />;
}
