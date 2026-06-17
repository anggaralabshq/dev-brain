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

// ── GitHub: AI repos trending (last 30 days, sorted by stars) ────
async function fetchGitHub(): Promise<FeedItem[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const q = encodeURIComponent(
    `topic:llm OR topic:ai-agent OR topic:generative-ai OR topic:machine-learning created:>${since}`
  );
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((r: {
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
    tags: r.topics.slice(0, 4),
    stars: r.stargazers_count,
  }));
}

// ── HN: AI/ML discussions ────────────────────────────────────────
async function fetchHN(): Promise<FeedItem[]> {
  const cutoff = Math.floor((Date.now() - 7 * 86400000) / 1000);
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?tags=story&query=AI+LLM+agent+RAG&numericFilters=created_at_i>${cutoff},points>10&hitsPerPage=15`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.hits ?? [])
    .filter((h: { url?: string }) => h.url)
    .map((h: {
      objectID: string; title: string; url: string;
      points: number; num_comments: number; _tags: string[];
    }) => ({
      id: `hn-${h.objectID}`,
      title: h.title,
      description: "",
      url: h.url,
      source: "hn" as const,
      meta: `🔥 ${h.points} pts · 💬 ${h.num_comments}`,
      tags: [],
    }));
}

// ── Papers With Code: latest AI papers ──────────────────────────
async function fetchPapers(): Promise<FeedItem[]> {
  const res = await fetch(
    "https://paperswithcode.com/api/v1/papers/?ordering=-published&format=json&page_size=15",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results ?? []).map((p: {
    id: string; title: string; abstract: string;
    paper_url: string; github_url: string | null; stars: number | null;
    authors: string[];
  }) => ({
    id: `pw-${p.id}`,
    title: p.title,
    description: p.abstract ? p.abstract.slice(0, 200) + "…" : "",
    url: p.paper_url,
    source: "papers" as const,
    meta: [
      p.stars != null ? `⭐ ${p.stars}` : null,
      p.github_url ? "📦 Code" : null,
    ].filter(Boolean).join(" · "),
    tags: ["paper"],
    stars: p.stars ?? undefined,
  }));
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") ?? "github";

  try {
    let items: FeedItem[] = [];
    if (source === "github") items = await fetchGitHub();
    else if (source === "hn") items = await fetchHN();
    else if (source === "papers") items = await fetchPapers();

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
