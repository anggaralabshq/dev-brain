"use client";

import { useState, useMemo } from "react";
import { Search, Pin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NoteListItem, type NoteListItem as NoteItem } from "@/components/notes/note-list-item";

export function NotesSearch({ notes }: { notes: NoteItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return notes;
    const s = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(s) ||
        n.excerpt.toLowerCase().includes(s) ||
        n.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [notes, search]);

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

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
          No notes match &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}
