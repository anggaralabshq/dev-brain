import Link from "next/link";
import { Brain, ShieldOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access Denied",
    description:
      "This app is private. Your GitHub account is not authorized to access Anggaralabs DevBrain.",
  },
  Configuration: {
    title: "Configuration Error",
    description: "There is a problem with the server configuration. Please try again later.",
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during sign in. Please try again.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, description } =
    ERROR_MESSAGES[error ?? ""] ?? ERROR_MESSAGES.Default;
  const isAccessDenied = error === "AccessDenied";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-muted-foreground">
            Anggaralabs
          </span>
        </div>

        {/* Error card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldOff className="h-6 w-6 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {isAccessDenied && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-left space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Request access
              </p>
              <p className="text-xs text-muted-foreground">
                Contact the admin at{" "}
                <a
                  href="mailto:wisnuanggara05@gmail.com"
                  className="text-primary underline underline-offset-2"
                >
                  wisnuanggara05@gmail.com
                </a>{" "}
                to request access to this app.
              </p>
            </div>
          )}

          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()} Anggaralabs
        </p>
      </div>
    </div>
  );
}
