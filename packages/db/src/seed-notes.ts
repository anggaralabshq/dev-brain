/**
 * Seed script for sample notes — exercises the [[link]] syntax & backlinks.
 */
import { db } from "./index";
import { users, projects, notes } from "./schema";
import { eq } from "drizzle-orm";

const ANDI = "11111111-1111-1111-1111-111111111111"; // Andi
const BOT_PROJECT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // AI Customer Service Bot

const SEED_NOTES = [
  {
    slug: "system-architecture-overview",
    title: "System Architecture Overview",
    content: `<h1>System Architecture Overview</h1>
<p>This document provides a high-level overview of the system architecture for the AI Customer Service Bot.</p>
<p>The system is designed to handle customer inquiries, provide accurate responses using RAG, and escalate to human agents when necessary.</p>
<h2>High-level Architecture</h2>
<p>The system is built with a microservices architecture. See <strong>[[api-design-principles]]</strong> for the API contracts.</p>
<p>For the implementation details of the RAG service, see <strong>[[rag-implementation-plan]]</strong>.</p>
<h2>Key Principles</h2>
<ul>
<li><strong>Scalability:</strong> All services are stateless and can be scaled horizontally.</li>
<li><strong>Reliability:</strong> Implement retries, circuit breakers, and graceful degradation.</li>
<li><strong>Security:</strong> All communication is over HTTPS and sensitive data is encrypted.</li>
<li><strong>Observability:</strong> Centralized logging, metrics, and tracing.</li>
</ul>`,
    projectId: BOT_PROJECT,
    authorId: ANDI,
    pinned: true,
    tags: ["architecture", "overview", "system"],
  },
  {
    slug: "api-design-principles",
    title: "API Design Principles",
    content: `<h1>API Design Principles</h1>
<p>Our API follows REST conventions with these key principles:</p>
<ul>
<li>Resource-oriented URLs</li>
<li>Standard HTTP methods (GET, POST, PUT, DELETE)</li>
<li>JSON for request/response bodies</li>
<li>Authentication via Bearer tokens</li>
<li>Versioning via URL prefix (<code>/api/v1/...</code>)</li>
</ul>
<p>For error handling conventions, see <strong>[[error-handling-strategy]]</strong>.</p>
<p>For the actual schemas, see <strong>[[database-schema-design]]</strong>.</p>`,
    projectId: BOT_PROJECT,
    authorId: ANDI,
    pinned: false,
    tags: ["api", "design"],
  },
  {
    slug: "rag-implementation-plan",
    title: "RAG Implementation Plan",
    content: `<h1>RAG Implementation Plan</h1>
<p>Retrieval Augmented Generation pipeline for the AI service.</p>
<h2>Phases</h2>
<ol>
<li>Document ingestion & embedding generation</li>
<li>Vector database setup with pgvector</li>
<li>Retrieval pipeline with re-ranking</li>
<li>Generation with context injection</li>
</ol>
<p>The architecture is described in <strong>[[system-architecture-overview]]</strong>.</p>
<p>For tech stack choices, see <strong>[[api-design-principles]]</strong>.</p>`,
    projectId: BOT_PROJECT,
    authorId: ANDI,
    pinned: false,
    tags: ["rag", "ai", "implementation"],
  },
  {
    slug: "error-handling-strategy",
    title: "Error Handling Strategy",
    content: `<h1>Error Handling Strategy</h1>
<p>All API errors return a standard JSON envelope:</p>
<pre><code>{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human-readable description",
    "details": { ... }
  }
}</code></pre>
<p>Status codes follow REST conventions. Reference: <strong>[[api-design-principles]]</strong>.</p>`,
    projectId: BOT_PROJECT,
    authorId: ANDI,
    pinned: false,
    tags: ["api", "errors"],
  },
  {
    slug: "database-schema-design",
    title: "Database Schema Design",
    content: `<h1>Database Schema Design</h1>
<p>Schema overview for the customer service bot platform.</p>
<p>Tables: users, projects, project_members, notes, accounts, sessions.</p>
<p>See <strong>[[api-design-principles]]</strong> for how the schema is exposed via API.</p>`,
    projectId: BOT_PROJECT,
    authorId: ANDI,
    pinned: false,
    tags: ["database", "schema"],
  },
  {
    slug: "personal-welcome",
    title: "Welcome to DevBrain",
    content: `<h1>Welcome to your DevBrain</h1>
<p>This is a personal note (not tied to any project). Use this space for cross-project ideas, daily notes, or scratchpad.</p>
<p>Project notes like <strong>[[system-architecture-overview]]</strong> are scoped to a project.</p>
<p>Try creating a new note with <code>[[some-link]]</code> syntax!</p>`,
    projectId: null,
    authorId: ANDI,
    pinned: true,
    tags: ["welcome", "personal"],
  },
];

async function seed() {
  console.log("🌱 Seeding notes...\n");
  await db.delete(notes);

  for (const n of SEED_NOTES) {
    const excerpt = n.content
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    await db.insert(notes).values({
      ...n,
      content: n.content,
      excerpt,
    });
    console.log(`  ✓ ${n.title}`);
  }

  const all = await db.select().from(notes);
  console.log(`\n✅ Seeded ${all.length} notes`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
