"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const WhiteboardEditor = dynamic(
  () =>
    import("./whiteboard-editor").then((m) => ({ default: m.WhiteboardEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  }
);
