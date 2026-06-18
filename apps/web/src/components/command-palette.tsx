"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderKanban, Loader2, ArrowRight, LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchNotesAction } from "@/lib/actions/notes";
import { getProjectsForPickerAction } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

type Result =
  | { type: "note"; id: string; title: string; excerpt: string; href: string; meta?: string }
  | { type: "project"; id: string; title: string; href: string; meta?: string }
  | { type: "action"; id: string; title: string; href: string; meta?: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Show default items (projects)
      startTransition(async () => {
        const projects = await getProjectsForPickerAction();
        const items: Result[] = [
          { type: "action", id: "new-note", title: "New Note", href: "/notes/new", meta: "Create" },
          { type: "action", id: "templates", title: "Browse Templates", href: "/templates", meta: "Navigate" },
          ...projects.slice(0, 5).map((p) => ({
            type: "project" as const,
            id: p.id,
            title: p.name,
            href: `/projects/${p.slug}`,
            meta: "Project",
          })),
        ];
        setResults(items);
      });
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;

    startTransition(async () => {
      const [notes, projects] = await Promise.all([
        searchNotesAction(q),
        getProjectsForPickerAction(),
      ]);

      const filteredProjects = projects.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      );

      const items: Result[] = [
        ...notes.map((n) => ({
          type: "note" as const,
          id: n.id,
          title: n.title,
          excerpt: n.excerpt,
          href: `/notes/${n.slug}`,
          meta: n.projectName ?? "Note",
        })),
        ...filteredProjects.map((p) => ({
          type: "project" as const,
          id: p.id,
          title: p.name,
          href: `/projects/${p.slug}`,
          meta: "Project",
        })),
      ];
      setResults(items);
      setActiveIndex(0);
    });
  }, [query, open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex].href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, projects… (⌘K)"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && query.trim() && !isPending && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </p>
          )}
          {!query.trim() && results.length > 0 && (
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick access
            </p>
          )}
          {query.trim() && results.length > 0 && (
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Results
            </p>
          )}
          {results.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.href)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                idx === activeIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                {item.type === "note" && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                {item.type === "project" && <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />}
                {item.type === "action" && item.id === "templates" && <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />}
                {item.type === "action" && item.id !== "templates" && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.type === "note" && item.excerpt && (
                  <p className="truncate text-[11px] text-muted-foreground">{item.excerpt}</p>
                )}
              </div>
              {item.meta && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {item.meta}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-border bg-muted px-1">↵</kbd> open</span>
          <span><kbd className="rounded border border-border bg-muted px-1">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
