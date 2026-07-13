import { EmptyState } from "@/components/empty-state";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="AI Chat"
      description="Chat dengan AI yang punya akses ke seluruh knowledge base kamu (RAG). Coming in V2 (Step 24)."
      actionLabel="← Kembali ke Home"
      actionHref="/"
    />
  );
}
