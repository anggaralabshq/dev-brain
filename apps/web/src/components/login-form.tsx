"use client";

import { use, useState, useTransition } from "react";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGitHub } from "@/lib/auth/actions";

export function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = use(searchParams);
  const [isPending, startTransition] = useTransition();

  const initialError =
    params.error === "AccessDenied"
      ? "Access denied. This app is private — contact the admin to request access."
      : params.error === "OAuthAccountNotLinked"
        ? "This email is already linked to another account."
        : params.error ?? null;

  const [error, setError] = useState<string | null>(initialError);
  const isAccessDenied = params.error === "AccessDenied";

  const handleGitHub = () => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGitHub(params.callbackUrl ?? "/");
      if (result && !result.ok) setError(result.error ?? "Sign-in failed.");
    });
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        className="w-full h-11 gap-2.5 text-sm font-medium"
        onClick={handleGitHub}
        disabled={isPending || isAccessDenied}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Github className="h-4 w-4" />
        )}
        {isPending ? "Redirecting…" : "Continue with GitHub"}
      </Button>

      {error && (
        <div className={`rounded-md border px-3 py-2 text-xs ${isAccessDenied ? "border-border bg-muted text-muted-foreground" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
          {error}
        </div>
      )}
    </div>
  );
}
