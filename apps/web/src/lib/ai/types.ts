export type DiagramNode = {
  id: string;
  label: string;
  color?: string;
  shape?: "rectangle" | "ellipse" | "diamond" | "cylinder" | "hexagon" | "circle";
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type AIAction =
  | { type: "create_task"; title: string; projectSlug: string; priority?: "low" | "medium" | "high" | "urgent"; description?: string }
  | { type: "update_task_status"; taskId: string; status: "todo" | "in_progress" | "in_review" | "done"; projectSlug: string }
  | { type: "delete_task"; taskId: string; projectSlug: string }
  | { type: "create_note"; title: string; projectSlug: string; content: string }
  | { type: "create_whiteboard"; title: string; projectSlug: string }
  | { type: "create_project"; name: string; description?: string; color?: string }
  | { type: "create_adr"; title: string; projectSlug: string; context?: string; decision?: string; consequences?: string; status?: "proposed" | "accepted" | "deprecated" | "superseded" }
  | { type: "create_meeting"; title: string; projectSlug: string; description?: string; startAt: string; endAt: string; location?: string; notes?: string }
  | { type: "create_diagram"; title: string; projectSlug: string; nodes: DiagramNode[]; edges: DiagramEdge[] };

export type AIActionResult = {
  ok: boolean;
  error?: string;
  href?: string;
  label?: string;
};
