"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useVaultKey } from "@/contexts/vault-key-context";

export function DangerZone() {
  const { resetVault } = useVaultKey();
  const [password, setPassword] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    const res = await resetVault(password);
    setBusy(false);
    setPassword("");
    if (!res.ok) setError(res.error ?? "Failed to reset vault");
  }

  return (
    <div className="rounded-lg border border-destructive/40 p-4">
      <h2 className="mb-1 text-sm font-semibold text-destructive">Danger zone</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Permanently deletes every item, folder, and the master password itself. Cannot be undone.
      </p>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="button"
          variant="destructive"
          disabled={!password || busy}
          onClick={() => setConfirmOpen(true)}
        >
          Delete vault
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete vault permanently?"
        description="All items and folders will be destroyed. This cannot be undone."
        confirmLabel="Delete everything"
        onConfirm={handleConfirm}
      />
    </div>
  );
}
