# DevBrain

Personal knowledge management and project workspace. Manage projects, notes, tasks, ADRs, architecture diagrams, and meetings in one place.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL 16** + Drizzle ORM
- **Auth.js** (credentials + GitHub OAuth)
- **tldraw v5** for architecture diagrams
- **Radix UI** + Tailwind CSS
- **pnpm workspaces** monorepo
- **Docker Compose** for local development

## Structure

```
dev-brain/
├── apps/
│   └── web/          # Next.js application
├── packages/
│   └── db/           # Drizzle schema, migrations, seed data
├── docker-compose.yml
└── .env.example
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ and pnpm (for local dev without Docker)

### 1. Clone and configure

```bash
git clone https://github.com/anggaralabshq/dev-brain.git
cd dev-brain
cp .env.example .env
```

Edit `.env` and fill in required values:

```bash
# Required
AUTH_SECRET="$(openssl rand -base64 32)"

# Optional — enables tldraw diagram features
TLDRAW_LICENSE_KEY="your-key"
NEXT_PUBLIC_TLDRAW_LICENSE_KEY="your-key"
```

### 2. Run with Docker

```bash
docker compose up -d
```

App runs at **http://localhost:3000** · DB admin at **http://localhost:8080**

### 3. Seed the database (first run)

```bash
docker compose exec web sh -c "cd /app && node packages/db/seed.js"
```

Or connect directly:
```bash
psql postgresql://devbrain:devbrain_dev_only@localhost:5432/devbrain
```

## Local Development (without Docker)

```bash
pnpm install
# Start postgres separately, then:
pnpm dev
```

## Features

| Area | Description |
|------|-------------|
| Projects | Kanban-style project tracking with members, tags, progress |
| Tasks | Drag-and-drop kanban board with priority, due dates, pomodoro timer |
| Notes | Rich text notes per project |
| ADR | Architecture Decision Records |
| Diagrams | tldraw-powered architecture diagrams |
| Meetings | Calendar view with scheduling and notes |
| Focus | Built-in pomodoro timer with session tracking |
| Settings | Theme, profile, notifications |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Auth.js secret (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (default: http://localhost:3000) |
| `TLDRAW_LICENSE_KEY` | No | tldraw license for full diagram features |
| `GITHUB_ID` | No | GitHub OAuth app ID |
| `GITHUB_SECRET` | No | GitHub OAuth app secret |
