"use client";

import { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, ExternalLink, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToBacklogAction } from "@/lib/actions/learning";
import type { FeedItem } from "@/app/api/feeds/route";

// ── color ─────────────────────────────────────────────────────────────────────

const PALETTE = [
  "#4ade80", "#22d3ee", "#fbbf24", "#c084fc",
  "#f472b6", "#60a5fa", "#fb923c", "#34d399",
  "#a78bfa", "#f9a8d4", "#67e8f9", "#86efac",
];

function nodeColor(id: string): string {
  let h = 5381;
  for (const c of id) h = ((h << 5) + h + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}

// ── keyword inference for tagless items ───────────────────────────────────────

const TECH_KW = [
  "llm","gpt","claude","llama","gemini","mistral","openai",
  "ai","ml","agent","rag","transformer","embedding",
  "rust","python","typescript","go","java",
  "react","next.js","svelte","tailwind","vue",
  "docker","kubernetes","wasm","serverless","edge",
  "vector","database","redis","postgres","sqlite",
  "fine-tuning","inference","quantization","lora","diffusion",
];

function inferTags(title: string): string[] {
  const lo = title.toLowerCase();
  return TECH_KW.filter(k => lo.includes(k)).slice(0, 4);
}

// ── graph model ───────────────────────────────────────────────────────────────

interface TNode { id: string; count: number; stars: number; source: string; items: FeedItem[] }
interface TEdge { a: string; b: string; weight: number }

function buildGraph(items: FeedItem[]): { nodes: TNode[]; edges: TEdge[] } {
  const map = new Map<string, { count: number; stars: number; src: Map<string, number>; items: FeedItem[] }>();
  for (const item of items) {
    const tags = item.tags?.length ? item.tags : inferTags(item.title);
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, { count: 0, stars: 0, src: new Map(), items: [] });
      const n = map.get(tag)!;
      n.count++;
      n.stars += item.stars ?? 0;
      n.src.set(item.source, (n.src.get(item.source) ?? 0) + 1);
      n.items.push(item);
    }
  }

  const nodes: TNode[] = [...map.entries()]
    .map(([id, d]) => ({
      id, count: d.count, stars: d.stars,
      source: [...d.src.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "github",
      items: d.items,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 42);

  const nodeSet = new Set(nodes.map(n => n.id));
  const edgeMap = new Map<string, TEdge>();
  for (const item of items) {
    const tags = (item.tags?.length ? item.tags : inferTags(item.title))
      .filter(t => nodeSet.has(t)).slice(0, 6);
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const [a, b] = tags[i] < tags[j] ? [tags[i], tags[j]] : [tags[j], tags[i]];
        const key = `${a}\0${b}`;
        if (!edgeMap.has(key)) edgeMap.set(key, { a, b, weight: 0 });
        edgeMap.get(key)!.weight++;
      }
    }
  }

  const edges = [...edgeMap.values()]
    .filter(e => e.weight >= 1)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 90);

  return { nodes, edges };
}

// ── force layout ──────────────────────────────────────────────────────────────

type LayoutNode = TNode & { x: number; y: number };

function forceLayout(nodes: TNode[], edges: TEdge[], W: number, H: number): LayoutNode[] {
  const pos = nodes.map((_, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const r = Math.min(W, H) * 0.28;
    return { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 };
  });
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const pad = 52;

  for (let it = 0; it < 200; it++) {
    const alpha = (1 - it / 200) ** 1.8;

    // repulsion
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y;
        const d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);
        const f = Math.min(6500 / d2, 38) * alpha;
        const fx = (f * dx) / d, fy = (f * dy) / d;
        pos[i].vx -= fx; pos[i].vy -= fy;
        pos[j].vx += fx; pos[j].vy += fy;
      }
    }

    // attraction
    for (const e of edges) {
      const ai = idx.get(e.a), bi = idx.get(e.b);
      if (ai === undefined || bi === undefined) continue;
      const dx = pos[bi].x - pos[ai].x, dy = pos[bi].y - pos[ai].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = d * 0.022 * Math.min(e.weight, 8) * alpha;
      const fx = (f * dx) / d, fy = (f * dy) / d;
      pos[ai].vx += fx; pos[ai].vy += fy;
      pos[bi].vx -= fx; pos[bi].vy -= fy;
    }

    // center gravity
    for (const p of pos) {
      p.vx += (W / 2 - p.x) * 0.005 * alpha;
      p.vy += (H / 2 - p.y) * 0.005 * alpha;
      p.x = Math.max(pad, Math.min(W - pad, p.x + p.vx));
      p.y = Math.max(pad, Math.min(H - pad, p.y + p.vy));
      p.vx *= 0.65; p.vy *= 0.65;
    }
  }

  return nodes.map((n, i) => ({ ...n, x: pos[i].x, y: pos[i].y }));
}

