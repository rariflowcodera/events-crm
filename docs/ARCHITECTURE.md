# Events CRM - High-Level Architecture Document

> **Version**: 1.0 | **Date**: 2024-11-29 | **Status**: Production-Ready Architecture

---

## Executive Summary

Events CRM is a modern, scalable platform for managing high-profile events with complex guest logistics. The system is architected from the ground up for **Saudi Arabia (KSA) data residency compliance**, utilizing fully self-hosted infrastructure.

### Key Compliance Assurances

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **KSA Data Residency** | Self-hosted PostgreSQL, Redis, SMTP; KSA-hosted object storage | Compliant |
| **Bilingual Support** | Full Arabic/English with RTL layout support | Implemented |
| **Saudi Cyber Security** | Encryption at rest/transit, audit logging, RBAC | Implemented |

---

## 1. Technology Stack

### 1.1 Core Framework

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Node.js | 18+ | Server runtime |
| **Framework** | Next.js | 15.3 | Full-stack React framework with App Router |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Bundler** | Turbopack | Latest | Fast development builds |

### 1.2 Frontend Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **UI Components** | Shadcn/Radix UI | Accessible, customizable component library |
| **Styling** | TailwindCSS | Utility-first CSS with RTL support |
| **Forms** | React Hook Form + Zod | Type-safe form handling and validation |
| **State Management** | React Query (TanStack) | Server state caching and synchronization |
| **URL State** | nuqs | Type-safe URL query parameters |
| **Internationalization** | next-intl | Arabic/English with RTL support |
| **Theming** | next-themes | Dark/light mode support |

### 1.3 Backend Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Layer** | tRPC | End-to-end type-safe APIs |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Authentication** | Better-Auth | OAuth + Magic Link authentication |
| **Job Queue** | BullMQ | Background job processing |
| **Rate Limiting** | rate-limiter-flexible | API protection |

### 1.4 Infrastructure (Self-Hosted)

| Service | Technology | Configuration |
|---------|------------|---------------|
| **Database** | PostgreSQL 16 | Self-hosted, connection pooling (20 max) |
| **Cache/Queue** | Redis 7 | Self-hosted, ioredis client |
| **Email** | SMTP via Nodemailer | Any KSA-compliant SMTP provider |
| **File Storage** | Object Storage | KSA-hosted provider |
| **Local Dev** | Docker Compose | PostgreSQL + Redis + Mailpit |

---

## 2. Data Architecture

### 2.1 Multi-Tenant Model

The system uses a **workspace-based multi-tenant architecture** where each workspace represents an event organizer/client:

```
┌─────────────────────────────────────────────────────────────────┐
│                         GLOBAL LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Users ──────┬──── Sessions                                     │
│              ├──── Accounts (OAuth providers)                   │
│              └──── User Settings                                │
├─────────────────────────────────────────────────────────────────┤
│                      WORKSPACE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Workspace ──┬──── Members (with Roles & Permissions)           │
│  (Tenant)    ├──── Invitations                                  │
│              ├──── Workflows (automation)                       │
│              └──── Events ─────────────────────────────────┐    │
│                                                            │    │
│  ┌─────────────────────────────────────────────────────────┴──┐ │
│  │                      EVENT LAYER                           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  Event ────┬──── Guest Categories (AAA, A, B tiers)        │ │
│  │            │     └──── Service Allocations (JSON)          │ │
│  │            │                                               │ │
│  │            ├──── Guests ──────┬──── RSVP Responses         │ │
│  │            │                  ├──── Email Logs             │ │
│  │            │                  ├──── Communications         │ │
│  │            │                  ├──── Inventory Allocations  │ │
│  │            │                  └──── Guest Itineraries      │ │
│  │            │                                               │ │
│  │            ├──── Email Templates (bilingual)               │ │
│  │            ├──── Itinerary Templates                       │ │
│  │            ├──── Inventory Types & Items                   │ │
│  │            └──── Guest Import Batches                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema Overview

**20 Core Tables** organized into domains:

#### Authentication & Users (5 tables)
- `users` - User profiles with Better-Auth integration
- `sessions` - Active authentication sessions
- `account` - OAuth provider connections (Google, GitHub)
- `verification` - Email/2FA verification tokens
- `user_setting` - User preferences

#### Multi-Tenant Organization (6 tables)
- `workspaces` - Event organizers/clients (tenants)
- `workspace_members` - User-workspace associations
- `roles` - Predefined roles (owner, admin, member, manager)
- `permissions` - 14+ granular permissions
- `role_permission` - Role-to-permission mappings
- `invitations` - Workspace member invitations

#### Events Domain (7 tables)
- `events` - Core event entity with status workflow
- `guest_categories` - VIP tiers with service allocations
- `guests` - Attendee records with RSVP tokens
- `rsvp_response` - RSVP submissions (supports amendments)
- `email_template` - Bilingual email templates
- `email_log` - Email delivery tracking
- `guest_import_batch` - Bulk import tracking

#### Future Phase Tables (6 tables - schema ready)
- `inventory_type`, `inventory_item`, `guest_inventory_allocation`
- `itinerary_template`, `itinerary_item`, `guest_itinerary`
- `workflow`, `workflow_step`, `approval_request`
- `communication` - WhatsApp/SMS/Push logs

### 2.3 Key Design Patterns

#### JSON Fields for Flexibility
The schema uses JSON columns for extensible data without schema migrations:

```typescript
// Event RSVP Form Configuration
rsvpFormConfig: {
  fields: [
    { id, type, label: { en, ar }, required, options, conditionalOnCategory }
  ],
  confirmationMessage: { en, ar }
}

