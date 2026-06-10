"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Image, FileCode2, Archive, File, Trash2, Download,
  Upload, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFileAction, deleteFileAction } from "@/lib/actions/project-files";
import type { ProjectFileWithMeta } from "@/lib/db/project-files";

function fileIcon(mime: string) {
  if (mime.startsWith("image/"))       return <Image className="h-4 w-4 text-violet-400" />;
  if (mime.includes("pdf"))            return <FileText className="h-4 w-4 text-red-400" />;
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gz"))
    return <Archive className="h-4 w-4 text-amber-400" />;
  if (mime.includes("json") || mime.includes("yaml") || mime.includes("xml") ||
      mime.includes("javascript") || mime.includes("typescript") || mime.includes("text"))
    return <FileCode2 className="h-4 w-4 text-blue-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function FilesSection({
  projectId,
  initialFiles,
}: {
  projectId: string;
  initialFiles: ProjectFileWithMeta[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadFileAction(projectId, fd);
        if (!res.ok) { setUploadError(res.error); return; }
      }
      router.refresh();
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      await deleteFileAction(id);
      router.refresh();
    });
  }

  function handleDownload(file: ProjectFileWithMeta) {
    const a = document.createElement("a");
    a.href = `data:${file.mimeType};base64,${file.data}`;
    a.download = file.name;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/30"
        )}
      >
        {isPending ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className={cn("h-6 w-6", dragging ? "text-primary" : "text-muted-foreground")} />
        )}
        <p className="text-sm font-medium">{dragging ? "Drop files here" : "Click or drag files to upload"}</p>
        <p className="text-xs text-muted-foreground">Max 5 MB per file</p>
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{uploadError}</p>
      )}

      {/* File list */}
      {initialFiles.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">No files uploaded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Uploaded by</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="w-16 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialFiles.map((f) => (
                <tr key={f.id} className="group hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {fileIcon(f.mimeType)}
                      <span className="font-medium">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtSize(f.size)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{f.uploaderName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(new Date(f.createdAt))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" title="Download"
                        onClick={() => handleDownload(f)}
                        className="rounded p-1 hover:bg-accent">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button type="button" title="Delete"
                        onClick={() => handleDelete(f.id, f.name)}
                        className="rounded p-1 hover:bg-accent">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
