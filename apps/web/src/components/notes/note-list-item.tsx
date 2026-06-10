"use client";

import Link from "next/link";
import { Pin, FileText, MoreHorizontal, Trash2, Folder } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { deleteNoteAction, togglePinAction } from "@/lib/actions/notes";

export type NoteListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  projectId: string | null;
  projectName: string | null;
  pinned: boolean;
  tags: string[];
  authorName: string;
  updatedAt: string; // ISO
};

export function NoteListItem({ note, href }: { note: NoteListItem; href: string }) {
  const [isPending, startTransition] = useTransition();
  const updated = new Date(note.updatedAt);

  return (
    <Card className="group relative transition-colors hover:border-primary/40">
      <Link href={href} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{note.title}</h3>
              {note.pinned && <Pin className="h-3 w-3 fill-amber-500 text-amber-500" />}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {note.excerpt || "(empty note)"}
            </p>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              {note.projectName && (
                <span className="flex items-center gap-1">
                  <Folder className="h-2.5 w-2.5" />
                  {note.projectName}
                </span>
              )}
              <span>{note.authorName}</span>
              <span>·</span>
              <span>{timeAgo(updated)}</span>
            </div>
            {note.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="muted" className="text-[9px]">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1 bg-card/80 backdrop-blur text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Note actions"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await togglePinAction(note.id);
                });
              }}
            >
              <Pin className="h-3.5 w-3.5" />
              {note.pinned ? "Unpin" : "Pin"} note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                if (!confirm("Delete this note?")) return;
                startTransition(async () => {
                  await deleteNoteAction(note.id);
                  window.location.reload();
                });
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isPending && (
        <div className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      )}
    </Card>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