// Guest Category Service Allocations
serviceAllocations: {
  hotelStars, roomType, transportType, airportPickup,
  flightClass, mealType, accessLevel[], giftPackage
}

// Email Templates (Bilingual)
content: {
  en: { subject, htmlContent, textContent },
  ar: { subject, htmlContent, textContent }
}
```

#### Status Workflows
Events and guests follow defined state machines:

```
Event: draft → planning → invitations_sent → rsvp_open → rsvp_closed → in_progress → completed/cancelled

Guest: pending → invited → reminded → viewed → confirmed/declined/maybe → attended/no_show
```

#### Indexing Strategy
Strategic indexes on all tables for common query patterns:
- Workspace/tenant scoping indexes
- Status-based filtering indexes
- Token lookup indexes (RSVP, invitation)
- Date range indexes (event dates, created_at)

---

## 3. Application Architecture

### 3.1 Route Structure

```
app/
├── [locale]/                    # i18n prefix (en, ar)
│   ├── (marketing)/            # Public pages (landing, terms, privacy)
│   ├── (web)/                  # Authenticated application
│   │   ├── (auth)/             # Sign-in/out flows
│   │   ├── (dashboard)/[slug]/ # Workspace-scoped dashboard
│   │   │   ├── events/         # Event management
│   │   │   ├── analytics/      # Reporting
│   │   │   └── settings/       # Workspace settings
│   │   └── invite/[token]/     # Invitation acceptance
│   └── rsvp/[token]/           # Public RSVP pages (no auth required)
└── api/                        # API routes
    └── trpc/[trpc]/            # tRPC endpoint
```

### 3.2 API Layer (tRPC)

**10 Domain Routers** with type-safe procedures:

| Router | Procedures | Purpose |
|--------|------------|---------|
| `users` | 8 | Profile, settings, email verification |
| `workspaces` | 12 | CRUD, member listing, branding |
| `members` | 6 | Add/remove members, role assignment |
| `invitations` | 8 | Send, accept, reject invitations |
| `events` | 10 | CRUD, status transitions, templates |
| `guestCategories` | 8 | Category CRUD, service allocations |
| `guests` | 15 | CRUD, import, search, bulk operations |
| `emailTemplates` | 10 | CRUD, bilingual content management |
| `emailLogs` | 5 | Delivery tracking, status queries |

**Procedure Types:**
- `baseProcedure` - Public procedures
- `protectedProcedure` - Authenticated + rate-limited

### 3.3 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Better-Auth                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OAuth Providers          Magic Link Email                  │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │   Google     │        │   Nodemailer │                  │
│  │   GitHub     │        │   (SMTP)     │                  │
│  └──────┬───────┘        └──────┬───────┘                  │
│         │                       │                          │
│         └───────────┬───────────┘                          │
│                     ▼                                      │
│              Session Created                               │
│                     │                                      │
│                     ▼                                      │
│         Workspace Membership Check                         │
│                     │                                      │
│                     ▼                                      │
│         Permission-Based Access                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Background Job Processing

```
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Producer (API)           Redis Queue          Worker       │
│  ┌──────────────┐        ┌──────────┐      ┌──────────────┐│
│  │ Bulk Email   │───────▶│email-queue│─────▶│Email Worker ││
│  │ Single Email │        │          │      │ - Rate limit ││
│  │ Import Job   │        │ Priority │      │ - Retries    ││
│  └──────────────┘        │ Support  │      │ - Logging    ││
│                          └──────────┘      └──────────────┘│
│                                                             │
│  Configuration:                                             │
│  - Rate Limit: 10 emails/second (configurable)             │
│  - Retries: 3 with exponential backoff                     │
│  - Concurrency: 5 workers                                  │
│  - Job Retention: 24h completed, 7d failed                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Security Architecture

