"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const loader = () => (
  <div className="flex h-96 items-center justify-center text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

export const WhiteboardEditor = dynamic(
  () => import("./whiteboard-editor").then((m) => ({ default: m.WhiteboardEditor })),
  { ssr: false, loading: loader }
);

export const WhiteboardViewer = dynamic(
  () => import("./whiteboard-viewer").then((m) => ({ default: m.WhiteboardViewer })),
  { ssr: false, loading: loader }
);
