"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultKey } from "@/contexts/vault-key-context";

export function ChangeMasterPasswordForm() {
  const { changeMasterPassword } = useVaultKey();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New master password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);
    const res = await changeMasterPassword(oldPassword, newPassword);
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to change master password");
      return;
    }
    setSuccess(true);
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="password"
        placeholder="Current master password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />
      <Input
        type="password"
        placeholder="New master password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Confirm new master password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-muted-foreground">Master password changed.</p>}
      <Button type="submit" disabled={busy || !oldPassword || !newPassword}>
        {busy ? "Changing…" : "Change master password"}
      </Button>
    </form>
  );
}
