import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProjectBySlug } from "@/lib/db/projects";
import { getFilesForProject } from "@/lib/db/project-files";
import { FilesSection } from "@/components/files/files-section";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const project = await getProjectBySlug(slug, user.id);
  if (!project) notFound();

  const files = await getFilesForProject(project.id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Files</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""} · Max 5 MB per file
        </p>
      </div>

      <FilesSection projectId={project.id} initialFiles={files} />
    </div>
  );
}
