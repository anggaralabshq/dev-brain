import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectBySlug } from "@/lib/db/projects";
import { getNotes } from "@/lib/db/notes";
import { type NoteListItem as NoteItem } from "@/components/notes/note-list-item";
import { NotesSearch } from "@/components/notes/notes-search";

export default async function ProjectNotesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  let notes: NoteItem[] = [];
  let dbError: string | null = null;
  try {
    const rows = await getNotes({ projectId: project.id });
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
          <strong className="text-destructive">DB error:</strong>{" "}
          <span className="text-muted-foreground">{dbError}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{project.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Notes</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} in {project.name}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/notes/new?projectId=${project.id}`}>
            <Plus className="h-4 w-4" />
            New Note
          </Link>
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No notes in this project yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first note to document knowledge, ideas, or links.
          </p>
        </div>
      ) : (
        <NotesSearch notes={notes} />
      )}
    </div>
  );
}
