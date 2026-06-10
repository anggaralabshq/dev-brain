import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** "page" = large centered, "card" = medium inside card, "inline" = compact sidebar */
  size?: "page" | "card" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  size = "card",
  className,
}: EmptyStateProps) {
  if (size === "inline") {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 py-5 text-center", className)}>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
            <Icon className="h-4 w-4 text-muted-foreground/60" />
          </div>
        )}
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground/70 max-w-[180px] leading-relaxed">{description}</p>
        {actionLabel && actionHref && (
          <Link href={actionHref} className="mt-1 text-[10px] text-primary hover:underline">
            {actionLabel} →
          </Link>
        )}
      </div>
    );
  }

  if (size === "page") {
    return (
      <div className={cn("flex h-full min-h-[400px] flex-col items-center justify-center p-12 text-center", className)}>
        {Icon && (
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-2xl scale-150" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/20">
              <Icon className="h-9 w-9 text-primary/70" />
            </div>
          </div>
        )}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{description}</p>
        {(actionLabel && actionHref) && (
          <div className="mt-6 flex items-center gap-3">
            <Button asChild size="sm">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
            {secondaryLabel && secondaryHref && (
              <Button asChild variant="outline" size="sm">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // card (default)
  return (
    <div className={cn("rounded-xl border border-dashed border-border/60 p-10 text-center", className)}>
      {Icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
          <Icon className="h-6 w-6 text-muted-foreground/70" />
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{description}</p>
      {(actionLabel && actionHref) && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
