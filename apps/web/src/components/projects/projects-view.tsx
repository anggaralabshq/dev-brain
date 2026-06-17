"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Search, LayoutGrid, List, Filter, Activity, FileText, GitBranch, Network, CheckSquare, Users, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectsTable, type ProjectRow } from "@/components/projects/projects-table";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { EditProjectDialog, type EditProjectInput } from "@/components/projects/edit-project-dialog";
import { createProjectAction, deleteProjectAction, toggleStarAction, updateProjectAction } from "@/lib/actions/projects";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ProjectStatus = "active" | "planning" | "on-hold" | "archived";

export type ProjectForView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  color: string;
  ownerId: string;
  startDate: string | null;
  targetDate: string | null;
  starred: boolean;
  tags: string[];
  members: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
    role: "owner" | "editor" | "viewer";
  }>;
  notesCount: number;
  tasksCount: number;
  createdAt: string;
  updatedAt: string;
};

type FilterTab = "all" | "active" | "planning" | "on-hold" | "archived";
type ViewMode = "grid" | "table";

const STAT_DEFS = [
  { label: "Projects", icon: Activity,   color: "text-violet-400", key: "totalProjects" as const },
  { label: "Notes",    icon: FileText,   color: "text-emerald-400", key: "totalNotes"    as const },
  { label: "Tasks",    icon: CheckSquare,color: "text-pink-400",   key: "totalTasks"    as const },
  { label: "ADRs",     icon: GitBranch,  color: "text-orange-400", key: "totalAdrs"     as const },
  { label: "Diagrams", icon: Network,    color: "text-blue-400",   key: "totalDiagrams" as const },
  { label: "Members",  icon: Users,      color: "text-cyan-400",   key: "totalMembers"  as const },
];

type GlobalStats = {
  totalProjects: number;
  totalNotes: number;
  totalTasks: number;
  totalAdrs: number;
  totalDiagrams: number;
  totalMembers: number;
};

export function ProjectsView({
  projects: initialProjects,
  dbError,
  globalStats,
}: {
  projects: ProjectForView[];
  dbError: string | null;
  globalStats: GlobalStats;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const router = useRouter();

  const editingProject = editSlug ? projects.find((p) => p.slug === editSlug) ?? null : null;

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const stats = useMemo(() =>
    STAT_DEFS.map(s => ({ ...s, value: globalStats[s.key] ?? 0 })),
    [globalStats]
  );

  const tabs = useMemo(
    () => [
      { id: "all" as FilterTab, label: "All Projects", count: projects.length },
      {
        id: "active" as FilterTab,
        label: "Active",
        count: projects.filter((p) => p.status === "active").length,
      },
      {
        id: "planning" as FilterTab,
        label: "Planning",
        count: projects.filter((p) => p.status === "planning").length,
      },
      {
        id: "on-hold" as FilterTab,
        label: "On Hold",
        count: projects.filter((p) => p.status === "on-hold").length,
      },
      {
        id: "archived" as FilterTab,
        label: "Archived",
        count: projects.filter((p) => p.status === "archived").length,
      },
    ],
    [projects]
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = activeTab === "all" || p.status === activeTab;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [projects, activeTab, search]);

  const handleCreate = async (formData: {
    name: string;
    description: string;
    color: string;
    template: string;
    status: "planning" | "active" | "on-hold" | "archived";
  }) => {
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("color", formData.color);
    fd.append("template", formData.template);
    fd.append("status", formData.status);

    const result = await createProjectAction(fd);
    if (result.ok) {
      setActiveTab(formData.status);
      startTransition(() => {
        router.refresh();
      });
    }
    return result;
  };

  const handleEdit = async (data: EditProjectInput) => {
    if (!editSlug) return { ok: false as const, error: "No project selected" };
    const result = await updateProjectAction(editSlug, {
      name: data.name,
      description: data.description,
      status: data.status,
      color: data.color,
    });
    if (result?.ok) {
      setProjects((prev) =>
        prev.map((p) =>
          p.slug === editSlug
            ? { ...p, name: data.name, description: data.description, status: data.status, color: data.color }
            : p
        )
      );
      setActiveTab(data.status);
      startTransition(() => { router.refresh(); });
      return { ok: true as const };
    }
    return result ?? { ok: false as const, error: "Update failed" };
  };

  const handleDelete = (slug: string) => {
    setConfirmSlug(slug);
  };

  const handleToggleStar = (slug: string) => {
    startTransition(async () => {
      const result = await toggleStarAction(slug);
      if (result.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.slug === slug ? { ...p, starred: result.starred } : p))
        );
      }
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Error banner */}
      {dbError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <strong className="text-destructive">Database error:</strong>{" "}
          <span className="text-muted-foreground">{dbError}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {projects.length}
            </span>
            {isPending && (
              <span className="text-xs text-muted-foreground animate-pulse">
                syncing…
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All your projects in one place. Organize, connect, and build your knowledge base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <CreateProjectDialog onCreate={handleCreate} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className={cn("h-3.5 w-3.5", s.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
            </div>
            <div className="mt-1.5 text-xl font-semibold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-0">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === t.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  activeTab === t.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {t.count}
              </span>
              {activeTab === t.id && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>
          <div className="flex items-center rounded-md border border-border">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-l-md transition-colors",
                view === "grid"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-r-md transition-colors",
                view === "table"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
              aria-label="Table view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects are your home base — bring together tasks, notes, ADRs, diagrams, and meetings in one place."
          size="page"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No projects match"
          description={`No projects found for "${search || activeTab}". Try a different search or filter.`}
          size="card"
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onToggleStar={() => handleToggleStar(p.slug)}
              onDelete={() => handleDelete(p.slug)}
              onEdit={() => setEditSlug(p.slug)}
            />
          ))}
        </div>
      ) : (
        <ProjectsTable projects={filtered as unknown as ProjectRow[]} />
      )}

      <div className="text-center text-xs text-muted-foreground">
        Showing {filtered.length} of {projects.length} projects
      </div>

      <ConfirmDialog
        open={confirmSlug !== null}
        onOpenChange={(o) => { if (!o) setConfirmSlug(null); }}
        title="Delete project?"
        description="This cannot be undone. All tasks, notes, ADRs, and diagrams in this project will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmSlug) return;
          startTransition(async () => {
            await deleteProjectAction(confirmSlug);
            setProjects((prev) => prev.filter((p) => p.slug !== confirmSlug));
            setConfirmSlug(null);
          });
        }}
      />

      {editingProject && (
        <EditProjectDialog
          key={editSlug}
          open={editSlug !== null}
          onOpenChange={(o) => { if (!o) setEditSlug(null); }}
          project={editingProject}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
