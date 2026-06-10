import { getFocusAnalyticsAction } from "@/lib/actions/pomodoro";
import { FocusAnalytics } from "@/components/pomodoro/focus-analytics";

export default async function FocusPage() {
  const data = await getFocusAnalyticsAction("30d");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Focus Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your focus sessions, project distribution, and productivity trends.
        </p>
      </div>
      <FocusAnalytics initialData={data} />
    </div>
  );
}
