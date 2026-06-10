import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProjectBySlug } from "@/lib/db/projects";
import { ProjectSettingsForm } from "@/components/settings/project-settings-form";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Settings</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage project details and configuration.</p>
      </div>

      <ProjectSettingsForm project={project} />
    </div>
  );
}
