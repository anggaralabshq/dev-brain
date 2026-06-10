import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NoteEditor } from "@/components/notes/note-editor";

export default function NewNotePage() {
  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/notes" className="hover:text-foreground">
          Notes
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">New</span>
      </div>

      <NoteEditor mode="create" />
    </div>
  );
}
