import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { ChevronRight, Network } from "lucide-react";
import { getWhiteboardById } from "@/lib/db/whiteboards";
import { getProjectBySlug } from "@/lib/db/projects";
import { WhiteboardEditor } from "@/components/architecture/whiteboard-editor";

export default async function WhiteboardEditorPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const [wb, project] = await Promise.all([
    getWhiteboardById(id),
    getProjectBySlug(slug, user.id),
  ]);

  if (!wb || !project) notFound();
  if (wb.projectId !== project.id) notFound();

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}/architecture`} className="hover:text-foreground">Diagrams</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{wb.title}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Network className="h-3.5 w-3.5 text-primary" />
        <span>
          💡 <strong>Tip:</strong> Use the toolbar on the left to draw shapes.{" "}
          <strong>Right-click</strong> for context menu. <strong>Hold space</strong> to pan, <strong>scroll</strong> to zoom.
        </span>
      </div>

      <WhiteboardEditor
        whiteboardId={wb.id}
        initialData={wb.data ? JSON.stringify(wb.data) : null}
        initialTitle={wb.title}
        projectSlug={slug}
      />
    </div>
  );
}