// ── component ─────────────────────────────────────────────────────────────────

const W = 720, H = 430;
const BG = "#06060e";
const PANEL_BG = "#0c0c18";

export function TrendGraph() {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LayoutNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(() => {
    Promise.all(
      ["github", "hn", "papers"].map(s =>
        fetch(`/api/feeds?source=${s}`, { cache: "no-store" })
          .then(r => r.json())
          .then(d => (d.items ?? []) as FeedItem[])
          .catch(() => [] as FeedItem[])
      )
    ).then(results => { setAllItems(results.flat()); setLoading(false); });
  }, []);

  useEffect(() => {
    loadAll();
    timerRef.current = setInterval(loadAll, 5 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadAll]);

  const { nodes, edges } = useMemo(() => buildGraph(allItems), [allItems]);
  const laid = useMemo(() => nodes.length ? forceLayout(nodes, edges, W, H) : [], [nodes, edges]);
  const maxCount = useMemo(() => Math.max(...laid.map(n => n.count), 1), [laid]);

  // adjacency for hover dim
  const adjacent = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!m.has(e.a)) m.set(e.a, new Set());
      if (!m.has(e.b)) m.set(e.b, new Set());
      m.get(e.a)!.add(e.b);
      m.get(e.b)!.add(e.a);
    }
    return m;
  }, [edges]);

  const isNodeLit  = useCallback((id: string) =>
    !hovered || id === hovered || (adjacent.get(hovered)?.has(id) ?? false),
  [hovered, adjacent]);

  const isEdgeLit  = useCallback((e: TEdge) =>
    !hovered || e.a === hovered || e.b === hovered,
  [hovered]);

  const nodeR = (n: TNode) => 6 + (n.count / maxCount) * 22;

  const handleAdd = (item: FeedItem) => {
    startTransition(async () => {
      const res = await addToBacklogAction({
        title: item.title, description: item.description,
        sourceUrl: item.url, sourceName: item.source, tags: item.tags, stars: item.stars,
      });
      if (res.ok) { setAdded(prev => new Set([...prev, item.id])); router.refresh(); }
    });
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center rounded-xl" style={{ background: BG }}>
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#4ade80" }} />
    </div>
  );

  if (!laid.length) return (
    <div className="flex h-full items-center justify-center rounded-xl text-sm" style={{ background: BG, color: "#ffffff44" }}>
      No trend data
    </div>
  );

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ background: BG }}>

      {/* ── SVG graph ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          <defs>
            {/* glow filters */}
            <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-md" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="10" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* bg ambient glow */}
            <radialGradient id="bg-ambient" cx="50%" cy="50%" r="55%">
              <stop offset="0%"   stopColor="#1e1b4b" stopOpacity={0.5} />
              <stop offset="100%" stopColor={BG}      stopOpacity={0} />
            </radialGradient>

            {/* per-node radial fill — sphere look */}
            {laid.map((n, i) => {
              const c = nodeColor(n.id);
              return (
                <radialGradient key={i} id={`ng${i}`} cx="38%" cy="32%" r="68%">
                  <stop offset="0%"   stopColor="#ffffff" stopOpacity={0.88} />
                  <stop offset="38%"  stopColor={c}       stopOpacity={1} />
                  <stop offset="100%" stopColor={c}       stopOpacity={0.45} />
                </radialGradient>
              );
            })}
          </defs>

          {/* backgrounds */}
          <rect width={W} height={H} fill={BG} />
          <rect width={W} height={H} fill="url(#bg-ambient)" />

          {/* ── edges ──────────────────────────────────────────── */}
          {edges.map(e => {
            const a = laid.find(n => n.id === e.a);
            const b = laid.find(n => n.id === e.b);
            if (!a || !b) return null;
            const lit = isEdgeLit(e);
            const col = nodeColor(e.a);
            const op  = lit ? Math.min(0.12 + e.weight * 0.07, 0.6) : 0.025;
            const sw  = lit ? 0.6 + Math.min(e.weight * 0.25, 1.6) : 0.3;
            return (
              <line key={`${e.a}:${e.b}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={col} strokeOpacity={op} strokeWidth={sw}
                strokeLinecap="round"
              />
            );
          })}

          {/* ── nodes ──────────────────────────────────────────── */}
          {laid.map((n, i) => {
            const nr   = nodeR(n);
            const col  = nodeColor(n.id);
            const lit  = isNodeLit(n.id);
            const isSel = selected?.id === n.id;
            const isHov = hovered === n.id;
            const big  = nr > 16;
            const showLabel = big || isHov || isSel;

            return (
              <g key={n.id}
                style={{ cursor: "pointer" }}
                opacity={lit ? 1 : 0.15}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSel ? null : n)}
              >
                {/* outer corona — only for selected/hovered or large hub nodes */}
                {(isHov || isSel || big) && (
                  <circle cx={n.x} cy={n.y} r={nr * 2.2}
                    fill={col} fillOpacity={isHov || isSel ? 0.1 : 0.04}
                    filter="url(#glow-lg)"
                  />
                )}

                {/* mid halo */}
                <circle cx={n.x} cy={n.y} r={nr + 4}
                  fill={col}
                  fillOpacity={lit ? (isHov || isSel ? 0.22 : big ? 0.1 : 0.05) : 0.02}
                  filter="url(#glow-md)"
                />

                {/* core sphere */}
                <circle cx={n.x} cy={n.y} r={nr}
                  fill={`url(#ng${i})`}
                  stroke={col} strokeOpacity={0.85}
                  strokeWidth={isSel ? 2.5 : isHov ? 1.8 : 1}
                  filter={big ? "url(#glow-sm)" : undefined}
                />

                {/* label */}
                {showLabel && (
                  <text
                    x={n.x} y={n.y + nr + 13}
                    textAnchor="middle"
                    fontSize={big ? 10 : 9}
                    fill={col}
                    fillOpacity={isHov || isSel ? 1 : 0.75}
                    style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.02em", pointerEvents: "none" }}
                  >
                    {n.id.length > 13 ? `${n.id.slice(0, 12)}…` : n.id}
                  </text>
                )}

                {/* count badge for hub nodes */}
                {big && (
                  <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={nr > 20 ? 9 : 7}
                    fill="#ffffff" fillOpacity={0.7}
                    style={{ fontFamily: "ui-monospace, monospace", pointerEvents: "none", fontWeight: "bold" }}>
                    {n.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── selected items panel ───────────────────────────────── */}
      {selected ? (
        <div className="shrink-0 max-h-[200px] overflow-y-auto border-t"
          style={{ borderColor: "#ffffff0d", background: PANEL_BG }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 sticky top-0"
            style={{ background: PANEL_BG }}>
            <span className="text-[11px] font-semibold tracking-wide font-mono"
              style={{ color: nodeColor(selected.id) }}>
              #{selected.id}
            </span>
            <span className="text-[10px]" style={{ color: "#ffffff33" }}>
              {selected.items.length} item{selected.items.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => setSelected(null)}
              className="ml-auto transition-opacity hover:opacity-80"
              style={{ color: "#ffffff44" }}>
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="px-2 pb-3 space-y-0.5">
            {selected.items.slice(0, 8).map(item => (
              <div key={item.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 group transition-colors"
                style={{ cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#ffffff08")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium leading-snug line-clamp-1"
                    style={{ color: "#ffffffcc" }}>{item.title}</p>
                  <p className="text-[10px]" style={{ color: "#ffffff40" }}>{item.meta || item.source}</p>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="rounded p-1 transition-colors"
                      style={{ color: "#ffffff44" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ffffffcc")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#ffffff44")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button onClick={() => handleAdd(item)} disabled={added.has(item.id)}
                    className="rounded p-1 transition-colors"
                    style={{ color: added.has(item.id) ? "#4ade80" : "#ffffff44" }}
                    onMouseEnter={e => { if (!added.has(item.id)) (e.currentTarget as HTMLElement).style.color = "#4ade80"; }}
                    onMouseLeave={e => { if (!added.has(item.id)) (e.currentTarget as HTMLElement).style.color = "#ffffff44"; }}
                  >
                    {added.has(item.id) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── legend ─────────────────────────────────────────── */
        <div className="flex items-center gap-4 px-4 py-2.5 shrink-0 border-t text-[10px]"
          style={{ borderColor: "#ffffff0d", color: "#ffffff33" }}>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: "#4ade80" }} />
            hover to highlight
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: "#c084fc" }} />
            click to explore
          </span>
          <span className="ml-auto">
            {laid.length} topics · {edges.length} connections
          </span>
        </div>
      )}
    </div>
  );
}
