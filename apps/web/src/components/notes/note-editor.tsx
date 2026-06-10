"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useTransition } from "react";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateNoteAction, createNoteAction } from "@/lib/actions/notes";

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const items = [
    { icon: Heading1, label: "H1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
    { icon: Heading2, label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { icon: Bold, label: "Bold", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { icon: Italic, label: "Italic", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { icon: Code, label: "Code", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
    { icon: List, label: "Bullet list", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { icon: ListOrdered, label: "Numbered list", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { icon: Quote, label: "Quote", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.action}
          title={item.label}
          className={cn(
            "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            item.active && "bg-primary/15 text-primary"
          )}
        >
          <item.icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        title="Add link"
        className={cn(
          "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          editor.isActive("link") && "bg-primary/15 text-primary"
        )}
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        disabled={!editor.can().undo()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        disabled={!editor.can().redo()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  projectId,
  mode = "edit",
}: {
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  projectId?: string | null;
  mode?: "edit" | "create";
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [currentId, setCurrentId] = useState(noteId);
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(initialContent ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Placeholder.configure({
        placeholder: 'Type your note here. Use [[note-title]] to link other notes.',
      }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] focus:outline-none px-4 py-3 text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setStatus("unsaved");
    },
  });

  // Debounced auto-save
  useEffect(() => {
    if (status !== "unsaved") return;
    if (!editor || !title.trim()) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, content, title]);

  const handleSave = () => {
    if (!editor) return;
    const html = editor.getHTML();
    setStatus("saving");
    startTransition(async () => {
      if (mode === "create" || !currentId) {
        const fd = new FormData();
        fd.append("title", title);
        fd.append("content", html);
        if (projectId) fd.append("projectId", projectId);
        const result = await createNoteAction(fd);
        if (result.ok) {
          setCurrentId(result.id);
          setStatus("saved");
          // Redirect to edit mode
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", `/notes/${result.slug}`);
          }
        } else {
          setStatus("error");
        }
      } else {
        const fd = new FormData();
        fd.append("id", currentId);
        fd.append("title", title);
        fd.append("content", html);
        const result = await updateNoteAction(fd);
        setStatus(result.ok ? "saved" : "error");
      }
    });
  };

  return (
    <div className="rounded-md border border-border bg-card">
      {/* Title input */}
      <div className="border-b border-border px-4 py-3">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setStatus("unsaved");
          }}
          placeholder="Note title"
          className="w-full bg-transparent text-xl font-semibold tracking-tight placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <Toolbar editor={editor} />

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Footer with save status */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving…</span>
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3 text-success" />
              <span>Saved</span>
            </>
          )}
          {status === "unsaved" && (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Unsaved changes</span>
            </>
          )}
          {status === "error" && (
            <span className="text-destructive">Save failed — try again</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-border bg-background px-1 text-[10px]">⌘S</kbd>
          <span>to save</span>
        </div>
      </div>
    </div>
  );
}
