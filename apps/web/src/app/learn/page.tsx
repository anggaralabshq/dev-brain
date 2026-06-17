import { getCurrentUser } from "@/lib/auth/current-user";
import { getLearningItemsByUser } from "@/lib/db/learning";
import { LearningBoard } from "@/components/learn/learning-board";
import { FeedPanel } from "@/components/learn/feed-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss, BookOpen, CheckCircle2, Inbox } from "lucide-react";

export default async function LearnPage() {
  const user = await getCurrentUser();
  const items = user ? await getLearningItemsByUser(user.id).catch(() => []) : [];

  const backlog  = items.filter(i => i.status === "backlog").length;
  const learning = items.filter(i => i.status === "learning").length;
  const done     = items.filter(i => i.status === "done").length;

  return (
    <div className="flex h-full flex-col gap-4 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">AI Learning Radar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track trending tech and skills — curated feed + personal learning board
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{backlog} backlog</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5">
            <BookOpen className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">{learning} learning</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{done} done</span>
          </div>
        </div>
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
            <FeedPanel onItemAdded={() => {}} />
          </CardContent>
        </Card>

        {/* Learning board — right */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm">My Learning Board</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 px-4 pb-4 pt-0">
            <LearningBoard initialItems={items} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
