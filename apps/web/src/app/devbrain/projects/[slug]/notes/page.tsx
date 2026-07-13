import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { ChevronRight, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectBySlug } from "@/lib/db/projects";
import { getNotes } from "@/lib/db/notes";
import { type NoteListItem as NoteItem } from "@/components/notes/note-list-item";
import { NotesSearch } from "@/components/notes/notes-search";
import { EmptyState } from "@/components/empty-state";

export default async function ProjectNotesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let user;
  try { user = await requireUser(); } catch { redirect("/login"); }
  const project = await getProjectBySlug(slug, user.id);
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
        <EmptyState
          icon={FileText}
          title="No notes in this project yet"
          description="Document knowledge, decisions, and ideas. Notes support Markdown and can link to each other with [[wikilinks]]."
          actionLabel="New Note"
          actionHref={`/notes/new?projectId=${project.id}`}
          size="page"
        />
      ) : (
        <NotesSearch notes={notes} />
      )}
    </div>
  );
}
