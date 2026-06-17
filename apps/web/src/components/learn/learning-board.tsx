"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, CheckCircle2, Inbox, ExternalLink,
  Trash2, ChevronRight, ChevronLeft, StickyNote, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateStatusAction, deleteLearningItemAction, updateNoteAction } from "@/lib/actions/learning";
import type { LearningItem, LearningStatus } from "@devbrain/db/schema";

const COLUMNS: { id: LearningStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "backlog",  label: "Backlog",  icon: Inbox,         color: "text-muted-foreground" },
  { id: "learning", label: "Learning", icon: BookOpen,       color: "text-blue-400" },
  { id: "done",     label: "Done",     icon: CheckCircle2,   color: "text-emerald-400" },
];

const STATUS_ORDER: LearningStatus[] = ["backlog", "learning", "done"];

const SOURCE_BADGE: Record<string, string> = {
  github: "bg-violet-500/15 text-violet-400",
  hn:     "bg-orange-500/15 text-orange-400",
  papers: "bg-blue-500/15 text-blue-400",
  ai:     "bg-pink-500/15 text-pink-400",
  manual: "bg-muted text-muted-foreground",
};

function ItemCard({ item, onDelete, onMove, onNoteChange }: {
  item: LearningItem;
  onDelete: (id: string) => void;
  onMove: (id: string, status: LearningStatus) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(item.personalNote);
  const [, startTransition] = useTransition();

  const currentIdx = STATUS_ORDER.indexOf(item.status);
  const canBack = currentIdx > 0;
  const canNext = currentIdx < STATUS_ORDER.length - 1;

  const saveNote = () => {
    startTransition(async () => {
      await updateNoteAction(item.id, note);
      onNoteChange(item.id, note);
      setNoteOpen(false);
    });
  };

  return (
    <Card className="group text-sm transition-colors hover:border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-snug line-clamp-2">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="rounded p-0.5 hover:bg-accent text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button onClick={() => setNoteOpen(v => !v)}
              className="rounded p-0.5 hover:bg-accent text-muted-foreground hover:text-foreground">
              <StickyNote className="h-3 w-3" />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="rounded p-0.5 hover:bg-accent text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Note editor */}
        {noteOpen && (
          <div className="space-y-1.5 border-t border-border pt-2">
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Personal notes..."
              rows={2}
              className="resize-none text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 px-2 text-[11px]" onClick={saveNote}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setNoteOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        {!noteOpen && item.personalNote && (
          <p className="text-[11px] text-muted-foreground italic border-t border-border pt-1.5">
            {item.personalNote}
          </p>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {item.sourceName && (
              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium capitalize", SOURCE_BADGE[item.sourceName] ?? SOURCE_BADGE.manual)}>
                {item.sourceName}
              </span>
            )}
            {item.category && (
              <Badge variant="muted" className="h-4 px-1 text-[9px]">{item.category}</Badge>
            )}
            {item.stars != null && (
              <span className="text-[10px] text-muted-foreground">⭐ {item.stars >= 1000 ? `${(item.stars / 1000).toFixed(1)}k` : item.stars}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {canBack && (
              <button onClick={() => onMove(item.id, STATUS_ORDER[currentIdx - 1])}
                className="rounded p-0.5 hover:bg-accent text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                title="Move back">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            {canNext && (
              <button onClick={() => onMove(item.id, STATUS_ORDER[currentIdx + 1])}
                className="rounded p-0.5 hover:bg-accent text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                title="Move forward">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LearningBoard({ initialItems }: { initialItems: LearningItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    startTransition(async () => { await deleteLearningItemAction(id); });
  };

  const handleMove = (id: string, status: LearningStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    startTransition(async () => { await updateStatusAction(id, status); });
  };

  const handleNoteChange = (id: string, note: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, personalNote: note } : i));
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {COLUMNS.map(col => {
        const colItems = items.filter(i => i.status === col.id);
        return (
          <div key={col.id} className="flex flex-col gap-3">
            <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", col.color)}>
              <col.icon className="h-3.5 w-3.5" />
              {col.label}
              <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                {colItems.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[100px]">
              {colItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onMove={handleMove}
                  onNoteChange={handleNoteChange}
                />
              ))}
              {colItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] text-muted-foreground">
                  {col.id === "backlog" ? "Add items from the feed →" : "Empty"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
