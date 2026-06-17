import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban, Sparkles, FileText, Users, ArrowRight,
  CheckSquare, Calendar, GitBranch, Plus, Network, AlertCircle,
  Activity, Flame, Timer, Target, Clock,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getAllProjects } from "@/lib/db/projects";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPomodoroStats } from "@/lib/db/pomodoro";
import { db } from "@devbrain/db";
import { notes, tasks, adrs, meetings, whiteboards, projects as projectsTable } from "@devbrain/db/schema";
import { desc, gte, lte, lt, eq, and, or } from "drizzle-orm";

// ── colour palette ──────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; dot: string; stroke: string }> = {
  violet:  { bg: "bg-violet-500/15",  text: "text-violet-400",  dot: "bg-violet-500",  stroke: "text-violet-500" },
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

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-muted-foreground/40",
};
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ── helpers ──────────────────────────────────────────────────────
function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
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

function todayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  _ts: number;
};

type MeetingItem = {
  id: string;
  title: string;
  projectName: string;
  projectSlug: string;
  projectColor: string;
  date: string;
  time: string;
  href: string;
  isToday: boolean;
};

type FocusTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress";
  projectName: string;
  projectSlug: string;
  dueDate: string | null;
  isOverdue: boolean;
  href: string;
};

// ── page ─────────────────────────────────────────────────────────
export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;
  const userName = currentUser?.name?.split(" ")[0] ?? "there";

  const { start: todayStart, end: todayEnd } = todayBounds();
  const todayStr = todayDateStr();

  // ── parallel fetch ────────────────────────────────────────────
  const [
    dbProjects,
    pomodoroStats,
    activityRows,
    meetingRows,
    focusTaskRows,
  ] = await Promise.all([
    userId ? getAllProjects(userId).catch(() => []) : Promise.resolve([]),
    userId ? getPomodoroStats(userId).catch(() => null) : Promise.resolve(null),

    // Activity feed — fetch with timestamps for correct sort
    userId ? (async () => {
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
        }).from(tasks)
          .innerJoin(projectsTable, and(eq(tasks.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
          .orderBy(desc(tasks.updatedAt)).limit(5),

        db.select({
          id: adrs.id, title: adrs.title, number: adrs.number, updatedAt: adrs.updatedAt,
          projectSlug: projectsTable.slug, projectName: projectsTable.name,
        }).from(adrs)
          .innerJoin(projectsTable, and(eq(adrs.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
          .orderBy(desc(adrs.updatedAt)).limit(5),

        db.select({
          id: meetings.id, title: meetings.title, updatedAt: meetings.createdAt,
          projectSlug: projectsTable.slug, projectName: projectsTable.name,
        }).from(meetings)
          .innerJoin(projectsTable, and(eq(meetings.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
          .orderBy(desc(meetings.createdAt)).limit(5),

        db.select({
          id: whiteboards.id, title: whiteboards.title, updatedAt: whiteboards.updatedAt,
          projectSlug: projectsTable.slug, projectName: projectsTable.name,
        }).from(whiteboards)
          .innerJoin(projectsTable, and(eq(whiteboards.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
          .orderBy(desc(whiteboards.updatedAt)).limit(5),
      ]);
      return { recentNotes, recentTasks, recentAdrs, recentMeetings, recentWhiteboards };
    })().catch(() => null) : Promise.resolve(null),

    // Meetings: today + next 14 days
    userId ? db.select({
      id: meetings.id, title: meetings.title, startAt: meetings.startAt,
      projectSlug: projectsTable.slug, projectName: projectsTable.name, projectColor: projectsTable.color,
    }).from(meetings)
      .innerJoin(projectsTable, and(eq(meetings.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
      .where(and(
        gte(meetings.startAt, todayStart),
        lt(meetings.startAt, new Date(Date.now() + 14 * 86400000)),
      ))
      .orderBy(meetings.startAt)
      .limit(8)
      .catch(() => []) : Promise.resolve([]),

    // Focus tasks: in_progress OR (todo + due/overdue)
    userId ? db.select({
      id: tasks.id, title: tasks.title,
      priority: tasks.priority, status: tasks.status,
      dueDate: tasks.dueDate,
      projectSlug: projectsTable.slug, projectName: projectsTable.name,
    }).from(tasks)
      .innerJoin(projectsTable, and(eq(tasks.projectId, projectsTable.id), eq(projectsTable.ownerId, userId)))
      .where(or(
        eq(tasks.status, "in_progress"),
        and(eq(tasks.status, "todo"), lte(tasks.dueDate, todayStr)),
      ))
      .orderBy(desc(tasks.updatedAt))
      .limit(20)
      .catch(() => []) : Promise.resolve([]),
  ]);

  // ── process data ──────────────────────────────────────────────
  const active = dbProjects.filter(p => p.status === "active" || p.status === "planning");

  // Activity feed — merge and sort by timestamp desc
  let activityItems: ActivityItem[] = [];
  if (activityRows) {
    const { recentNotes, recentTasks, recentAdrs, recentMeetings, recentWhiteboards } = activityRows;
    const merged: ActivityItem[] = [
      ...recentNotes.map(n => ({
        id: `note-${n.id}`, type: "note", text: n.title,
        projectName: n.projectName ?? "Personal", projectSlug: n.projectSlug ?? null,
        href: `/notes/${n.slug}`, when: timeAgo(n.updatedAt), _ts: n.updatedAt.getTime(),
      })),
      ...recentTasks.map(t => ({
        id: `task-${t.id}`, type: "task", text: t.title,
        projectName: t.projectName, projectSlug: t.projectSlug,
        href: `/projects/${t.projectSlug}/tasks`, when: timeAgo(t.updatedAt), _ts: t.updatedAt.getTime(),
      })),
      ...recentAdrs.map(a => ({
        id: `adr-${a.id}`, type: "adr", text: `ADR-${String(a.number).padStart(3, "0")}: ${a.title}`,
        projectName: a.projectName, projectSlug: a.projectSlug,
        href: `/projects/${a.projectSlug}/adr/${a.id}`, when: timeAgo(a.updatedAt), _ts: a.updatedAt.getTime(),
      })),
      ...recentMeetings.map(m => ({
        id: `meeting-${m.id}`, type: "meeting", text: m.title,
        projectName: m.projectName, projectSlug: m.projectSlug,
        href: `/projects/${m.projectSlug}/meetings`, when: timeAgo(m.updatedAt), _ts: m.updatedAt.getTime(),
      })),
      ...recentWhiteboards.map(w => ({
        id: `wb-${w.id}`, type: "whiteboard", text: w.title,
        projectName: w.projectName, projectSlug: w.projectSlug,
        href: `/projects/${w.projectSlug}/architecture/${w.id}`, when: timeAgo(w.updatedAt), _ts: w.updatedAt.getTime(),
      })),
    ];
    activityItems = merged.sort((a, b) => b._ts - a._ts).slice(0, 8);
  }

  // Meetings split: today vs upcoming
  const todayMeetings: MeetingItem[] = [];
  const upcomingMeetings: MeetingItem[] = [];
  for (const r of meetingRows) {
    const isToday = r.startAt >= todayStart && r.startAt < todayEnd;
    const item: MeetingItem = {
      id: r.id, title: r.title,
      projectName: r.projectName, projectSlug: r.projectSlug, projectColor: r.projectColor,
      date: fmtDate(r.startAt), time: fmtTime(r.startAt),
      href: `/projects/${r.projectSlug}/meetings`,
      isToday,
    };
    if (isToday) todayMeetings.push(item);
    else upcomingMeetings.push(item);
  }

  // Focus tasks
  const focusTasks: FocusTask[] = (focusTaskRows as typeof focusTaskRows)
    .map(r => ({
      id: r.id, title: r.title,
      priority: r.priority as FocusTask["priority"],
      status: r.status as FocusTask["status"],
      dueDate: r.dueDate,
      projectName: r.projectName, projectSlug: r.projectSlug,
      isOverdue: r.status === "todo" && !!r.dueDate && r.dueDate < todayStr,
      href: `/projects/${r.projectSlug}/tasks`,
    }))
    .sort((a, b) => {
      // in_progress first, then by priority
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    })
    .slice(0, 8);

  // Quick stats for banner
  const todayMeetingCount = todayMeetings.length;
  const dueTodayCount = focusTaskRows.filter(t => t.dueDate === todayStr && t.status === "todo").length;
  const inProgressCount = focusTaskRows.filter(t => t.status === "in_progress").length;
  const streak = pomodoroStats?.currentStreak ?? 0;
  const todaySessions = pomodoroStats?.todayCount ?? 0;
  const dailyGoal = 8;
  const focusPct = Math.min(100, Math.round((todaySessions / dailyGoal) * 100));

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="flex h-full flex-col gap-4 p-6">

      {/* ── GREETING BANNER ─────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
        <div>
          <h1 className="text-base font-semibold">{greetingWord()}, {userName} 👋</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">{inProgressCount} in progress</span>
            </div>
          )}
          {dueTodayCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">{dueTodayCount} due today</span>
            </div>
          )}
          {todayMeetingCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{todayMeetingCount} meeting{todayMeetingCount > 1 ? "s" : ""} today</span>
            </div>
          )}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">{streak}d streak</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-6">

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
                          <span className="text-[10px] font-medium text-muted-foreground">{p.progress ?? 0}%</span>
                        </div>
                        <div className="mt-2 h-1 w-full rounded-full bg-muted/40">
                          <div className={`h-1 rounded-full ${c.dot}`} style={{ width: `${p.progress ?? 0}%` }} />
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
                    description="Your recent notes, tasks, ADRs, meetings, and diagrams will appear here."
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
                    description="Progress rings appear once you have active projects."
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
                          <Ring value={p.progress ?? 0} strokeClass={c.stroke} label={p.name.split(" ").slice(0, 2).join(" ")} />
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

          {/* Focus Today — server-rendered */}
          <Card>
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-base">🍅</span>
                Focus Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {todaySessions} / {dailyGoal} sessions
                  </span>
                  <span className="text-[11px] font-semibold text-primary">{focusPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${focusPct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-2">
                  <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Streak</p>
                    <p className="text-sm font-bold leading-none">{streak}d</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-2">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Goal</p>
                    <p className="text-sm font-bold leading-none">{dailyGoal} sess.</p>
                  </div>
                </div>
              </div>
              {pomodoroStats?.topTask && pomodoroStats.topTask.sessionCount > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-2">
                  <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Top task</p>
                    <p className="truncate text-xs font-medium">{pomodoroStats.topTask.title}</p>
                    <p className="text-[10px] text-muted-foreground">{pomodoroStats.topTask.sessionCount} sessions</p>
                  </div>
                </div>
              )}
              {todaySessions === 0 && (
                <p className="text-center text-[11px] text-muted-foreground">No sessions yet. Start focusing!</p>
              )}
            </CardContent>
          </Card>

          {/* Today's Meetings */}
          {todayMeetings.length > 0 && (
            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  Today&apos;s Meetings
                  <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    {todayMeetings.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-4 pb-4 pt-0">
                {todayMeetings.map((m, i) => (
                  <Link key={m.id} href={m.href}>
                    <div className="flex items-start gap-2 rounded-md p-1.5 hover:bg-accent cursor-pointer transition-colors">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium leading-tight">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground">{m.time} · {m.projectName}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4 pt-0">
              {upcomingMeetings.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="All clear ahead"
                  description="No upcoming meetings scheduled."
                  size="inline"
                />
              ) : upcomingMeetings.slice(0, 4).map((u, i) => {
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
            </CardContent>
          </Card>

          {/* Today's Focus Tasks */}
          <Card className="flex-1">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Today&apos;s Focus
                </span>
                {focusTasks.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {focusTasks.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 px-4 pb-4 pt-0">
              {focusTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="All clear!"
                  description="No in-progress or due tasks. Great work!"
                  size="inline"
                />
              ) : focusTasks.map(t => (
                <Link key={t.id} href={t.href}>
                  <div className="flex items-start gap-2 rounded-md p-1.5 hover:bg-accent cursor-pointer transition-colors">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium leading-tight">{t.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <p className="text-[10px] text-muted-foreground truncate">{t.projectName}</p>
                        {t.status === "in_progress" && (
                          <span className="shrink-0 rounded-sm bg-blue-500/15 px-1 text-[9px] font-medium text-blue-400">
                            In Progress
                          </span>
                        )}
                        {t.isOverdue && (
                          <span className="shrink-0 rounded-sm bg-red-500/15 px-1 text-[9px] font-medium text-red-400">
                            Overdue
                          </span>
                        )}
                        {t.dueDate === todayStr && !t.isOverdue && (
                          <span className="shrink-0 rounded-sm bg-amber-500/15 px-1 text-[9px] font-medium text-amber-400">
                            Due today
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
    </div>
  );
}
