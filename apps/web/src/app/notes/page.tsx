import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNotes } from "@/lib/db/notes";
import { type NoteListItem as NoteItem } from "@/components/notes/note-list-item";
import { NotesSearch } from "@/components/notes/notes-search";

export default async function NotesPage() {
  let notes: NoteItem[] = [];
  let dbError: string | null = null;

  try {
    const rows = await getNotes();
    notes = rows.map((n) => ({
      ...n,
      updatedAt: n.updatedAt.toISOString(),
    })) as unknown as NoteItem[];
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <div className="p-6 space-y-5">
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
            <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {notes.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All your notes across projects. Use <code className="rounded bg-muted px-1 text-[10px]">[[note-title]]</code> to link.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/notes/new">
            <Plus className="h-4 w-4" />
            New Note
          </Link>
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyNotesState />
      ) : (
        <NotesSearch notes={notes} />
      )}
    </div>
  );
}

function EmptyNotesState() {
  return (
    <div className="rounded-md border border-dashed border-border p-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No notes yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Create your first note to capture knowledge, ideas, or links between projects.
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/notes/new">
          <Plus className="h-4 w-4" />
          New Note
        </Link>
      </Button>
    </div>
  );
}
