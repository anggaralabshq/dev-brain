import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { ChevronRight, Network, Plus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectBySlug } from "@/lib/db/projects";
import { getWhiteboardsForProject } from "@/lib/db/whiteboards";
import { CreateWhiteboardButton } from "@/components/architecture/create-whiteboard-button";
import { EmptyState } from "@/components/empty-state";

export default async function ProjectDiagramsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const project = await getProjectBySlug(slug, user.id);
  if (!project) notFound();

  const diagrams = await getWhiteboardsForProject(project.id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Diagrams</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diagrams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""} in {project.name}.
            Drag, draw, and link components.
          </p>
        </div>
        <CreateWhiteboardButton projectId={project.id} />
      </div>

      {diagrams.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No diagrams yet"
          description="Visualize your system architecture with interactive diagrams. Drag components, draw connections, and document your design."
          size="page"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {diagrams.map((d) => (
            <Link
              key={d.id}
              href={`/projects/${slug}/architecture/${d.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Network className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{d.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {d.description || "No description"}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{d.authorName}</span>
                        <span>·</span>
                        <span>Updated {new Date(d.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
