"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  ImageIcon,
  Save,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateNoteAction, createNoteAction } from "@/lib/actions/notes";

const lowlight = createLowlight(common);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Toolbar({ editor, title }: { editor: Editor | null; title: string }) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const filename = title.trim().replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "note";

  const handleExportMarkdown = () => {
    // tiptap-markdown provides getMarkdown() via editor.storage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md: string = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
    downloadBlob(md, `${filename}.md`, "text/markdown");
  };

  const items = [
    { icon: Heading1, label: "H1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
    { icon: Heading2, label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { icon: Bold, label: "Bold", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { icon: Italic, label: "Italic", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { icon: Code, label: "Inline code", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
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
          const url = window.prompt("Link URL");
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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || file.size > MAX_IMAGE_SIZE) return;
          const src = await readFileAsDataUrl(file);
          editor.chain().focus().setImage({ src }).run();
        }}
      />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        title="Insert image (or paste / drop)"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ImageIcon className="h-3.5 w-3.5" />
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
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={handleExportMarkdown}
        title="Export as Markdown"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        title="Print / Export PDF"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Printer className="h-3.5 w-3.5" />
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
        codeBlock: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "rounded-md max-w-full" },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: false,
      }),
      Placeholder.configure({
        placeholder: "Type your note here. Markdown shortcuts work: # heading, **bold**, `code`, > quote…",
      }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[400px] focus:outline-none px-4 py-3 leading-relaxed",
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (!item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (!file || file.size > MAX_IMAGE_SIZE) continue;
          void readFileAsDataUrl(file).then((src) => {
            const node = view.state.schema.nodes.image?.create({ src });
            if (!node) return;
            view.dispatch(view.state.tr.replaceSelectionWith(node));
          });
          return true;
        }
        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > MAX_IMAGE_SIZE) continue;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!pos) continue;
          void readFileAsDataUrl(file).then((src) => {
            const node = view.state.schema.nodes.image?.create({ src });
            if (!node) return;
            view.dispatch(view.state.tr.insert(pos.pos, node));
          });
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setStatus("unsaved");
    },
  });

  const handleSave = useCallback(() => {
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
  }, [editor, title, mode, currentId, projectId]);

  // Debounced auto-save
  useEffect(() => {
    if (status !== "unsaved") return;
    if (!editor || !title.trim()) return;
    const timer = setTimeout(handleSave, 1500);
    return () => clearTimeout(timer);
  }, [status, content, title, handleSave, editor]);

  // ⌘S / Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  void isPending;

  return (
    <div className="rounded-md border border-border bg-card">
      {/* Title */}
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

      <Toolbar editor={editor} title={title} />

      <EditorContent editor={editor} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={status === "saving" || status === "saved"}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
