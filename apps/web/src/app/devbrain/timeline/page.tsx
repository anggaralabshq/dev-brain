import { EmptyState } from "@/components/empty-state";
import { Clock } from "lucide-react";

export default function TimelinePage() {
  return (
    <EmptyState
      icon={Clock}
      title="Timeline view"
      description="Project milestones, meeting schedule, dan activity timeline lintas projects. Coming in V1 (Step 18)."
      actionLabel="← Kembali ke Home"
      actionHref="/"
    />
  );
}
