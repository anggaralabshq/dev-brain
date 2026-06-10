import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileText, Folder, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoteEditor } from "@/components/notes/note-editor";
import { getNoteBySlug, getBacklinks } from "@/lib/db/notes";

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);

  if (!note) notFound();

  const backlinks = await getBacklinks(slug);

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/notes" className="hover:text-foreground">
          Notes
        </Link>
        <ChevronRight className="h-3 w-3" />
        {note.projectSlug && note.projectName && (
          <>
            <Link
              href={`/projects/${note.projectSlug}/notes`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Folder className="h-3 w-3" />
              {note.projectName}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-foreground">{note.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Editor */}
          <NoteEditor
            noteId={note.id}
            initialTitle={note.title}
            initialContent={note.content}
            projectId={note.projectId}
            mode="edit"
          />

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {note.pinned && (
              <Badge variant="warning" className="gap-1">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </Badge>
            )}
            {note.tags.map((t) => (
              <Badge key={t} variant="muted" className="text-[10px]">
                #{t}
              </Badge>
            ))}
            <span>·</span>
            <span>By {note.authorName}</span>
            <span>·</span>
            <span>Last edited {new Date(note.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Sidebar: backlinks & outgoing */}
        <div className="space-y-3">
          {/* Outgoing links */}
          {note.outgoingLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Links to</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {note.outgoingLinks.map((slug) => (
                  <Link
                    key={slug}
                    href={`/notes/${slug}`}
                    className="block rounded-md px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    <span className="text-primary">[[{slug}]]</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Backlinks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">
                Backlinks {backlinks.length > 0 && `(${backlinks.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backlinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No notes link to this one yet. Add <code className="rounded bg-muted px-1 text-[10px]">[[{note.slug}]]</code> in another note to create a backlink.
                </p>
              ) : (
                <div className="space-y-2">
                  {backlinks.map((bl) => (
                    <Link
                      key={bl.id}
                      href={`/notes/${bl.slug}`}
                      className="block rounded-md border border-border/50 p-2 transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <p className="text-xs font-medium">{bl.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                        {bl.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
