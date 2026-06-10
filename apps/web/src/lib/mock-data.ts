// Shared mock data — akan diganti dengan DB queries di Step 3

export type ProjectStatus = "active" | "planning" | "on-hold" | "archived";
export type ProjectMember = {
  id: string;
  name: string;
  initials: string;
  color: string; // tailwind bg class
  role: "Owner" | "Editor" | "Viewer";
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0-100
  color: string; // accent color class
  members: ProjectMember[];
  notesCount: number;
  tasksCount: number;
  starred?: boolean;
  startDate: string;
  targetDate: string;
  tags: string[];
  ownerId: string;
};

const members: Record<string, ProjectMember> = {
  u1: { id: "u1", name: "Andi Pratama", initials: "AP", color: "bg-violet-500", role: "Owner" },
  u2: { id: "u2", name: "Siti Aisyah", initials: "SA", color: "bg-emerald-500", role: "Editor" },
  u3: { id: "u3", name: "Budi Santoso", initials: "BS", color: "bg-blue-500", role: "Editor" },
  u4: { id: "u4", name: "Dewi Lestari", initials: "DL", color: "bg-orange-500", role: "Viewer" },
  u5: { id: "u5", name: "Rina Wijaya", initials: "RW", color: "bg-pink-500", role: "Editor" },
  u6: { id: "u6", name: "Fajar Nugroho", initials: "FN", color: "bg-cyan-500", role: "Editor" },
  u7: { id: "u7", name: "Maya Sari", initials: "MS", color: "bg-yellow-500", role: "Viewer" },
};

export const allMembers = Object.values(members);

export const projects: Project[] = [
  {
    id: "p1",
    slug: "ai-customer-service-bot",
    name: "AI Customer Service Bot",
    description: "AI chatbot with RAG and function calling",
    status: "active",
    progress: 75,
    color: "violet",
    members: [members.u1, members.u2, members.u3],
    notesCount: 128,
    tasksCount: 12,
    starred: true,
    startDate: "2025-04-20",
    targetDate: "2025-06-30",
    tags: ["AI", "Chatbot", "RAG", "Microservices"],
    ownerId: "u1",
  },
  {
    id: "p2",
    slug: "eldercare-monitoring",
    name: "ElderCare Monitoring",
    description: "Elderly health monitoring IoT platform",
    status: "active",
    progress: 60,
    color: "emerald",
    members: [members.u2, members.u3, members.u4],
    notesCount: 96,
    tasksCount: 8,
    starred: true,
    startDate: "2025-03-10",
    targetDate: "2025-08-15",
    tags: ["IoT", "Health", "Monitoring"],
    ownerId: "u2",
  },
  {
    id: "p3",
    slug: "devops-automation",
    name: "DevOps Automation",
    description: "CI/CD and infrastructure automation",
    status: "active",
    progress: 90,
    color: "blue",
    members: [members.u3, members.u1, members.u5, members.u6],
    notesCount: 72,
    tasksCount: 18,
    starred: true,
    startDate: "2025-02-01",
    targetDate: "2025-05-30",
    tags: ["DevOps", "K8s", "CI/CD"],
    ownerId: "u3",
  },
  {
    id: "p4",
    slug: "marketplace-api",
    name: "Marketplace API",
    description: "Multi-tenant marketplace backend",
    status: "planning",
    progress: 30,
    color: "orange",
    members: [members.u4, members.u5, members.u6],
    notesCount: 45,
    tasksCount: 7,
    startDate: "2025-05-01",
    targetDate: "2025-09-30",
    tags: ["API", "Multi-tenant"],
    ownerId: "u4",
  },
  {
    id: "p5",
    slug: "personal-finance-tracker",
    name: "Personal Finance Tracker",
    description: "Privacy-first personal finance app",
    status: "on-hold",
    progress: 15,
    color: "pink",
    members: [members.u1, members.u5],
    notesCount: 18,
    tasksCount: 3,
    startDate: "2025-05-05",
    targetDate: "2025-10-15",
    tags: ["FinTech", "Mobile"],
    ownerId: "u1",
  },
  {
    id: "p6",
    slug: "blog-platform",
    name: "Blog Platform",
    description: "Developer-focused blogging platform",
    status: "active",
    progress: 50,
    color: "cyan",
    members: [members.u2, members.u5, members.u7],
    notesCount: 32,
    tasksCount: 6,
    startDate: "2025-04-30",
    targetDate: "2025-07-15",
    tags: ["Blog", "CMS"],
    ownerId: "u2",
  },
  {
    id: "p7",
    slug: "mobile-app-boilerplate",
    name: "Mobile App Boilerplate",
    description: "React Native starter template",
    status: "archived",
    progress: 100,
    color: "yellow",
    members: [members.u3, members.u6],
    notesCount: 24,
    tasksCount: 0,
    startDate: "2025-01-15",
    targetDate: "2025-04-20",
    tags: ["Mobile", "Template"],
    ownerId: "u3",
  },
  {
    id: "p8",
    slug: "data-analytics-pipeline",
    name: "Data Analytics Pipeline",
    description: "ETL and analytics infrastructure",
    status: "archived",
    progress: 100,
    color: "emerald",
    members: [members.u4, members.u6, members.u7],
    notesCount: 56,
    tasksCount: 0,
    startDate: "2024-11-01",
    targetDate: "2025-04-12",
    tags: ["Data", "Analytics"],
    ownerId: "u4",
  },
];

