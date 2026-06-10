import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import {
  ChevronRight,
  LayoutDashboard,
  Network,
  FileText,
  GitBranch,
  CheckSquare,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { getProjectBySlug, getProjectStats } from "@/lib/db/projects";
import { db } from "@devbrain/db";
import { users } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const statusVariant: Record<string, "success" | "info" | "warning" | "muted"> = {
  active: "success",
  planning: "info",
  "on-hold": "warning",
  archived: "muted",
};

const projectTabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "architecture", label: "Diagrams", icon: Network },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "adr", label: "ADR", icon: GitBranch },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "meetings", label: "Meetings", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const project = await getProjectBySlug(slug, user.id);

  if (!project) {
    notFound();
  }

  // Fetch owner + real counts in parallel
  const [owner, stats] = await Promise.all([
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, project.ownerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getProjectStats(project.id),
  ]);

  const metricCards = [
    { label: "Progress", value: `${project.progress}%`, sub: project.progress >= 70 ? "On Track" : project.progress >= 40 ? "In Progress" : "Just Started", subVariant: "success" as const, type: "progress" },
    { label: "Open Tasks", value: String(stats.openTasks), sub: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "None overdue", subVariant: stats.overdueTasks > 0 ? "destructive" as const : "success" as const },
    { label: "ADRs", value: String(stats.adrCount), sub: stats.lastAdr ? `Last: ${stats.lastAdr}` : "None yet" },
    { label: "Notes", value: String(stats.noteCount), sub: "All time" },
    { label: "Members", value: String(project.members.length), sub: "On this project", subVariant: "success" as const },
    { label: "Repos", value: String(stats.repoCount), sub: stats.repoCount > 0 ? "Connected" : "Not connected" },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {projectTabs.map((t, i) => (
          <Link
            key={t.id}
            href={i === 0 ? `/projects/${slug}` : `/projects/${slug}/${t.id}`}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              i === 0
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </div>
            <div className="mt-1 text-2xl font-semibold">{m.value}</div>
            {m.type === "progress" && <Progress value={project.progress} className="mt-2" />}
            {m.sub && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {m.subVariant === "destructive" ? (
                  <span className="text-destructive">{m.sub}</span>
                ) : m.subVariant === "success" ? (
                  <span className="text-success">{m.sub}</span>
                ) : (
                  m.sub
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* About + quick links */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>About this project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {project.description || "No description yet."}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="text-[10px] font-medium uppercase text-muted-foreground">Owner</div>
                <div className="mt-0.5">
                  {owner ? owner.name : "Unknown"}
                  {owner?.email && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({owner.email})</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase text-muted-foreground">Start Date</div>
                <div className="mt-0.5">
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase text-muted-foreground">Target Date</div>
                <div className="mt-0.5">
                  {project.targetDate
                    ? new Date(project.targetDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase text-muted-foreground">Tags</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {project.tags.length > 0 ? (
                    project.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
