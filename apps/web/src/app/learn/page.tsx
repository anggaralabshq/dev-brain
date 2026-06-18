import { TrendGraph } from "@/components/learn/trend-graph";
import { FeedPanel } from "@/components/learn/feed-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss } from "lucide-react";

export default function LearnPage() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">AI Learning Radar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Trending tech across GitHub, HN &amp; arXiv — visualised as a knowledge graph
        </p>
      </div>

      {/* Main layout */}
      <div className="flex min-h-0 flex-1 gap-4">

        {/* Feed panel — left */}
        <Card className="w-[320px] shrink-0 flex flex-col">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Rss className="h-4 w-4 text-primary" />
              Live Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 px-4 pb-4 pt-0">
            <FeedPanel />
          </CardContent>
        </Card>

        {/* Knowledge graph — right */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 shrink-0">
            <CardTitle className="text-sm">Trend Knowledge Graph</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <TrendGraph />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