### 4.1 Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Model                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User ──▶ WorkspaceMember ──▶ Role ──▶ Permissions         │
│                                                             │
│  Roles:                                                     │
│  ┌─────────┬────────────────────────────────────────────┐  │
│  │ owner   │ Full access, can delete workspace          │  │
│  │ admin   │ Manage members, events, settings           │  │
│  │ manager │ Manage events and guests                   │  │
│  │ member  │ View-only access                           │  │
│  └─────────┴────────────────────────────────────────────┘  │
│                                                             │
│  Permissions (14+):                                         │
│  - create:event, manage:event, delete:event, view:event    │
│  - import:guests, manage:guests, view:guests, delete:guests│
│  - view:rsvps, manage:rsvps                                │
│  - send:emails, manage:templates                           │
│  - view:reports, export:data                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Data Protection

| Layer | Protection |
|-------|------------|
| **Transport** | HTTPS/TLS encryption |
| **Database** | SSL connections (configurable) |
| **Passwords** | Better-Auth secure hashing |
| **Tokens** | UUID-based RSVP tokens with expiration |
| **Sessions** | Secure session management |
| **API** | Rate limiting (100 req/10s default) |

### 4.3 Audit Trail

- `createdAt`, `updatedAt` timestamps on all entities
- `createdBy` user references on events, templates
- Email delivery tracking with full status history
- Import batch tracking with error logs
- RSVP response history (amendments tracked)

---

## 5. Internationalization (i18n)

### 5.1 Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    next-intl Setup                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Supported Locales: en (English), ar (Arabic)              │
│  Default Locale: en                                         │
│  RTL Support: Automatic for Arabic                         │
│                                                             │
│  Route Structure:                                           │
│  /en/dashboard  ──▶  LTR layout                            │
│  /ar/dashboard  ──▶  RTL layout (dir="rtl")                │
│                                                             │
│  Translation Files:                                         │
│  messages/en.json  (300+ keys)                             │
│  messages/ar.json  (300+ keys)                             │
│                                                             │
│  Domains: common, auth, workspace, event, guest, rsvp,     │
│           email, dashboard, navigation, errors             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Bilingual Content Storage

Database fields support bilingual content via JSON:

```typescript
// Pattern used throughout schema
label: { en: "Welcome", ar: "مرحبا" }

// Email templates store full bilingual content
content: {
  en: { subject: "...", htmlContent: "...", textContent: "..." },
  ar: { subject: "...", htmlContent: "...", textContent: "..." }
}
```

---

## 6. Scalability & Performance

### 6.1 Current Architecture Supports

| Metric | Capability |
|--------|------------|
| **Events** | Unlimited per workspace |
| **Guests** | 100,000+ per event (indexed) |
| **Concurrent Users** | Limited by PostgreSQL pool (20) |
| **Email Throughput** | 10/second (configurable) |
| **File Storage** | Object storage scalability |

### 6.2 Performance Optimizations

- **Database**: Connection pooling, strategic indexes
- **Caching**: Redis for rate limiting and job queues
- **Frontend**: React Query caching (60s stale time)
- **API**: tRPC batch link combines requests
- **Jobs**: Background processing for bulk operations

### 6.3 Future Scaling Path

The architecture supports horizontal scaling:

1. **Database**: PostgreSQL read replicas
2. **Application**: Multiple Next.js instances behind load balancer
3. **Workers**: Multiple BullMQ worker processes
4. **Cache**: Redis cluster mode
5. **Files**: Object storage with CDN

---

## 7. Deployment Architecture

### 7.1 Self-Hosted Requirements

