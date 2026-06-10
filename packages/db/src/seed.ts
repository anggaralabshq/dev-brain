/**
 * Seed script — populate DB with mock data from `lib/mock-data.ts`
 * Run with: pnpm --filter @devbrain/db seed
 */
import { db } from "./index";
import { users, projects, projectMembers } from "./schema";
import { eq } from "drizzle-orm";

// Inline seed data (subset of mock data)
const SEED_USERS = [
  { id: "11111111-1111-1111-1111-111111111111", email: "andi@devbrain.io", name: "Andi Pratama" },
  { id: "22222222-2222-2222-2222-222222222222", email: "siti@devbrain.io", name: "Siti Aisyah" },
  { id: "33333333-3333-3333-3333-333333333333", email: "budi@devbrain.io", name: "Budi Santoso" },
  { id: "44444444-4444-4444-4444-444444444444", email: "dewi@devbrain.io", name: "Dewi Lestari" },
];

const SEED_PROJECTS = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    slug: "ai-customer-service-bot",
    name: "AI Customer Service Bot",
    description: "AI-powered customer service chatbot that handles inquiries, integrates with knowledge base, and escalates to human agents when needed.",
    status: "active" as const,
    progress: 75,
    color: "violet",
    ownerId: "11111111-1111-1111-1111-111111111111",
    startDate: "2025-04-20",
    targetDate: "2025-06-30",
    starred: true,
    tags: ["AI", "Chatbot", "RAG", "Microservices"],
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    slug: "eldercare-monitoring",
    name: "ElderCare Monitoring",
    description: "Elderly health monitoring IoT platform",
    status: "active" as const,
    progress: 60,
    color: "emerald",
    ownerId: "22222222-2222-2222-2222-222222222222",
    startDate: "2025-03-10",
    targetDate: "2025-08-15",
    starred: true,
    tags: ["IoT", "Health", "Monitoring"],
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    slug: "devops-automation",
    name: "DevOps Automation",
    description: "CI/CD and infrastructure automation",
    status: "active" as const,
    progress: 90,
    color: "blue",
    ownerId: "33333333-3333-3333-3333-333333333333",
    startDate: "2025-02-01",
    targetDate: "2025-05-30",
    starred: true,
    tags: ["DevOps", "K8s", "CI/CD"],
  },
  {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    slug: "marketplace-api",
    name: "Marketplace API",
    description: "Multi-tenant marketplace backend",
    status: "planning" as const,
    progress: 30,
    color: "orange",
    ownerId: "44444444-4444-4444-4444-444444444444",
    startDate: "2025-05-01",
    targetDate: "2025-09-30",
    tags: ["API", "Multi-tenant"],
  },
];

const SEED_MEMBERS = [
  { projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", userId: "11111111-1111-1111-1111-111111111111", role: "owner" as const },
  { projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", userId: "22222222-2222-2222-2222-222222222222", role: "editor" as const },
  { projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", userId: "33333333-3333-3333-3333-333333333333", role: "editor" as const },
  { projectId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", userId: "22222222-2222-2222-2222-222222222222", role: "owner" as const },
  { projectId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", userId: "33333333-3333-3333-3333-333333333333", role: "editor" as const },
  { projectId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", userId: "44444444-4444-4444-4444-444444444444", role: "viewer" as const },
  { projectId: "cccccccc-cccc-cccc-cccc-cccccccccccc", userId: "33333333-3333-3333-3333-333333333333", role: "owner" as const },
  { projectId: "cccccccc-cccc-cccc-cccc-cccccccccccc", userId: "11111111-1111-1111-1111-111111111111", role: "editor" as const },
  { projectId: "dddddddd-dddd-dddd-dddd-dddddddddddd", userId: "44444444-4444-4444-4444-444444444444", role: "owner" as const },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Wipe existing data (idempotent reset)
  console.log("  Clearing existing data...");
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(users);

  // Users (using fixed UUIDs so member FK references work)
  console.log(`  Inserting ${SEED_USERS.length} users...`);
  await db.insert(users).values(SEED_USERS);

  // Projects
  console.log(`  Inserting ${SEED_PROJECTS.length} projects...`);
  await db.insert(projects).values(SEED_PROJECTS);

  // Members
  console.log(`  Inserting ${SEED_MEMBERS.length} project members...`);
  await db.insert(projectMembers).values(SEED_MEMBERS);

  // Verify
  const allProjects = await db.select().from(projects);
  const allMembers = await db.select().from(projectMembers);
  console.log(`\n✅ Seed complete!`);
  console.log(`   ${allProjects.length} projects in DB`);
  console.log(`   ${allMembers.length} memberships in DB`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
