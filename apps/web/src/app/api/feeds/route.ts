import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "github" | "hn" | "papers";
  meta: string;
  tags: string[];
  stars?: number;
};

// ── GitHub: rotate topic queries every 5 min, sort by recently updated ────────
const GH_TOPICS = [
  "topic:llm",
  "topic:ai-agent",
  "topic:machine-learning",
  "topic:generative-ai",
  "topic:large-language-model",
  "topic:rag",
  "topic:fine-tuning",
  "topic:transformer",
];
const SLOT_MS = 5 * 60 * 1000;

async function fetchGitHub(): Promise<FeedItem[]> {
  const slot  = Math.floor(Date.now() / SLOT_MS);
  const topic = GH_TOPICS[slot % GH_TOPICS.length];
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const q = encodeURIComponent(`${topic} pushed:>${since}`);
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevBrain-App",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("[feeds/github] status:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  if (!Array.isArray(data.items)) {
    console.error("[feeds/github] unexpected shape:", JSON.stringify(data).slice(0, 200));
    return [];
  }

  return data.items.map((r: {
    id: number; full_name: string; description: string | null;
    html_url: string; stargazers_count: number; language: string | null; topics: string[];
  }) => ({
    id: `gh-${r.id}`,
    title: r.full_name,
    description: r.description ?? "",
    url: r.html_url,
    source: "github" as const,
    meta: [
      `⭐ ${r.stargazers_count >= 1000 ? `${(r.stargazers_count / 1000).toFixed(1)}k` : r.stargazers_count}`,
      r.language ?? "",
    ].filter(Boolean).join(" · "),
    tags: (r.topics ?? []).slice(0, 4),
    stars: r.stargazers_count,
  }));
}

// ── HN: AI/ML stories (sorted by date, last 7 days) ─────────────
async function fetchHN(): Promise<FeedItem[]> {
  // search_by_date returns newest first; filter client-side for AI topics
  const res = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story&query=LLM+AI+agent+machine+learning&hitsPerPage=20",
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("[feeds/hn] status:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  return (data.hits ?? [])
    .filter((h: { url?: string; points?: number }) => !!h.url && (h.points ?? 0) >= 5)
    .slice(0, 15)
    .map((h: {
      objectID: string; title: string; url: string;
      points: number; num_comments: number;
    }) => ({
      id: `hn-${h.objectID}`,
      title: h.title,
      description: "",
      url: h.url,
      source: "hn" as const,
      meta: `🔥 ${h.points ?? 0} pts · 💬 ${h.num_comments ?? 0}`,
      tags: [],
    }));
}

// ── ArXiv: latest AI/ML papers ───────────────────────────────────
async function fetchPapers(): Promise<FeedItem[]> {
  const res = await fetch(
    "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=15",
    {
      headers: { "User-Agent": "DevBrain-App" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("[feeds/papers] arxiv status:", res.status);
    return [];
  }

  const xml = await res.text();

  // Parse Atom XML entries with regex — no xml2js dependency needed
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  return entries.slice(0, 15).map((match, i) => {
    const entry = match[1];
    const id    = (entry.match(/<id>(.*?)<\/id>/) ?? [])[1]?.trim() ?? "";
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1]
      ?.replace(/\s+/g, " ").trim() ?? "Untitled";
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) ?? [])[1]
      ?.replace(/\s+/g, " ").trim() ?? "";
    const arxivId = id.split("/abs/")[1]?.replace("v1","").replace(/v\d+$/,"") ?? `${i}`;
    const url = id.startsWith("http") ? id : `https://arxiv.org/abs/${arxivId}`;

    return {
      id: `arxiv-${arxivId}`,
      title,
      description: summary.slice(0, 200) + (summary.length > 200 ? "…" : ""),
      url,
      source: "papers" as const,
      meta: `📄 arXiv · ${arxivId}`,
      tags: ["paper"],
    };
  });
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") ?? "github";

  try {
    let items: FeedItem[] = [];
    if (source === "github") items = await fetchGitHub();
    else if (source === "hn") items = await fetchHN();
    else if (source === "papers") items = await fetchPapers();

    if (source === "github") {
    const slot  = Math.floor(Date.now() / SLOT_MS);
    console.log(`[feeds/github] slot ${slot % GH_TOPICS.length} → ${GH_TOPICS[slot % GH_TOPICS.length]}, ${items.length} items`);
  } else {
    console.log(`[feeds/${source}] returning ${items.length} items`);
  }
    return NextResponse.json({ items });
  } catch (err) {
    console.error(`[feeds/${source}] error:`, err);
    return NextResponse.json({ items: [], error: String(err) });
  }
}
