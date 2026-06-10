"use client";

import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithCredentials, signInWithGitHub } from "@/lib/auth/actions";

export function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(params.error ?? null);
  const [isPending, startTransition] = useTransition();
  const [provider, setProvider] = useState<"credentials" | "github" | null>(null);

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setProvider("credentials");
    startTransition(async () => {
      const result = await signInWithCredentials(email, params.callbackUrl ?? "/");
      if (result?.error) {
        setError(result.error);
        setProvider(null);
      }
    });
  };

  const handleGitHub = () => {
    setError(null);
    setProvider("github");
    startTransition(async () => {
      await signInWithGitHub(params.callbackUrl ?? "/");
    });
  };

  return (
    <div className="space-y-3">
      {/* GitHub OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHub}
        disabled={isPending}
      >
        {provider === "github" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Github className="h-4 w-4" />
        )}
        Continue with GitHub
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or dev mode
          </span>
        </div>
      </div>

      {/* Email credentials (dev mode) */}
      <form onSubmit={handleCredentials} className="space-y-2">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !email}
        >
          {provider === "credentials" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Sign in with email
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Dev mode: just type any email — we'll create the account automatically.
      </p>
    </div>
  );
}
