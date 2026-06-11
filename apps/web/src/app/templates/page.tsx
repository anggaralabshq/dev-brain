import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays, Users, ScrollText, FileCode, Bug,
  IterationCcw, GitPullRequest, LayoutTemplate,
} from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { NOTE_TEMPLATES, type NoteTemplate } from "@/lib/templates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarDays,
  Users,
  ScrollText,
  FileCode,
  Bug,
  IterationCcw,
  GitPullRequest,
  LayoutTemplate,
};

const CATEGORY_LABELS: Record<NoteTemplate["category"], string> = {
  daily: "Daily",
  engineering: "Engineering",
  meetings: "Meetings",
  planning: "Planning",
};

const CATEGORY_ORDER: NoteTemplate["category"][] = ["daily", "meetings", "engineering", "planning"];

export default async function TemplatesPage() {
  try { await requireUser(); } catch { redirect("/login"); }

  const grouped = CATEGORY_ORDER.reduce<Record<string, NoteTemplate[]>>((acc, cat) => {
    const items = NOTE_TEMPLATES.filter((t) => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-built templates untuk notes. Klik untuk langsung buat note baru.
        </p>
      </div>

      {Object.entries(grouped).map(([category, templates]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category as NoteTemplate["category"]]}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => {
              const Icon = ICON_MAP[tpl.icon] ?? LayoutTemplate;
              return (
                <Link key={tpl.id} href={`/notes/new?template=${tpl.id}`}>
                  <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30">
                    <CardContent className="flex gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{tpl.name}</p>
                          <Badge variant="muted" className="shrink-0 text-[9px]">
                            {CATEGORY_LABELS[tpl.category]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
