import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import type { CurrentUser } from "@/lib/auth/current-user";

type StarredProject = { slug: string; name: string; color: string };

export function AppShell({
  user,
  starredProjects = [],
  children,
}: {
  user: CurrentUser | null;
  starredProjects?: StarredProject[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={user} starredProjects={starredProjects} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
