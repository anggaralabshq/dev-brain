import { getFocusAnalyticsAction, getTodayPanelAction } from "@/lib/actions/pomodoro";
import { FocusAnalytics } from "@/components/pomodoro/focus-analytics";
import { TodayPanel } from "@/components/pomodoro/today-panel";

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

      {todayData.ok && (
        <TodayPanel data={{
          todayTasks: todayData.todayTasks,
          dailyGoal: todayData.dailyGoal,
          completedToday: todayData.completedToday,
        }} />
      )}

      <FocusAnalytics initialData={analytics} />
    </div>
  );
}
