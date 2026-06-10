"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  Brain,
  Home,
  FolderKanban,
  Settings,
  Plus,
  StickyNote,
  SquarePen,
  ScrollText,
  CheckSquare,
  Calendar,
  Timer,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuickCreateDialog } from "@/components/quick-create-dialog";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { createProjectAction } from "@/lib/actions/projects";

const STORAGE_KEY = "devbrain:sidebar:collapsed";

const COLOR_BG: Record<string, string> = {
  violet: "bg-violet-500", emerald: "bg-emerald-500", blue: "bg-blue-500",
  orange: "bg-orange-500", pink: "bg-pink-500", cyan: "bg-cyan-500", yellow: "bg-yellow-500",
};

type CreateType = "note" | "whiteboard" | "adr" | "task" | "meeting";
type StarredProject = { slug: string; name: string; color: string };

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const mainNav: NavItem[] = [
  { label: "Home",      href: "/",          icon: Home },
  { label: "Projects",  href: "/projects",  icon: FolderKanban, badge: 7 },
  { label: "Focus",     href: "/focus",     icon: Timer },
  { label: "Settings",  href: "/settings",  icon: Settings },
];


interface QuickCreateItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: CreateType;
}

const quickCreate: QuickCreateItem[] = [
  { label: "New Note",       icon: StickyNote,  action: "note" },
  { label: "New Diagram",    icon: SquarePen,   action: "whiteboard" },
  { label: "New ADR",        icon: ScrollText,  action: "adr" },
  { label: "New Task",       icon: CheckSquare, action: "task" },
  { label: "New Meeting",    icon: Calendar,    action: "meeting" },
];

type SidebarUser = { name: string; email: string; id?: string } | null;

function NavBtn({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const inner = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-md px-2.5 py-1.5 text-sm transition-colors",
        collapsed ? "justify-center" : "gap-2.5",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span className={cn(
              "rounded-md px-1.5 text-[10px] font-semibold",
              isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (!collapsed) return inner;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {item.label}
        {item.badge !== undefined && (
          <span className="ml-1.5 rounded bg-muted px-1 text-[10px]">{item.badge}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar({
  user: _user,
  starredProjects = [],
}: {
  user?: SidebarUser;
  starredProjects?: StarredProject[];
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<CreateType | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, String(!c));
      return !c;
    });
  }

  function handleQuickCreate(action: CreateType) {
    setPickerType(action);
    setPickerOpen(true);
  }

  async function handleCreateProject(formData: {
    name: string; description: string; color: string; template: string;
  }) {
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("color", formData.color);
    fd.append("template", formData.template);
    const result = await createProjectAction(fd);
    if (result.ok) {
      startTransition(() => { router.refresh(); });
    }
    return result;
  }

  // Avoid layout shift: render expanded until mounted
  const isCollapsed = mounted && collapsed;

  return (
    <TooltipProvider delayDuration={200}>
      <aside className={cn(
        "flex h-screen flex-col border-r border-border bg-card/40 transition-all duration-200",
        isCollapsed ? "w-14" : "w-60"
      )}>

        {/* Logo */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-4",
          isCollapsed && "justify-center px-0"
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight overflow-hidden">
              <div className="text-sm font-semibold text-foreground">DevBrain</div>
              <div className="text-[10px] text-muted-foreground">Second Brain for Developers</div>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2">
          <ul className="space-y-0.5">
            {mainNav.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <NavBtn item={item} collapsed={isCollapsed} isActive={isActive} />
                </li>
              );
            })}
          </ul>

          <Separator className="my-4" />

          {/* Starred projects */}
          {!isCollapsed && (
            <div className="px-2.5 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Starred Projects
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateProjectOpen(true)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="New project"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          {starredProjects.length > 0 ? (
            <ul className="space-y-0.5">
              {starredProjects.map((p) => {
                const dotColor = COLOR_BG[p.color] ?? "bg-muted";
                const inner = (
                  <Link href={`/projects/${p.slug}`}
                    className={cn(
                      "flex items-center rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                      isCollapsed && "justify-center"
                    )}>
                    <div className={cn("h-2 w-2 shrink-0 rounded-sm", dotColor)} />
                    {!isCollapsed && <span className="ml-2.5 truncate">{p.name}</span>}
                  </Link>
                );
                return (
                  <li key={p.slug}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{inner}</TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">{p.name}</TooltipContent>
                      </Tooltip>
                    ) : inner}
                  </li>
                );
              })}
            </ul>
          ) : !isCollapsed ? (
            <p className="px-2.5 pb-1 text-[10px] text-muted-foreground/60">
              No starred projects yet.
            </p>
          ) : null}

          {!isCollapsed && (
            <>
              <Separator className="my-4" />
              <div className="px-2.5 pb-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Create
                </h3>
              </div>
              <ul className="space-y-0.5 pb-3">
                {quickCreate.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => handleQuickCreate(item.action)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className={cn("border-t border-border p-2", isCollapsed && "flex justify-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={toggle}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                  isCollapsed && "justify-center px-1.5"
                )}>
                {isCollapsed
                  ? <ChevronsRight className="h-4 w-4" />
                  : <><ChevronsLeft className="h-4 w-4" /><span>Collapse</span></>
                }
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="text-xs">Expand sidebar</TooltipContent>
            )}
          </Tooltip>
        </div>

      </aside>

      <QuickCreateDialog
        open={pickerOpen}
        type={pickerType}
        onClose={() => setPickerOpen(false)}
      />
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onCreate={handleCreateProject}
      />
    </TooltipProvider>
  );
}
