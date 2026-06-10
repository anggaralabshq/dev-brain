import { LoginForm } from "@/components/login-form";
import { Brain } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">DevBrain</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Second Brain for Developers
          </p>
        </div>

        <LoginForm searchParams={searchParams} />

        <p className="text-center text-[10px] text-muted-foreground">
          By signing in, you agree to keep your knowledge graph tidy.
        </p>
      </div>
    </div>
  );
}
