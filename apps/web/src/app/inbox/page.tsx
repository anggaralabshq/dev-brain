import { EmptyState } from "@/components/empty-state";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <EmptyState
      icon={Inbox}
      title="Inbox is empty"
      description="Notifications, mentions, dan activity yang perlu kamu review akan muncul di sini. Coming in V1 (Step 17)."
      actionLabel="← Kembali ke Home"
      actionHref="/"
    />
  );
}
