"use client";

import {
  Tldraw,
  serializeTldrawJson,
  type Editor,
  // @ts-ignore — parseAndLoadDocument is @internal in tldraw v5 open-source
  // but works with a license. We import via require to bypass the type check.
} from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { saveWhiteboardAction, deleteWhiteboardAction } from "@/lib/actions/whiteboards";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

// parseAndLoadDocument is @internal in tldraw v5 types but present at runtime.
// import("tldraw") is webpack-bundled (unlike new Function trick) so the export
// is accessible in the client bundle.
async function loadTldrawDocument(editor: Editor, json: string): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON in saved diagram");
  }

  // Legacy data saved via editor.store.getSnapshot() lacks tldrawFileFormatVersion.
  // Fall back to loadSnapshot for that format.
  // Also handle AI-generated snapshots that used { schema, records: [...] } (wrong format) —
  // convert to { schema, store: {id: record} } before loading.
  if (parsed.tldrawFileFormatVersion === undefined) {
    let snapshot = parsed as Record<string, unknown>;
    if (Array.isArray(snapshot.records) && !snapshot.store) {
      const records = snapshot.records as Array<{ id: string }>;
      snapshot = { schema: snapshot.schema, store: Object.fromEntries(records.map((r) => [r.id, r])) };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.store.loadStoreSnapshot(snapshot as any);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("tldraw") as any;
  if (typeof mod.parseAndLoadDocument !== "function") {
    throw new Error("parseAndLoadDocument not found in tldraw");
  }
  await mod.parseAndLoadDocument(editor, json);
}

/**
 * tldraw-powered architecture diagram editor.
 * - Save: uses tldraw's proper `serializeTldrawJson` (handles Map/Set).
 * - Load: uses tldraw's `parseAndLoadDocument` (license-required, but open-source has it).
 * - Auto-save: debounced 1.5s on changes.
 */
export function WhiteboardEditor({
  whiteboardId,
  initialData,
  initialTitle,
  projectSlug,
}: {
  whiteboardId: string;
  initialData?: string | null;
  initialTitle: string;
  projectSlug: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isMounted, setIsMounted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, startTransition] = useTransition();
  const editorRef = useRef<Editor | null>(null);
  const lastSaveRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDataLoaded = useRef(false);

  const LICENSE_KEY = "tldraw-2026-09-17/WyJtbmsyX1daOCIsWyIqIl0sMTYsIjIwMjYtMDktMTciXQ.ZYCy9vagxCGSVQF0oc6yEShM4nmxMJ8p8s8I2RK9J4OwX2qcLk2hzwK6HhlLaVOVFh9Ci01Omq/Xz3de9DZwEQ";

  // Save
  const saveNow = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setStatus("saving");
    void (async () => {
      try {
        const json = await serializeTldrawJson(editor);
        lastSaveRef.current = json;
        const result = await saveWhiteboardAction(whiteboardId, {
          title,
          data: json,
        });
        setStatus(result.ok ? "saved" : "error");
        if (!result.ok) console.error("Save failed:", result.error);
      } catch (e) {
        console.error("Failed to save:", e);
        setStatus("error");
      }
    })();
  }, [whiteboardId, title]);

  // On mount: load initial data + set up change listener
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setIsMounted(true);

    console.info(
      "[DevBrain] tldraw editor mounted. License:",
      LICENSE_KEY ? "present" : "MISSING"
    );

    // Force dark mode
    try {
      editor.user.updateUserPreferences({ colorScheme: "dark" });
    } catch (e) {
      console.warn("Could not set colorScheme:", e);
    }

    // Load initial data via tldraw's proper loader (license-required)
    if (!initialDataLoaded.current && initialData) {
      initialDataLoaded.current = true;
      console.info("[DevBrain] Loading saved diagram...");
      void loadTldrawDocument(editor, initialData)
        .then(() => {
          lastSaveRef.current = initialData;
          setStatus("saved");
          console.info("[DevBrain] ✅ Diagram loaded successfully");
        })
        .catch((e) => {
          console.error("[DevBrain] ❌ Failed to load:", e);
          setStatus("error");
        });
    } else {
      lastSaveRef.current = "";
      setStatus("saved");
    }

    // Listen for changes → debounce save
    const unsubscribe = editor.store.listen(() => {
      setStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveNow();
      }, 1500);
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [initialData, saveNow]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div
      className="flex flex-col rounded-md border border-border bg-card overflow-hidden"
      style={{ height: "calc(100vh - 12rem)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setStatus("unsaved");
          }}
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
          placeholder="Diagram title"
        />
        <SaveStatusBadge status={status} />
        <Button size="sm" variant="outline" onClick={saveNow} disabled={!isMounted}>
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDeleteOpen(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete diagram?"
        description="This diagram will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          startTransition(async () => {
            await deleteWhiteboardAction(whiteboardId);
            router.push(`/projects/${projectSlug}/architecture`);
          });
        }}
      />

      {/* tldraw canvas */}
      <div className="relative tldraw-host" style={{ flex: 1, minHeight: 400 }}>
        {!isMounted && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Tldraw onMount={handleMount} licenseKey={LICENSE_KEY} />
      </div>
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-success" />
        Saved
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Unsaved
      </span>
    );
  }
  return <span className="text-xs text-destructive">Save failed</span>;
}