```
┌─────────────────────────────────────────────────────────────┐
│                 KSA-Compliant Deployment                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │    │  PostgreSQL  │    │    Redis     │  │
│  │   App        │◀──▶│   Database   │    │    Cache     │  │
│  │   (Node.js)  │    │   (Primary)  │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │          │
│         │            ┌──────────────┐          │          │
│         └───────────▶│  BullMQ      │◀─────────┘          │
│                      │  Workers     │                      │
│                      └──────────────┘                      │
│                             │                              │
│                      ┌──────────────┐                      │
│                      │    SMTP      │                      │
│                      │   Server     │                      │
│                      └──────────────┘                      │
│                                                             │
│  External (KSA-Compliant):                                 │
│  ┌──────────────┐                                          │
│  │  Object      │  KSA-hosted storage                      │
│  │  Storage     │  provider                                │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Environment Configuration

```bash
# Database (Self-Hosted)
DATABASE_URL=postgresql://user:pass@host:5432/events_crm
DATABASE_SSL=true

# Redis (Self-Hosted)
REDIS_URL=redis://host:6379

# SMTP (Any KSA-Compliant Provider)
SMTP_HOST=smtp.provider.sa
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@yourdomain.sa

# Object Storage (KSA-hosted)
STORAGE_ENDPOINT=https://your-provider-endpoint
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=events-crm-files

# Authentication
BETTER_AUTH_URL=https://yourdomain.sa
BETTER_AUTH_SECRET=...
```

---

## 8. Future Roadmap Compatibility

The architecture is designed to support AFC Asian Cup 2027 scale:

### 8.1 Schema-Ready Features (Tables Created)

- **Inventory Management**: Hotel, flight, transport allocation
- **Itinerary System**: Personalized schedules per guest
- **Workflow Automation**: Trigger-based actions with approval flows
- **Multi-Channel Communication**: WhatsApp, SMS, push notifications

### 8.2 Planned Integrations

| Integration | Status | API Design |
|-------------|--------|------------|
| WhatsApp Business | Schema Ready | Webhook-based |
| Call Centers | Planned | REST API |
| Mobile Apps | Planned | tRPC endpoints |
| AI Services | Planned | Open API |

### 8.3 Scalability Targets

| Phase | Scale | Timeline |
|-------|-------|----------|
| U23 Event | 1,000 guests | Current |
| AFC 2027 | 50,000+ guests | Architecture ready |

---

## 9. Summary

### Architecture Strengths

1. **KSA Compliance**: Fully self-hosted with no US cloud dependencies
2. **Modern Stack**: Next.js 15, TypeScript, tRPC for type safety
3. **Scalable Design**: Connection pooling, job queues, indexed queries
4. **Bilingual First**: Arabic/English with RTL support built-in
5. **Security**: RBAC, rate limiting, audit trails
6. **Extensible**: JSON fields for flexible data, modular schemas
7. **Future-Ready**: Schema prepared for inventory, itinerary, workflows

### Technology Decisions Rationale

| Decision | Rationale |
|----------|-----------|
| PostgreSQL over cloud DB | KSA data residency, no vendor lock-in |
| Redis over Upstash | Self-hosted rate limiting and queues |
| Nodemailer over Resend | Works with any SMTP provider |
| Object storage | Works with any KSA-hosted provider |
| tRPC over REST | End-to-end type safety, developer productivity |
| Drizzle over Prisma | Lighter weight, SQL-like, faster |
| next-intl over i18next | Better Next.js App Router integration |

---

## 10. Deployment Guide

### 10.1 Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Node.js** | 18.x | 20.x LTS |
| **PostgreSQL** | 15 | 16 |
| **Redis** | 6 | 7 |
| **RAM** | 2GB | 4GB+ |
| **Storage** | 20GB | 50GB+ |

### 10.2 Production Deployment Steps

#### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

#### Step 2: Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE USER events_crm WITH PASSWORD 'secure_password';
CREATE DATABASE events_crm OWNER events_crm;
GRANT ALL PRIVILEGES ON DATABASE events_crm TO events_crm;
\q

# Enable SSL (recommended)
# Edit /etc/postgresql/16/main/postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

#### Step 3: Application Deployment

```bash
# Clone repository
git clone <repository-url> /opt/events-crm
cd /opt/events-crm

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with production values

# Run database migrations
pnpm run db:migrate

# Seed initial data (roles, permissions)
pnpm run db:seed

# Build application
pnpm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "events-crm" -- start
pm2 startup
pm2 save
```

#### Step 4: Email Worker Setup

```bash
# Start email worker as separate process
pm2 start "pnpm run worker:email" --name "events-crm-worker"
pm2 save
```

#### Step 5: Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.sa;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 10.3 Environment Variables Reference

```bash
# ===========================================
# DATABASE (Required)
# ===========================================
DATABASE_URL="postgresql://user:password@host:5432/events_crm"
DATABASE_SSL="true"  # Enable for production

