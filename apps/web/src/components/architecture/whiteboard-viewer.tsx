"use client";

import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

async function loadTldrawDocument(editor: Editor, json: string) {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(json); } catch { return; }

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
  if (typeof mod.parseAndLoadDocument === "function") {
    await mod.parseAndLoadDocument(editor, json);
  }
}

const LICENSE_KEY = "tldraw-2026-09-17/WyJtbmsyX1daOCIsWyIqIl0sMTYsIjIwMjYtMDktMTciXQ.ZYCy9vagxCGSVQF0oc6yEShM4nmxMJ8p8s8I2RK9J4OwX2qcLk2hzwK6HhlLaVOVFh9Ci01Omq/Xz3de9DZwEQ";

export function WhiteboardViewer({ data, title }: { data: string | null; title: string }) {
  const [isMounted, setIsMounted] = useState(false);

  const handleMount = useCallback((editor: Editor) => {
    setIsMounted(true);
    try { editor.user.updateUserPreferences({ colorScheme: "dark" }); } catch { /* noop */ }
    // read-only: disable all tools
    editor.setCurrentTool("hand");
    editor.updateInstanceState({ isReadonly: true });

    if (data) {
      void loadTldrawDocument(editor, data);
    }
  }, [data]);

  void title;

  return (
    <div className="relative h-full w-full">
      {!isMounted && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Tldraw onMount={handleMount} licenseKey={LICENSE_KEY} />
    </div>
  );
}
