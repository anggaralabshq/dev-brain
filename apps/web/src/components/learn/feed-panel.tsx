"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Github, ExternalLink, Plus, Loader2,
  FlameKindling, FileText, Sparkles, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addToBacklogAction, analyzeStackAction } from "@/lib/actions/learning";
import type { FeedItem } from "@/app/api/feeds/route";

type Tab = "github" | "hn" | "papers";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "github",  label: "GitHub",  icon: Github },
  { id: "hn",      label: "HN",      icon: FlameKindling },
  { id: "papers",  label: "Papers",  icon: FileText },
];

function FeedCard({ item, onAdd }: { item: FeedItem; onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAdd = () => {
    startTransition(async () => {
      const res = await addToBacklogAction({
        title: item.title,
        description: item.description,
        sourceUrl: item.url,
        sourceName: item.source,
        tags: item.tags,
        stars: item.stars,
      });
      if (res.ok) {
        setAdded(true);
        onAdd();
        router.refresh();
      }
    });
  };

  return (
    <Card className="group transition-colors hover:border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-snug line-clamp-2">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={handleAdd}
              disabled={isPending || added}
              className={cn(
                "rounded p-0.5 transition-all",
                added
                  ? "text-emerald-400"
                  : "text-muted-foreground hover:text-primary hover:bg-accent opacity-0 group-hover:opacity-100"
              )}
              title={added ? "Added to backlog" : "Add to backlog"}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : added ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{item.meta}</span>
          <div className="flex gap-1 flex-wrap justify-end">
            {item.tags.slice(0, 2).map(t => (
              <Badge key={t} variant="muted" className="h-4 px-1 text-[9px]">{t}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AISuggestPanel() {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<Array<{
    title: string; description: string; category: string; tags: string[];
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const router = useRouter();

  const analyze = () => {
    setError(null);
    startTransition(async () => {
      const res = await analyzeStackAction();
      if (res.ok && res.suggestions) setSuggestions(res.suggestions);
      else setError(res.error ?? "Failed");
    });
  };

  const addSuggestion = (i: number) => {
    const s = suggestions![i];
    startTransition(async () => {
      const res = await addToBacklogAction({
        title: s.title,
        description: s.description,
        sourceName: "ai",
        category: s.category,
        tags: s.tags,
      });
      if (res.ok) {
        setAdded(prev => new Set([...prev, i]));
        router.refresh();
      }
    });
  };

  if (!suggestions) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <Sparkles className="h-8 w-8 text-pink-400" />
        <div>
          <p className="text-sm font-medium">AI Stack Analyzer</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Analyze your notes, ADRs & projects to suggest what to learn next
          </p>
        </div>
        <Button size="sm" onClick={analyze} disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Analyze My Stack
        </Button>
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Based on your notes & projects</p>
        <button onClick={() => { setSuggestions(null); setAdded(new Set()); }}
          className="text-[10px] text-muted-foreground hover:text-foreground">
          Reset
        </button>
      </div>
      {suggestions.map((s, i) => (
        <Card key={i} className="group transition-colors hover:border-primary/30">
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{s.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
              </div>
              <button
                onClick={() => addSuggestion(i)}
                disabled={added.has(i)}
                className={cn(
                  "shrink-0 rounded p-0.5 transition-all opacity-0 group-hover:opacity-100",
                  added.has(i) ? "text-emerald-400 opacity-100" : "text-muted-foreground hover:text-primary hover:bg-accent"
                )}
              >
                {added.has(i) ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex gap-1">
              <Badge variant="muted" className="h-4 px-1 text-[9px] bg-pink-500/15 text-pink-400">{s.category}</Badge>
              {s.tags.slice(0, 2).map(t => (
                <Badge key={t} variant="muted" className="h-4 px-1 text-[9px]">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FeedPanel() {
  const [activeTab, setActiveTab] = useState<Tab | "ai">("github");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "ai") return;
    setLoading(true);
    setError(null);
    fetch(`/api/feeds?source=${activeTab}`)
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => setError("Failed to load feed"))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            activeTab === "ai"
              ? "bg-pink-500/15 text-pink-400"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Sparkles className="h-3 w-3" />
          AI Analyze
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {activeTab === "ai" ? (
          <AISuggestPanel />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-center text-[11px] text-destructive py-8">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-center text-[11px] text-muted-foreground py-8">No items found</p>
        ) : (
          items.map(item => (
            <FeedCard key={item.id} item={item} onAdd={() => {}} />
          ))
        )}
      </div>
    </div>
  );
}
