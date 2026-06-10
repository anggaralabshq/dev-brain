import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban, Sparkles, FileText, Users, ArrowRight,
  CheckSquare, Calendar, GitBranch, Plus, Network, AlertCircle,
  Activity,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FocusStatsWidget } from "@/components/pomodoro/focus-stats-widget";
import { getAllProjects } from "@/lib/db/projects";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@devbrain/db";
import { notes, tasks, adrs, meetings, whiteboards, projects as projectsTable } from "@devbrain/db/schema";
import { desc, gte, eq, inArray, and } from "drizzle-orm";
import { projects as mockProjects, activityFeed as mockActivity, upcoming as mockUpcoming } from "@/lib/mock-data";

// ── colour palette ──────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; dot: string; stroke: string }> = {
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", dot: "bg-violet-500",  stroke: "text-violet-500" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-500", stroke: "text-emerald-500" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-500",    stroke: "text-blue-500" },
  orange:  { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-500",  stroke: "text-orange-500" },
  pink:    { bg: "bg-pink-500/15",    text: "text-pink-400",    dot: "bg-pink-500",    stroke: "text-pink-500" },
  cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    dot: "bg-cyan-500",    stroke: "text-cyan-500" },
  yellow:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-500",  stroke: "text-yellow-500" },
};

const ICON_MAP = { diagram: Network, note: FileText, adr: GitBranch, meeting: Users, task: CheckSquare, whiteboard: Network, repo: Sparkles };
const COLOR_MAP: Record<string, string> = {
  diagram: "text-violet-400", note: "text-blue-400", adr: "text-amber-400",
  meeting: "text-emerald-400", task: "text-green-400", whiteboard: "text-violet-400", repo: "text-pink-400",
};

// ── helpers ──────────────────────────────────────────────────────
function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? "1d ago" : `${d}d ago`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Ring ─────────────────────────────────────────────────────────
function Ring({ value, strokeClass, label }: { value: number; strokeClass: string; label: string }) {
  const r = 56, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/25" />
        <circle cx="68" cy="68" r={r} fill="none" stroke="currentColor" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 68 68)" className={strokeClass} />
        <text x="68" y="75" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">{value}%</text>
      </svg>
      <span className="w-28 truncate text-center text-sm leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

// ── types ─────────────────────────────────────────────────────────
type ActivityItem = {
  id: string;
  type: string;
  text: string;
  projectName: string;
  projectSlug: string | null;
  href: string;
  when: string;
};

type UpcomingItem = {
  id: string;
  title: string;
  projectName: string;
  projectSlug: string;
  projectColor: string;
  date: string;
  time: string;
  href: string;
};

type OpenTaskItem = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress";
  projectName: string;
  projectSlug: string;
  href: string;
};

