import { EmptyState } from "@/components/empty-state";
import { LayoutTemplate } from "lucide-react";

export default function TemplatesPage() {
  return (
    <EmptyState
      icon={LayoutTemplate}
      title="Templates"
      description="Pre-built templates untuk projects, notes, ADRs, dan meetings. Coming in V1 (Step 19)."
      actionLabel="← Kembali ke Home"
      actionHref="/"
    />
  );
}
