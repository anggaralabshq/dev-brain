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
  const allProjects = user ? await getAllProjects(user.id).catch(() => []) : [];
  let unreadCount = 0;
  if (user) {
    try {
      const [notifItems, seenAt] = await Promise.all([
        getNotifications(user.id),
        getNotificationsSeenAt(user.id),
      ]);
      unreadCount = notifItems.filter((n) => !seenAt || n.timestamp > seenAt).length;
    } catch {
      // notifications_seen_at column may not exist yet in production — degrade gracefully
    }
  }
  const starredProjects = allProjects
    .filter((p) => p.starred)
    .slice(0, 5)
    .map((p) => ({ slug: p.slug, name: p.name, color: p.color }));
  const projectCount = allProjects.length;
  // Theme init script — reads localStorage before first paint (no flash). Static string, no XSS risk.
  const themeScript = `(function(){try{var t=localStorage.getItem('devbrain:theme')||'dark';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})()`;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* nosec: static string, no user input */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <AppShellWrapper user={user} starredProjects={starredProjects} projectCount={projectCount} unreadCount={unreadCount}>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