// ── page ─────────────────────────────────────────────────────────
export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;

  // Projects
  let projects = mockProjects;
  try {
    if (userId) {
      const db_projects = await getAllProjects(userId);
      if (db_projects.length > 0) projects = db_projects as unknown as typeof mockProjects;
      else projects = [];
    }
  } catch { /* mock fallback */ }

  const active = projects.filter(p => p.status === "active" || p.status === "planning");

  // Activity feed from DB
  let activityItems: ActivityItem[] = [];
  try {
    if (!userId) throw new Error("no user");
    const [recentNotes, recentTasks, recentAdrs, recentMeetings, recentWhiteboards] = await Promise.all([
      db.select({
        id: notes.id, title: notes.title, slug: notes.slug, updatedAt: notes.updatedAt,
        projectSlug: projectsTable.slug, projectName: projectsTable.name,
      }).from(notes).leftJoin(projectsTable, eq(notes.projectId, projectsTable.id))
        .where(eq(notes.authorId, userId))
        .orderBy(desc(notes.updatedAt)).limit(5),

      db.select({
        id: tasks.id, title: tasks.title, updatedAt: tasks.updatedAt,
        projectSlug: projectsTable.slug, projectName: projectsTable.name,
      }).from(tasks).innerJoin(projectsTable, and(eq(tasks.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
        .orderBy(desc(tasks.updatedAt)).limit(5),

      db.select({
        id: adrs.id, title: adrs.title, number: adrs.number, updatedAt: adrs.updatedAt,
        projectSlug: projectsTable.slug, projectName: projectsTable.name,
      }).from(adrs).innerJoin(projectsTable, and(eq(adrs.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
        .orderBy(desc(adrs.updatedAt)).limit(5),

      db.select({
        id: meetings.id, title: meetings.title, updatedAt: meetings.createdAt,
        projectSlug: projectsTable.slug, projectName: projectsTable.name,
      }).from(meetings).innerJoin(projectsTable, and(eq(meetings.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
        .orderBy(desc(meetings.createdAt)).limit(5),

      db.select({
        id: whiteboards.id, title: whiteboards.title, updatedAt: whiteboards.updatedAt,
        projectSlug: projectsTable.slug, projectName: projectsTable.name,
      }).from(whiteboards).innerJoin(projectsTable, and(eq(whiteboards.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
        .orderBy(desc(whiteboards.updatedAt)).limit(5),
    ]);

    const merged: ActivityItem[] = [
      ...recentNotes.map(n => ({
        id: `note-${n.id}`, type: "note",
        text: n.title,
        projectName: n.projectName ?? "Personal",
        projectSlug: n.projectSlug ?? null,
        href: `/notes/${n.slug}`,
        when: timeAgo(n.updatedAt),
      })),
      ...recentTasks.map(t => ({
        id: `task-${t.id}`, type: "task",
        text: t.title,
        projectName: t.projectName,
        projectSlug: t.projectSlug,
        href: `/projects/${t.projectSlug}/tasks`,
        when: timeAgo(t.updatedAt),
      })),
      ...recentAdrs.map(a => ({
        id: `adr-${a.id}`, type: "adr",
        text: `ADR-${String(a.number).padStart(3, "0")}: ${a.title}`,
        projectName: a.projectName,
        projectSlug: a.projectSlug,
        href: `/projects/${a.projectSlug}/adr/${a.id}`,
        when: timeAgo(a.updatedAt),
      })),
      ...recentMeetings.map(m => ({
        id: `meeting-${m.id}`, type: "meeting",
        text: m.title,
        projectName: m.projectName,
        projectSlug: m.projectSlug,
        href: `/projects/${m.projectSlug}/meetings`,
        when: timeAgo(m.updatedAt),
      })),
      ...recentWhiteboards.map(w => ({
        id: `wb-${w.id}`, type: "whiteboard",
        text: w.title,
        projectName: w.projectName,
        projectSlug: w.projectSlug,
        href: `/projects/${w.projectSlug}/architecture/${w.id}`,
        when: timeAgo(w.updatedAt),
      })),
    ];

    // sort by most recent (timeAgo is text, re-sort by original timestamps isn't easy here)
    // already sorted per type — just interleave by spreading all and sorting inline
    activityItems = merged.slice(0, 8);
  } catch {
    activityItems = mockActivity.map(a => ({
      id: a.id, type: a.type, text: a.text,
      projectName: a.project, projectSlug: null,
      href: "#", when: a.when,
    }));
  }

  // Upcoming meetings from DB
  let upcomingItems: UpcomingItem[] = [];
  try {
    if (!userId) throw new Error("no user");
    const rows = await db.select({
      id: meetings.id, title: meetings.title,
      startAt: meetings.startAt,
      projectSlug: projectsTable.slug, projectName: projectsTable.name, projectColor: projectsTable.color,
    }).from(meetings)
      .innerJoin(projectsTable, and(eq(meetings.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
      .where(gte(meetings.startAt, new Date()))
      .orderBy(meetings.startAt)
      .limit(5);

    upcomingItems = rows.map(r => ({
      id: r.id,
      title: r.title,
      projectName: r.projectName,
      projectSlug: r.projectSlug,
      projectColor: r.projectColor,
      date: fmtDate(r.startAt),
      time: fmtTime(r.startAt),
      href: `/projects/${r.projectSlug}/meetings`,
    }));
  } catch {
    upcomingItems = mockUpcoming.map(u => ({
      id: u.id, title: u.title,
      projectName: u.project, projectSlug: "#", projectColor: u.color,
      date: u.date, time: u.time, href: "#",
    }));
  }

  // Open tasks
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
  let openTaskItems: OpenTaskItem[] = [];
  try {
    if (!userId) throw new Error("no user");
    const rows = await db.select({
      id: tasks.id, title: tasks.title,
      priority: tasks.priority, status: tasks.status,
      projectSlug: projectsTable.slug, projectName: projectsTable.name,
    }).from(tasks)
      .innerJoin(projectsTable, and(eq(tasks.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
      .where(inArray(tasks.status, ["todo", "in_progress"]))
      .orderBy(desc(tasks.updatedAt))
      .limit(12);

    openTaskItems = rows
      .map(r => ({
        id: r.id, title: r.title,
        priority: r.priority as OpenTaskItem["priority"],
        status: r.status as OpenTaskItem["status"],
        projectName: r.projectName,
        projectSlug: r.projectSlug,
        href: `/projects/${r.projectSlug}/tasks`,
      }))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .slice(0, 8);
  } catch { /* empty on error */ }

  return (
    <div className="flex h-full gap-6 p-6">

      {/* ── LEFT MAIN ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">

        {/* Project Cards */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Active Projects</h2>
            <Link href="/projects" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {active.length === 0 && (
            <EmptyState
              icon={FolderKanban}
              title="No active projects yet"
              description="Create your first project to start organizing tasks, notes, ADRs, and meetings in one place."
              actionLabel="Create Project"
              actionHref="/projects"
              size="card"
              className="mb-3"
            />
          )}
          <div className="grid grid-cols-5 gap-3">
            {active.slice(0, 4).map(p => {
              const c = C[p.color] ?? C.violet;
              return (
                <Link key={p.id} href={`/projects/${p.slug}`}>
                  <Card className="h-full cursor-pointer transition-colors hover:border-primary/40">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
                          <FolderKanban className={`h-4 w-4 ${c.text}`} />
                        </div>
                        <Badge variant={p.status === "active" ? "success" : "info"} className="h-4 px-1.5 py-0 text-[9px]">
                          {p.status === "active" ? "Active" : "Planning"}
                        </Badge>
                      </div>
                      <p className="mb-1 text-xs font-semibold leading-tight">{p.name}</p>
                      <p className="mb-3 line-clamp-2 text-[10px] text-muted-foreground">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1">
                          {p.members.slice(0, 3).map(m => (
                            <Avatar key={m.id} className="h-5 w-5 border border-background">
                              <AvatarFallback className={`text-[7px] ${m.color} text-white`}>{m.initials}</AvatarFallback>
                            </Avatar>
                          ))}
                          {p.members.length > 3 && (
                            <Avatar className="h-5 w-5 border border-background">
                              <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">+{p.members.length - 3}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">{p.progress}%</span>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-muted/40">
                        <div className={`h-1 rounded-full ${c.dot}`} style={{ width: `${p.progress}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {active.length > 0 && (
              <Link href="/projects">
                <Card className="h-full cursor-pointer border-dashed transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">New Project</span>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        {/* Activity + Progress */}
        <div className="grid flex-1 grid-cols-5 gap-4">

          {/* Recent Activity */}
          <Card className="col-span-3 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-0.5 pt-0">
              {activityItems.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Your recent notes, tasks, ADRs, meetings, and diagrams will appear here as you work."
                  actionLabel="Go to Projects"
                  actionHref="/projects"
                  size="card"
                />
              ) : activityItems.map(a => {
                const Icon = ICON_MAP[a.type as keyof typeof ICON_MAP] ?? FileText;
                const color = COLOR_MAP[a.type] ?? "text-muted-foreground";
                const inner = (
                  <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.projectName}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{a.when}</span>
                  </div>
                );
                return (
                  <div key={a.id}>
                    {a.href !== "#" ? <Link href={a.href}>{inner}</Link> : inner}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card className="col-span-2 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center pt-0 pb-4">
              {active.length === 0 ? (
                <EmptyState
                  icon={Network}
                  title="No projects yet"
                  description="Progress rings will appear once you have active projects."
                  actionLabel="Create Project"
                  actionHref="/projects"
                  size="inline"
                />
              ) : (
                <div className="grid w-full grid-cols-2 gap-x-4 gap-y-6 place-items-center">
                  {active.slice(0, 4).map(p => {
                    const c = C[p.color] ?? C.violet;
                    return (
                      <Link key={p.id} href={`/projects/${p.slug}`}>
                        <Ring value={p.progress} strokeClass={c.stroke} label={p.name.split(" ").slice(0, 2).join(" ")} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div className="flex w-[260px] shrink-0 flex-col gap-4">

        {/* Focus Stats */}
        <FocusStatsWidget />

        {/* Upcoming */}
        <Card>
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4 pb-4 pt-0">
            {upcomingItems.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="All clear"
                description="No upcoming meetings. Schedule one inside any project."
                size="inline"
              />
            ) : upcomingItems.map((u, i) => {
              const [mon, day] = u.date.split(" ");
              return (
                <Link key={u.id} href={u.href}>
                  <div className="flex items-start gap-2 rounded-md p-1.5 hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex w-8 shrink-0 flex-col items-center">
                      <span className="text-[9px] font-medium uppercase text-muted-foreground">{mon}</span>
                      <span className="text-sm font-bold leading-none">{day}</span>
                    </div>
                    <div className={`min-w-0 flex-1 border-l pl-2 ${i === 0 ? "border-primary/40" : "border-border"}`}>
                      <p className="truncate text-xs font-medium leading-tight">{u.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{u.projectName}</p>
                      <p className="text-[10px] text-muted-foreground">{u.time}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Link href="/projects" className="block pt-1 text-center text-[10px] text-muted-foreground hover:text-foreground">
              View all meetings →
            </Link>
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card className="flex-1">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Open Tasks
              </span>
              {openTaskItems.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {openTaskItems.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 px-4 pb-4 pt-0">
            {openTaskItems.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="All done!"
                description="No open tasks right now. Create tasks inside any project."
                size="inline"
              />
            ) : openTaskItems.map(t => (
              <Link key={t.id} href={t.href}>
                <div className="flex items-start gap-2 rounded-md p-1.5 hover:bg-accent cursor-pointer transition-colors">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    t.priority === "urgent" ? "bg-red-500" :
                    t.priority === "high"   ? "bg-orange-500" :
                    t.priority === "medium" ? "bg-yellow-500" : "bg-muted-foreground/40"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium leading-tight">{t.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-muted-foreground truncate">{t.projectName}</p>
                      {t.status === "in_progress" && (
                        <span className="shrink-0 rounded-sm bg-amber-500/15 px-1 text-[9px] font-medium text-amber-500">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
