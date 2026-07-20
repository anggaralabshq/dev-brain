"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordGeneratorPanel } from "@/components/vault/password-generator-popover";
import type { VaultItemPayload } from "@/lib/crypto/vault-items";
import type { DecryptedVaultFolder } from "@/contexts/vault-key-context";

const EMPTY: VaultItemPayload = { title: "", username: "", password: "", url: "", notes: "" };

export function ItemFormDialog({
  open,
  onOpenChange,
  initial,
  folders,
  initialFolderId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: VaultItemPayload | null;
  folders: DecryptedVaultFolder[];
  initialFolderId: string | null;
  onSubmit: (payload: VaultItemPayload, folderId: string | null) => Promise<void>;
}) {
  const [payload, setPayload] = useState<VaultItemPayload>(initial ?? EMPTY);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [showGenerator, setShowGenerator] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPayload(initial ?? EMPTY);
      setFolderId(initialFolderId);
      setShowGenerator(false);
    }
  }, [open, initial, initialFolderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payload.title.trim()) return;
    setBusy(true);
    await onSubmit(payload, folderId);
    setBusy(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            placeholder="Title"
            value={payload.title}
            onChange={(e) => setPayload({ ...payload, title: e.target.value })}
            autoFocus
          />
          <Input
            placeholder="Username / email"
            value={payload.username}
            onChange={(e) => setPayload({ ...payload, username: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Password"
              value={payload.password}
              onChange={(e) => setPayload({ ...payload, password: e.target.value })}
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={() => setShowGenerator((v) => !v)}>
              Generate
            </Button>
          </div>
          {showGenerator && (
            <PasswordGeneratorPanel
              onUse={(pw) => {
                setPayload((p) => ({ ...p, password: pw }));
                setShowGenerator(false);
              }}
            />
          )}
          <Input
            placeholder="URL"
            value={payload.url}
            onChange={(e) => setPayload({ ...payload, url: e.target.value })}
          />
          <textarea
            placeholder="Notes"
            value={payload.notes}
            onChange={(e) => setPayload({ ...payload, notes: e.target.value })}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          {folders.length > 0 && (
            <select
              value={folderId ?? ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy || !payload.title.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
