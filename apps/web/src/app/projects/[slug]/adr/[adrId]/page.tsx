import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileText, CheckCircle2, Clock, XCircle, ArrowRight, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdrById } from "@/lib/db/adrs";

const statusBadge: Record<string, { variant: "success" | "info" | "warning" | "muted"; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  proposed: { variant: "info", icon: Clock, label: "Proposed" },
  accepted: { variant: "success", icon: CheckCircle2, label: "Accepted" },
  deprecated: { variant: "warning", icon: XCircle, label: "Deprecated" },
  superseded: { variant: "muted", icon: ArrowRight, label: "Superseded" },
};

export default async function AdrDetailPage({
  params,
}: {
  params: Promise<{ slug: string; adrId: string }>;
}) {
  const { slug, adrId } = await params;
  const adr = await getAdrById(adrId);
  if (!adr) notFound();

  const sb = statusBadge[adr.status];
  const Icon = sb.icon;

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}`} className="hover:text-foreground">{adr.projectName}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${slug}/adr`} className="hover:text-foreground">ADR</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">#{adr.number}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
              ADR #{String(adr.number).padStart(3, "0")}
            </span>
            <Badge variant={sb.variant} className="gap-1">
              <Icon className="h-2.5 w-2.5" />
              {sb.label}
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{adr.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {adr.authorName}
            </span>
            {adr.decisionDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(adr.decisionDate).toLocaleDateString()}
              </span>
            )}
            <span>·</span>
            <span>Last updated {new Date(adr.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Context" content={adr.context} />
        <Section title="Decision" content={adr.decision} variant="primary" />
        <Section title="Consequences" content={adr.consequences} />
      </div>
    </div>
  );
}

function Section({
  title,
  content,
  variant,
}: {
  title: string;
  content: string;
  variant?: "primary";
}) {
  return (
    <Card className={variant === "primary" ? "border-primary/30" : ""}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {content}
          </p>
        ) : (
          <p className="italic text-muted-foreground">Not yet documented</p>
        )}
      </CardContent>
    </Card>
  );
}
