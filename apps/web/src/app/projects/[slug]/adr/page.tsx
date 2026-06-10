import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { ChevronRight, Plus, FileText, CheckCircle2, Clock, XCircle, ArrowRight, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectBySlug } from "@/lib/db/projects";
import { getAdrsForProject } from "@/lib/db/adrs";
import { CreateAdrDialog } from "@/components/adrs/create-adr-dialog";
import { EmptyState } from "@/components/empty-state";

const statusBadge: Record<string, { variant: "success" | "info" | "warning" | "muted"; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  proposed: { variant: "info", icon: Clock, label: "Proposed" },
  accepted: { variant: "success", icon: CheckCircle2, label: "Accepted" },
  deprecated: { variant: "warning", icon: XCircle, label: "Deprecated" },
  superseded: { variant: "muted", icon: ArrowRight, label: "Superseded" },
};

export default async function ProjectAdrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const project = await getProjectBySlug(slug, user.id);
  if (!project) notFound();

  const adrs = await getAdrsForProject(project.id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">ADR</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Architecture Decision Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adrs.length} ADR{adrs.length !== 1 ? "s" : ""} in {project.name}. Capture important architectural decisions and their context.
          </p>
        </div>
        <CreateAdrDialog projectId={project.id} />
      </div>

      {adrs.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No ADRs yet"
          description="Architecture Decision Records document the why behind your technical choices. Start capturing decisions before they're forgotten."
          size="page"
        />
      ) : (
        <div className="space-y-2">
          {adrs.map((a) => {
            const sb = statusBadge[a.status];
            return (
              <Link
                key={a.id}
                href={`/projects/${slug}/adr/${a.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{String(a.number).padStart(3, "0")}
                        </span>
                        <h3 className="truncate text-sm font-semibold">{a.title}</h3>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {a.context || a.decision || "No description"}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{a.authorName}</span>
                        {a.decisionDate && (
                          <>
                            <span>·</span>
                            <span>{new Date(a.decisionDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={sb.variant} className="gap-1 shrink-0">
                      <sb.icon className="h-2.5 w-2.5" />
                      {sb.label}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