export const starredProjects = projects.filter((p) => p.starred);

export const activityFeed = [
  { id: "a1", type: "diagram", text: "Architecture diagram updated", project: "AI Customer Service Bot", when: "2h ago", actor: members.u1 },
  { id: "a2", type: "adr", text: "ADR #12 added", project: "AI Customer Service Bot", when: "4h ago", actor: members.u1 },
  { id: "a3", type: "meeting", text: "Meeting notes — Sprint Planning", project: "ElderCare Monitoring", when: "6h ago", actor: members.u2 },
  { id: "a4", type: "api", text: "API Design updated", project: "Marketplace API", when: "1d ago", actor: members.u4 },
  { id: "a5", type: "task", text: "Task completed: Implement rate limiting", project: "AI Customer Service Bot", when: "1d ago", actor: members.u3 },
  { id: "a6", type: "repo", text: "Repository connected", project: "DevOps Automation", when: "2d ago", actor: members.u1 },
];

export const upcoming = [
  { id: "u1", date: "May 18", title: "Sprint Planning", project: "AI Customer Service Bot", time: "10:00 AM", color: "violet" },
  { id: "u2", date: "May 20", title: "Architecture Review", project: "ElderCare Monitoring", time: "02:00 PM", color: "emerald" },
  { id: "u3", date: "May 22", title: "Deployment", project: "DevOps Automation", time: "09:00 AM", color: "blue" },
  { id: "u4", date: "May 24", title: "Stakeholder Meeting", project: "Marketplace API", time: "11:00 AM", color: "orange" },
];

export type ProjectStats = {
  totalProjects: number;
  totalNotes: number;
  totalWhiteboards: number;
  totalADRs: number;
  totalTasks: number;
  totalFiles: string;
};

export type RecentlyViewedItem = {
  id: string;
  title: string;
  type: "diagram" | "adr" | "meeting" | "api" | "task" | "repo";
  project: string;
  when: string;
};

export const recentlyViewed: RecentlyViewedItem[] = [
  { id: "rv1", title: "ADR #32 — Use PostgreSQL as primary DB", type: "adr", project: "AI Customer Service Bot", when: "5m ago" },
  { id: "rv2", title: "Architecture Diagram v3", type: "diagram", project: "ElderCare Monitoring", when: "1h ago" },
  { id: "rv3", title: "API Design — Auth endpoints", type: "api", project: "Marketplace API", when: "2h ago" },
  { id: "rv4", title: "Sprint Planning notes", type: "meeting", project: "DevOps Automation", when: "4h ago" },
  { id: "rv5", title: "Deployment Runbook", type: "repo", project: "DevOps Automation", when: "1d ago" },
];

// Computed stats from current data
export function computeProjectStats(): ProjectStats {
  return {
    totalProjects: projects.length,
    totalNotes: projects.reduce((s, p) => s + p.notesCount, 0),
    totalWhiteboards: 64,
    totalADRs: 32,
    totalTasks: projects.reduce((s, p) => s + p.tasksCount, 0),
    totalFiles: "1.2 GB",
  };
}