# ===========================================
# REDIS (Required)
# ===========================================
REDIS_URL="redis://localhost:6379"

# ===========================================
# AUTHENTICATION (Required)
# ===========================================
BETTER_AUTH_URL="https://yourdomain.sa"
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers (Optional but recommended)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ===========================================
# EMAIL - SMTP (Required)
# ===========================================
SMTP_HOST="smtp.provider.sa"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@yourdomain.sa"
SMTP_RATE_LIMIT="10"  # emails per second

# ===========================================
# OBJECT STORAGE (Required)
# ===========================================
STORAGE_ENDPOINT="https://your-provider-endpoint"  # KSA-hosted provider
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET="your-bucket-name"

# ===========================================
# APPLICATION (Required)
# ===========================================
NEXT_PUBLIC_APP_URL="https://yourdomain.sa"
NODE_ENV="production"

# ===========================================
# WORKER CONFIGURATION (Optional)
# ===========================================
WORKER_CONCURRENCY="5"

# ===========================================
# INITIAL SETUP (One-time)
# ===========================================
SEED_ADMIN_EMAIL="admin@yourdomain.sa"
```

### 10.4 Monitoring & Maintenance

```bash
# PM2 monitoring
pm2 monit
pm2 logs events-crm

# Database backup
pg_dump -U events_crm events_crm > backup_$(date +%Y%m%d).sql

# Redis backup
redis-cli BGSAVE

# Health checks
curl https://yourdomain.sa/api/health  # If implemented
```

---

## 11. API Documentation

### 11.1 tRPC Endpoint

**Base URL**: `/api/trpc`

All API calls use tRPC's type-safe RPC protocol. The API is consumed via the tRPC client with full TypeScript inference.

### 11.2 Authentication

All protected procedures require a valid session cookie from Better-Auth. Public RSVP endpoints use token-based authentication.

### 11.3 Router Reference

#### Users Router (`trpc.users.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `getProfile` | Query | Get current user profile |
| `updateProfile` | Mutation | Update user name, avatar |
| `getNotificationSettings` | Query | Get email notification preferences |
| `updateNotificationSettings` | Mutation | Update notification preferences |
| `initiateEmailChange` | Mutation | Start email change process |
| `verifyEmailChange` | Mutation | Complete email change with token |

#### Workspaces Router (`trpc.workspaces.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | - | List user's workspaces |
| `getBySlug` | Query | `{ slug }` | Get workspace by slug |
| `create` | Mutation | `{ name }` | Create new workspace |
| `update` | Mutation | `{ id, name, logo, ... }` | Update workspace settings |
| `delete` | Mutation | `{ id }` | Delete workspace (owner only) |
| `switchWorkspace` | Mutation | `{ slug }` | Set active workspace |

#### Events Router (`trpc.events.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | `{ workspaceSlug }` | List workspace events |
| `getBySlug` | Query | `{ workspaceSlug, eventSlug }` | Get event details |
| `create` | Mutation | `{ workspaceSlug, name, ... }` | Create event |
| `update` | Mutation | `{ eventId, ... }` | Update event |
| `delete` | Mutation | `{ eventId }` | Delete event |
| `updateStatus` | Mutation | `{ eventId, status }` | Change event status |

**Event Status Values**: `draft`, `planning`, `invitations_sent`, `rsvp_open`, `rsvp_closed`, `in_progress`, `completed`, `cancelled`

#### Guest Categories Router (`trpc.guestCategories.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | `{ eventId }` | List event categories |
| `getOne` | Query | `{ categoryId }` | Get category details |
| `create` | Mutation | `{ eventId, name, code, ... }` | Create category |
| `update` | Mutation | `{ categoryId, ... }` | Update category |
| `delete` | Mutation | `{ categoryId }` | Delete category |
| `updateServiceAllocations` | Mutation | `{ categoryId, allocations }` | Set service levels |

**Service Allocations Schema**:
```typescript
{
  hotelStars?: number       // 3, 4, 5
  roomType?: string         // "standard", "deluxe", "suite"
  transportType?: string    // "sedan", "suv", "luxury"
  airportPickup?: boolean
  flightClass?: string      // "economy", "business", "first"
  flightIncluded?: boolean
  mealType?: string         // "standard", "halal", "vegetarian"
  accessLevel?: string[]    // ["vip_lounge", "backstage"]
  giftPackage?: string
}
```

