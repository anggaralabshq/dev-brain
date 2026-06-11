import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NoteEditor } from "@/components/notes/note-editor";
import { getTemplate } from "@/lib/templates";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; template?: string }>;
}) {
  const { projectId, template: templateId } = await searchParams;
  const tpl = templateId ? getTemplate(templateId) : undefined;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/notes" className="hover:text-foreground">
          Notes
        </Link>
        {tpl && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href="/templates" className="hover:text-foreground">Templates</Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tpl ? tpl.name : "New"}</span>
      </div>

      <NoteEditor
        mode="create"
        projectId={projectId ?? null}
        initialTitle={tpl?.name ?? ""}
        initialContent={tpl?.content ?? ""}
      />
    </div>
  );
}
