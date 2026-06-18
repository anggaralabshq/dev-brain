"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, FolderKanban, GitBranch, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearchAction, type SearchResult, type SearchResultType } from "@/lib/actions/search";

const TYPE_META: Record<SearchResultType, { icon: typeof Search; label: string; color: string }> = {
  note:    { icon: FileText,     label: "Note",    color: "text-blue-400" },
  task:    { icon: CheckSquare,  label: "Task",    color: "text-emerald-400" },
  project: { icon: FolderKanban, label: "Project", color: "text-violet-400" },
  adr:     { icon: GitBranch,    label: "ADR",     color: "text-amber-400" },
};

const QUICK_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Notes",    href: "/notes" },
  { label: "Focus",    href: "/focus" },
  { label: "Learn",    href: "/learn" },
  { label: "Settings", href: "/settings" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("devbrain:search:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devbrain:search:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearchAction(q);
        setResults(res);
        setActive(0);
      });
    }, 250);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === "Enter" && results[active]) {
      navigate(results[active].href);
    }
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          {isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, tasks, projects, ADRs…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => {
              const { icon: Icon, label, color } = TYPE_META[r.type];
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate(r.href)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent",
                      i === active && "bg-accent"
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted">
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !isPending ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className="px-4 py-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick navigate
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => navigate(l.href)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2">
          {(
            [["↑↓", "navigate"], ["↵", "open"], ["Esc", "close"]] as const
          ).map(([key, hint]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">{key}</kbd>
              {hint}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
            {" "}or{" "}
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">/</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
