import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnggaraLabs",
  description: "Superapps for developers.",
};

// Reads localStorage before first paint — no flash on theme load. Static string, no XSS risk.
const themeScript = `(function(){try{var t=localStorage.getItem('devbrain:theme:v2')||'dark';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {children}
      </body>
    </html>
  );
}
