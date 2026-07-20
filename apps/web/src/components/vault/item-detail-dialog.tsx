"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DecryptedVaultItem } from "@/contexts/vault-key-context";
import { getClipboardClearSeconds } from "@/lib/vault-prefs";

function Field({
  label,
  value,
  mono,
  masked,
  onToggleMask,
}: {
  label: string;
  value: string;
  mono?: boolean;
  masked?: boolean;
  onToggleMask?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);

    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) await navigator.clipboard.writeText("");
      } catch {
        // clipboard-read may be blocked — best-effort only
      }
    }, getClipboardClearSeconds() * 1000);
  }

  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={mono ? "truncate font-mono text-sm" : "truncate text-sm"}>
          {masked ? "••••••••••••" : value}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onToggleMask && (
          <Button type="button" variant="ghost" size="icon" onClick={onToggleMask}>
            {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={copy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {copied && <span className="text-xs text-muted-foreground">Copied</span>}
    </div>
  );
}

export function ItemDetailDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  item: DecryptedVaultItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    if (open) setMasked(true);
  }, [open]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          <Field label="Username" value={item.username} />
          <Field
            label="Password"
            value={item.password}
            mono
            masked={masked}
            onToggleMask={() => setMasked((v) => !v)}
          />
          <Field label="URL" value={item.url} />
          {item.notes && (
            <div className="py-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            {item.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
