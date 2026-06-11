"use client";

import { useState, useMemo } from "react";
import { Search, Pin, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NoteListItem, type NoteListItem as NoteItem } from "@/components/notes/note-list-item";
import { cn } from "@/lib/utils";

export function NotesSearch({ notes }: { notes: NoteItem[] }) {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let result = notes;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(s) ||
          n.excerpt.toLowerCase().includes(s) ||
          n.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    if (activeTags.size > 0) {
      result = result.filter((n) =>
        Array.from(activeTags).every((t) => n.tags.includes(t))
      );
    }
    return result;
  }, [notes, search, activeTags]);

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                activeTags.has(tag)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              #{tag}
            </button>
          ))}
          {activeTags.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveTags(new Set())}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
              Clear
            </button>
          )}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Pin className="h-3 w-3" />
            Pinned
          </h2>
          <div className="space-y-2">
            {pinned.map((n) => (
              <NoteListItem key={n.id} note={n} href={`/notes/${n.slug}`} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Notes
            </h2>
          )}
          <div className="space-y-2">
            {rest.map((n) => (
              <NoteListItem key={n.id} note={n} href={`/notes/${n.slug}`} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No notes match
          {search ? ` "${search}"` : ""}
          {activeTags.size > 0
            ? ` with tags: ${Array.from(activeTags).map((t) => `#${t}`).join(", ")}`
            : ""}.
        </p>
      )}
    </div>
  );
}
