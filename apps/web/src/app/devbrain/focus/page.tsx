import { getFocusAnalyticsAction, getTodayPanelAction } from "@/lib/actions/pomodoro";
import { FocusAnalytics } from "@/components/pomodoro/focus-analytics";
import { TodayPanel } from "@/components/pomodoro/today-panel";
import { StreakCard } from "@/components/pomodoro/streak-card";

export default async function FocusPage() {
  const [analytics, todayData] = await Promise.all([
    getFocusAnalyticsAction("30d"),
    getTodayPanelAction(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Focus Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your focus sessions, project distribution, and productivity trends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {todayData.ok && (
          <TodayPanel data={{
            todayTasks: todayData.todayTasks,
            dailyGoal: todayData.dailyGoal,
            completedToday: todayData.completedToday,
          }} />
        )}
        {analytics.ok && (
          <StreakCard data={{
            current: analytics.streak.current,
            longest: analytics.streak.longest,
            heatmap: analytics.heatmap,
          }} />
        )}
      </div>

      <FocusAnalytics initialData={analytics} />
    </div>
  );
}
