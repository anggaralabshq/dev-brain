"use client";

import Link from "next/link";
import { MoreHorizontal, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "planning" | "on-hold" | "archived";
  progress: number;
  color: string;
  starred: boolean;
  startDate: string | null;
  members: Array<{ id: string; name: string; initials: string; color: string; role: "owner" | "editor" | "viewer" }>;
};

const statusVariant: Record<string, "success" | "info" | "warning" | "muted"> = {
  active: "success",
  planning: "info",
  "on-hold": "warning",
  archived: "muted",
};

const colorMap: Record<string, string> = {
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
  yellow: "bg-yellow-500",
};

export function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No projects in this view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Project</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Last Updated</th>
            <th className="px-3 py-2.5 font-medium">Members</th>
            <th className="px-3 py-2.5 font-medium">Progress</th>
            <th className="w-10 px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/30"
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/projects/${p.slug}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <div className={cn("h-2 w-2 rounded-sm", colorMap[p.color])} />
                  <span className="font-medium">{p.name}</span>
                  {p.starred && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={statusVariant[p.status]} className="capitalize">
                  {p.status.replace("-", " ")}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {p.startDate
                  ? new Date(p.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex -space-x-1.5">
                  {p.members.slice(0, 4).map((m) => (
                    <Avatar key={m.id} className="h-6 w-6 border-2 border-card">
                      <AvatarFallback className={cn("text-[9px] text-white", m.color)}>
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {p.members.length > 4 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium">
                      +{p.members.length - 4}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Progress value={p.progress} className="h-1.5 w-24" />
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
