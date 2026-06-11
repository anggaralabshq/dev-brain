import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShellWrapper } from "@/components/app-shell-wrapper";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAllProjects } from "@/lib/db/projects";
import { getNotifications, getNotificationsSeenAt } from "@/lib/db/notifications";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevBrain — Second Brain for Developers",
  description:
    "Knowledge management untuk developer. Notes, ADRs, architecture diagrams, tasks — semua terhubung dalam satu knowledge graph.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const [allProjects, notifData] = await Promise.all([
    user ? getAllProjects(user.id) : Promise.resolve([]),
    user
      ? Promise.all([getNotifications(user.id), getNotificationsSeenAt(user.id)])
      : Promise.resolve([[], null] as [Awaited<ReturnType<typeof getNotifications>>, Date | null]),
  ]);
  const [notifItems, seenAt] = notifData;
  const unreadCount = user
    ? notifItems.filter((n) => !seenAt || n.timestamp > seenAt).length
    : 0;
  const starredProjects = allProjects
    .filter((p) => p.starred)
    .slice(0, 5)
    .map((p) => ({ slug: p.slug, name: p.name, color: p.color }));
  const projectCount = allProjects.length;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full" suppressHydrationWarning>
        <AppShellWrapper user={user} starredProjects={starredProjects} projectCount={projectCount} unreadCount={unreadCount}>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
