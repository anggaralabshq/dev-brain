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

// ── GitHub: AI repos sorted by stars (last 30 days) ──────────────
async function fetchGitHub(): Promise<FeedItem[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  // Simple query — no OR between topics (GitHub search OR is unreliable)
  const q = encodeURIComponent(`topic:llm created:>${since}`);
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`,
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

// ── HN: AI/ML stories ────────────────────────────────────────────
async function fetchHN(): Promise<FeedItem[]> {
  const cutoff = Math.floor((Date.now() - 7 * 86400000) / 1000);
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?tags=story&query=LLM+AI+agent&numericFilters=created_at_i%3E${cutoff},points%3E5&hitsPerPage=15`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("[feeds/hn] status:", res.status);
    return [];
  }

  const data = await res.json();
  return (data.hits ?? [])
    .filter((h: { url?: string }) => !!h.url)
    .map((h: {
      objectID: string; title: string; url: string;
      points: number; num_comments: number;
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
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("[feeds/papers] status:", res.status);
    return [];
  }

  const data = await res.json();
  return (data.results ?? []).map((p: {
    id: string; title: string; abstract: string;
    paper_url: string; github_url: string | null; stars: number | null;
  }) => ({
    id: `pw-${p.id}`,
    title: p.title,
    description: p.abstract ? p.abstract.slice(0, 200) + "…" : "",
    url: p.paper_url,
    source: "papers" as const,
    meta: [
      p.stars != null ? `⭐ ${p.stars}` : null,
      p.github_url ? "📦 Code" : null,
    ].filter(Boolean).join(" · ") || "📄 Paper",
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

    console.log(`[feeds/${source}] returning ${items.length} items`);
    return NextResponse.json({ items });
  } catch (err) {
    console.error(`[feeds/${source}] error:`, err);
    return NextResponse.json({ items: [], error: String(err) });
  }
}
