# Events CRM

A platform for managing high-profile events with complex guest logistics. Built for KSA (Saudi Arabia) data residency compliance with fully self-hosted infrastructure.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn UI
- **Database**: PostgreSQL (self-hosted)
- **Cache/Rate Limiting**: Redis (self-hosted)
- **Email**: SMTP via Nodemailer (Mailpit for local dev)
- **ORM**: Drizzle ORM
- **API**: tRPC
- **Auth**: Better-Auth (Google, GitHub, Magic Link)
- **File Storage**: AWS S3 (Bahrain region me-south-1)

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (recommended) or npm

## Quick Start

### First Time Setup

```bash
# Install dependencies
pnpm install

# Start services + setup database + run dev server
pnpm run dev:setup
```

### Daily Development

```bash
# Start Docker services and dev server
pnpm run dev:start
```

### If Docker is Already Running

```bash
pnpm run dev
```

## Local Services

| Service | URL | Purpose |
|---------|-----|---------|
| App | http://localhost:3000 | Next.js application |
| Mailpit | http://localhost:8025 | Email testing UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & rate limiting |

## Development Commands

### Application

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Next.js dev server |
| `pnpm run dev:start` | Start Docker + dev server |
| `pnpm run dev:setup` | Full setup (Docker + DB + seed + dev) |
| `pnpm run build` | Build for production |
| `pnpm run lint` | Run ESLint |
| `pnpm run format:fix` | Fix code formatting |

### Database

| Command | Description |
|---------|-------------|
| `pnpm run db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm run db:push` | Push schema changes to database |
| `pnpm run db:generate` | Generate migration files |
| `pnpm run db:migrate` | Run migrations |
| `pnpm run db:seed` | Seed database (roles, permissions, optional admin user) |

### Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/events_crm
DATABASE_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# SMTP (Mailpit for local dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@events-crm.local

# Authentication
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AWS S3 (Bahrain region for KSA)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=me-south-1
S3_UPLOAD_BUCKET=

# Seed Script (optional)
SEED_ADMIN_EMAIL=your@email.com
```

## Initial Setup / Bootstrap

To bootstrap the system with an admin user and demo workspace:

1. Set your email in `.env.local`:
   ```env
   SEED_ADMIN_EMAIL=your@email.com
   ```

2. Run the seed script:
   ```bash
   pnpm run db:seed
   ```

3. Start the dev server and sign in with that email (via OAuth or Magic Link)

4. You'll have access to "Demo Workspace" as the owner

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── [locale]/          # i18n routes
│   │   ├── (marketing)/   # Public pages
│   │   └── (web)/         # Authenticated app
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Shadcn base components
│   ├── forms/            # Form components
│   └── ...
├── server/
│   ├── db/               # Drizzle schemas & config
│   └── actions/          # Server actions
├── trpc/                  # tRPC routers & hooks
├── lib/                   # Utilities & config
└── docs/                  # Documentation
    └── foundation-plan/  # Implementation plans
```

## Documentation

See `docs/foundation-plan/` for implementation details:
- `00-overview.md` - Project overview and roadmap
- `01-infrastructure.md` - Infrastructure setup (completed)
- `02-cleanup-rename.md` - Cleanup tasks
- `03-domain-schema-i18n.md` - Events domain schema
- `04-routers-rsvp.md` - API routers and RSVP pages
