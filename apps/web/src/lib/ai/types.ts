export type AIAction =
  | { type: "create_task"; title: string; projectSlug: string; priority?: "low" | "medium" | "high" | "urgent"; description?: string }
  | { type: "create_note"; title: string; projectSlug: string; content: string }
  | { type: "create_whiteboard"; title: string; projectSlug: string };

export type AIActionResult = {
  ok: boolean;
  error?: string;
  href?: string;
  label?: string;
};
