import { getCurrentUser } from "@/lib/auth/current-user";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full">
      <SettingsClient user={user} />
    </div>
  );
}