#### Guests Router (`trpc.guests.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | `{ eventId, search?, status?, categoryId?, limit?, offset? }` | List guests with filtering |
| `getOne` | Query | `{ guestId }` | Get guest details |
| `create` | Mutation | `{ eventId, categoryId, firstName, lastName, email, ... }` | Create guest |
| `update` | Mutation | `{ guestId, ... }` | Update guest |
| `delete` | Mutation | `{ guestId }` | Delete guest |
| `bulkDelete` | Mutation | `{ guestIds }` | Delete multiple guests |
| `import` | Mutation | `{ eventId, file, columnMapping }` | Import from Excel |
| `updateStatus` | Mutation | `{ guestId, status }` | Change guest status |
| `regenerateRsvpToken` | Mutation | `{ guestId }` | Generate new RSVP link |

**Guest Status Values**: `pending`, `invited`, `reminded`, `viewed`, `confirmed`, `declined`, `maybe`, `waitlisted`, `cancelled`, `attended`, `no_show`

#### Email Templates Router (`trpc.emailTemplates.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | `{ eventId, type? }` | List templates |
| `getOne` | Query | `{ templateId }` | Get template details |
| `create` | Mutation | `{ eventId, name, type, content, ... }` | Create template |
| `update` | Mutation | `{ templateId, ... }` | Update template |
| `delete` | Mutation | `{ templateId }` | Delete template |
| `setDefault` | Mutation | `{ templateId, type }` | Set as default for type |
| `preview` | Query | `{ templateId, guestId? }` | Preview with variables |

**Template Types**: `invitation`, `reminder`, `confirmation`, `declined_acknowledgment`, `update`, `cancellation`, `custom`

**Template Content Schema** (Bilingual):
```typescript
{
  en: {
    subject: string
    htmlContent: string
    textContent?: string
  }
  ar?: {
    subject?: string
    htmlContent?: string
    textContent?: string
  }
}
```

**Available Template Variables**:
- `{{guestName}}` - Full guest name
- `{{firstName}}` - Guest first name
- `{{lastName}}` - Guest last name
- `{{eventName}}` - Event name
- `{{eventDate}}` - Formatted event date
- `{{eventVenue}}` - Event venue
- `{{rsvpLink}}` - Personalized RSVP URL
- `{{categoryName}}` - Guest category name
- `{{organizationName}}` - Organization name

#### Email Logs Router (`trpc.emailLogs.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getMany` | Query | `{ eventId, guestId?, status? }` | List email logs |
| `getOne` | Query | `{ logId }` | Get log details |
| `getStats` | Query | `{ eventId }` | Email delivery statistics |

**Email Status Values**: `pending`, `queued`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `failed`

### 11.4 Public RSVP API

The RSVP system uses token-based authentication (no session required):

**RSVP Page Route**: `/[locale]/rsvp/[token]`

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `rsvp.getByToken` | Query | `{ token }` | Get guest & event info |
| `rsvp.submit` | Mutation | `{ token, response, formData, ... }` | Submit RSVP |

**RSVP Response Schema**:
```typescript
{
  token: string
  responseStatus: "confirmed" | "declined" | "maybe"
  formResponses?: Record<string, unknown>
  companionInfo?: {
    bringing: boolean
    count?: number
    names?: string[]
    details?: Array<{ name: string; dietary?: string }>
  }
}
```

### 11.5 Webhook Events (Future)

The workflow system supports outbound webhooks:

```typescript
// Webhook payload structure
{
  event: "guest.rsvp_submitted" | "guest.status_changed" | ...
  timestamp: string  // ISO 8601
  data: {
    guestId: string
    eventId: string
    workspaceId: string
    // Event-specific data
  }
}
```

### 11.6 Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Protected procedures | 100 requests | 10 seconds |
| Public RSVP | 20 requests | 10 seconds |
| Email sending | 10 emails | 1 second |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Related Documentation

- [Foundation Plan Overview](./foundation-plan/00-overview.md)
- [Infrastructure Setup](./foundation-plan/01-infrastructure.md)
- [Domain Schema & i18n](./foundation-plan/03-domain-schema-i18n.md)
- [tRPC Routers & RSVP](./foundation-plan/04-routers-rsvp.md)
- [CRM Tech Brief](./CRM_Tech_Brief_Overview.md)
