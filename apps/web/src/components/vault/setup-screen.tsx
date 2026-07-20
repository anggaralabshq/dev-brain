"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useVaultKey } from "@/contexts/vault-key-context";

export function SetupScreen() {
  const { setup } = useVaultKey();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Master password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const res = await setup(password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Setup failed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/60">
            <KeyRound className="h-4 w-4" />
          </div>
          <CardTitle>Set up VaultKey</CardTitle>
          <CardDescription>
            Choose a master password. It never leaves your browser and cannot be recovered if
            forgotten — write it down somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Input
              type="password"
              placeholder="Confirm master password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Setting up…" : "Create vault"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
