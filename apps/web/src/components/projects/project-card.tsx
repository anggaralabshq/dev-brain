"use client";

import Link from "next/link";
import { FolderKanban, Star, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const colorMap: Record<string, { bg: string; text: string; hex: string }> = {
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", hex: "bg-violet-500" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", hex: "bg-emerald-500" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", hex: "bg-blue-500" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400", hex: "bg-orange-500" },
  pink: { bg: "bg-pink-500/15", text: "text-pink-400", hex: "bg-pink-500" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", hex: "bg-cyan-500" },
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", hex: "bg-yellow-500" },
};

const statusVariant: Record<string, "success" | "info" | "warning" | "muted"> = {
  active: "success",
  planning: "info",
  "on-hold": "warning",
  archived: "muted",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  "on-hold": "On Hold",
  archived: "Archived",
};

export type ProjectCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "active" | "planning" | "on-hold" | "archived";
  progress: number;
  color: string;
  starred: boolean;
  tags: string[];
  members: Array<{ id: string; name: string; initials: string; color: string; role: "owner" | "editor" | "viewer" }>;
  notesCount: number;
  tasksCount: number;
};

export function ProjectCard({
  project,
  onToggleStar,
  onDelete,
  onEdit,
}: {
  project: ProjectCardData;
  onToggleStar?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const c = colorMap[project.color] ?? colorMap.violet;
  const visibleMembers = project.members.slice(0, 3);
  const extraMembers = project.members.length - 3;

  return (
    <Card className="group relative cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/projects/${project.slug}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.bg)}>
              <FolderKanban className={cn("h-4 w-4", c.text)} />
            </div>
            <div className="flex items-center gap-1">
              {project.starred && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
              <Badge variant={statusVariant[project.status]} className="text-[10px]">
                {statusLabel[project.status]}
              </Badge>
            </div>
          </div>
          <CardTitle className="mt-3 text-sm">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2 text-xs">
            {project.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>📝 {project.notesCount}</span>
              <span>✓ {project.tasksCount}</span>
            </div>
            <div className="flex -space-x-1.5">
              {visibleMembers.map((m) => (
                <Avatar key={m.id} className="h-5 w-5 border-2 border-card">
                  <AvatarFallback className={cn("text-[9px] text-white", m.color)}>
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extraMembers > 0 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium">
                  +{extraMembers}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Link>

      {/* Action overlay */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1 bg-card/80 backdrop-blur text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Project actions"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onToggleStar?.(); }}>
              <Star className="h-3.5 w-3.5" />
              {project.starred ? "Unstar" : "Star"} project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit?.(); }}>
              <Pencil className="h-3.5 w-3.5" />
              Edit project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.preventDefault(); onDelete?.(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
