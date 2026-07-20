"use client";

import { useState } from "react";
import { Folder, FolderPlus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DecryptedVaultFolder } from "@/contexts/vault-key-context";

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelect,
  itemCount,
  onCreateFolder,
}: {
  folders: DecryptedVaultFolder[];
  selectedFolderId: string | null | "all";
  onSelect: (id: string | null | "all") => void;
  itemCount: (folderId: string | null) => number;
  onCreateFolder: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onCreateFolder(name.trim());
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-1 border-r border-border/60 p-3">
      <button
        onClick={() => onSelect("all")}
        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          selectedFolderId === "all" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        }`}
      >
        <span className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5" />
          All items
        </span>
      </button>
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          selectedFolderId === null ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        }`}
      >
        <span className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5" />
          Unfiled
        </span>
        <span className="text-xs text-muted-foreground">{itemCount(null)}</span>
      </button>

      <div className="my-1 border-t border-border/60" />

      {folders.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            selectedFolderId === f.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{f.name}</span>
          </span>
          <span className="text-xs text-muted-foreground">{itemCount(f.id)}</span>
        </button>
      ))}

      {creating ? (
        <form onSubmit={submit} className="mt-1">
          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name.trim() && setCreating(false)}
            className="h-7 text-xs"
          />
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 justify-start text-muted-foreground"
          onClick={() => setCreating(true)}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New folder
        </Button>
      )}
    </div>
  );
}
