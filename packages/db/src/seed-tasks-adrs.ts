/**
 * Seed tasks and ADRs.
 */
import { db } from "./index";
import { tasks, adrs } from "./schema";

const BOT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // AI Customer Service Bot
const ELDER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DEVOPS = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const MARKETPLACE = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ANDI = "11111111-1111-1111-1111-111111111111";
const SITI = "22222222-2222-2222-2222-222222222222";
const BUDI = "33333333-3333-3333-3333-333333333333";
const DEWI = "44444444-4444-4444-4444-444444444444";

const SEED_TASKS = [
  // AI Bot project
  { projectId: BOT, title: "Implement rate limiting middleware", description: "Add token bucket rate limiter to API Gateway", status: "done", priority: "high", assigneeId: BUDI, dueDate: "2025-05-25" },
  { projectId: BOT, title: "Add unit tests for auth service", description: "Cover all auth flows with Jest tests", status: "in_progress", priority: "medium", assigneeId: SITI, dueDate: "2025-05-27" },
  { projectId: BOT, title: "Optimize RAG retrieval performance", description: "Reduce p95 latency from 800ms to 400ms", status: "todo", priority: "high", assigneeId: ANDI, dueDate: "2025-06-01" },
  { projectId: BOT, title: "Setup monitoring and alerting", description: "Configure Datadog dashboards", status: "todo", priority: "low", assigneeId: BUDI, dueDate: "2025-06-03" },
  { projectId: BOT, title: "Migrate from Kafka to RabbitMQ", description: "ADR #12 - improve message queue reliability", status: "in_review", priority: "urgent", assigneeId: ANDI, dueDate: "2025-05-30" },
  { projectId: BOT, title: "Add multi-language support", description: "i18n for ID, EN, MS", status: "todo", priority: "medium", assigneeId: null, dueDate: null },

  // ElderCare
  { projectId: ELDER, title: "Calibrate heart rate sensor", description: "Tune sensor for elderly skin types", status: "in_progress", priority: "high", assigneeId: BUDI, dueDate: "2025-06-10" },
  { projectId: ELDER, title: "Setup MQTT broker", description: "HiveMQ for IoT device communication", status: "done", priority: "high", assigneeId: SITI, dueDate: "2025-05-15" },
  { projectId: ELDER, title: "Design caregiver dashboard", description: "Figma mockups for v1", status: "todo", priority: "medium", assigneeId: DEWI, dueDate: "2025-06-20" },

  // DevOps
  { projectId: DEVOPS, title: "Migrate to GitHub Actions", description: "Replace Jenkins with GHA", status: "done", priority: "high", assigneeId: BUDI, dueDate: "2025-04-15" },
  { projectId: DEVOPS, title: "Setup ArgoCD", description: "GitOps for K8s deployments", status: "in_progress", priority: "high", assigneeId: BUDI, dueDate: "2025-05-30" },
  { projectId: DEVOPS, title: "Configure Vault", description: "Secrets management for all services", status: "todo", priority: "urgent", assigneeId: ANDI, dueDate: "2025-06-05" },

  // Marketplace
  { projectId: MARKETPLACE, title: "Define tenant isolation strategy", description: "Row-level vs schema-per-tenant", status: "in_progress", priority: "high", assigneeId: DEWI, dueDate: "2025-06-15" },
  { projectId: MARKETPLACE, title: "API design review", description: "Review OpenAPI spec with stakeholders", status: "todo", priority: "medium", assigneeId: ANDI, dueDate: "2025-06-20" },
];

const SEED_ADRS = [
  {
    projectId: BOT, number: 12, title: "Use RabbitMQ instead of Kafka",
    status: "accepted",
    context: "We initially chose Kafka for message queuing, but our team lacks operational expertise and our throughput requirements (~1000 msg/s) don't justify the operational complexity.",
    decision: "Adopt RabbitMQ for our message queue. It provides sufficient throughput with simpler operations, better fit for our team skills.",
    consequences: "Easier ops, less complex deployment. May need to revisit if we exceed 10K msg/s sustained. Lose Kafka's stronger stream processing features.",
    decisionDate: "2025-05-10",
    authorId: ANDI,
  },
  {
    projectId: BOT, number: 11, title: "Microservices Architecture",
    status: "accepted",
    context: "Need to decide between monolithic and microservices architecture for the customer service bot platform.",
    decision: "Adopt microservices architecture with clear service boundaries: API Gateway, Auth, Chat, AI, Notification, Task, Escalation services.",
    consequences: "Independent deployability per service. Higher operational complexity. Need robust observability and CI/CD pipelines.",
    decisionDate: "2025-04-25",
    authorId: ANDI,
  },
  {
    projectId: BOT, number: 10, title: "Use RAG for better accuracy",
    status: "accepted",
    context: "Initial prototype used pure LLM responses, which produced hallucinated answers and lacked domain knowledge.",
    decision: "Implement Retrieval Augmented Generation (RAG) using pgvector for embedding storage. Retrieve relevant context from knowledge base before generating responses.",
    consequences: "Significantly improved answer accuracy. Need to maintain embedding pipeline and knowledge base. Slight increase in latency (~200ms).",
    decisionDate: "2025-05-01",
    authorId: SITI,
  },
  {
    projectId: BOT, number: 9, title: "Use PostgreSQL as primary database",
    status: "proposed",
    context: "Need to choose primary database for transactional data, knowledge embeddings, and session storage.",
    decision: "Use PostgreSQL 16 with pgvector extension. Single source of truth reduces operational complexity.",
    consequences: "TBD - pending team review",
    decisionDate: null,
    authorId: ANDI,
  },
  {
    projectId: ELDER, number: 3, title: "MQTT for IoT communication",
    status: "accepted",
    context: "IoT devices need lightweight, reliable messaging protocol with low power consumption.",
    decision: "Use MQTT 5.0 with QoS 1 for device-to-cloud communication. HiveMQ as the broker.",
    consequences: "Lower device power consumption, reliable delivery, but need to manage broker HA.",
    decisionDate: "2025-03-15",
    authorId: SITI,
  },
  {
    projectId: DEVOPS, number: 5, title: "GitOps with ArgoCD",
    status: "proposed",
    context: "Need declarative, Git-driven deployment workflow for K8s clusters.",
    decision: "Adopt ArgoCD for GitOps. All deployments tracked in Git, ArgoCD reconciles state automatically.",
    consequences: "Audit trail via Git history. Faster incident response. Need to maintain app manifests carefully.",
    decisionDate: null,
    authorId: BUDI,
  },
];

async function seed() {
  console.log("🌱 Seeding tasks & ADRs...\n");

  await db.delete(tasks);
  await db.delete(adrs);

  console.log(`  Inserting ${SEED_TASKS.length} tasks...`);
  for (const t of SEED_TASKS) {
    await db.insert(tasks).values({
      ...t,
      completedAt: t.status === "done" ? new Date() : null,
    });
  }

  console.log(`  Inserting ${SEED_ADRS.length} ADRs...`);
  for (const a of SEED_ADRS) {
    await db.insert(adrs).values(a);
  }

  const tCount = await db.select().from(tasks);
  const aCount = await db.select().from(adrs);
  console.log(`\n✅ Seeded ${tCount.length} tasks, ${aCount.length} ADRs`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
