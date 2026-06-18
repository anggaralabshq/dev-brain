import { notFound } from "next/navigation";
import { getWhiteboardByShareToken } from "@/lib/db/whiteboards";
import { WhiteboardViewer } from "@/components/architecture/whiteboard-dynamic";
import { Network } from "lucide-react";

export default async function SharedDiagramPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const wb = await getWhiteboardByShareToken(token);
  if (!wb) notFound();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <Network className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{wb.title}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {wb.projectName} · by {wb.authorName} · read-only
        </span>
      </header>
      <div className="flex-1">
        <WhiteboardViewer data={wb.data ? JSON.stringify(wb.data) : null} title={wb.title} />
      </div>
    </div>
  );
}
