# Stage 1: Infrastructure Migration

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: ✅ COMPLETED

## Objective

Replace cloud-dependent services with self-hostable alternatives for KSA data residency compliance.

## Summary

| Migration | From | To | Status |
|-----------|------|-----|--------|
| Database | Neon.tech (serverless) | PostgreSQL + pg driver | ✅ Done |
| Cache/Rate Limit | Upstash Redis | ioredis + rate-limiter-flexible | ✅ Done |
| Email | Resend | Nodemailer + SMTP | ✅ Done |
| Local Dev | - | Docker Compose (Postgres, Redis, Mailpit) | ✅ Done |

---

## 1.1 PostgreSQL Migration (Neon → Standard PG)

### Dependencies

**Remove**: `@neondatabase/serverless`
**Add**: `pg`, `@types/pg` (dev)

### Files to Modify

#### `server/db/config/database.ts`

Replace Neon serverless with standard pg Pool:

```typescript
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/server/db/schemas"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pool size
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, { schema })
export const dbClient = db // Maintain compatibility
```

#### `env.ts`

Add optional SSL configuration:

```typescript
// Add after DATABASE_URL
export const DATABASE_SSL_ENV = process.env.DATABASE_SSL || "false"
```

#### `package.json`

```json
{
  "dependencies": {
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.0"
  }
}
```

Remove `@neondatabase/serverless` from dependencies.

---

## 1.2 Redis Migration (Upstash → Standard Redis)

### Dependencies

**Remove**: `@upstash/redis`, `@upstash/ratelimit`
**Add**: `ioredis`, `rate-limiter-flexible`

### Files to Modify

#### `lib/redis.ts`

```typescript
import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

redis.on("error", (err) => {
  console.error("Redis connection error:", err)
})
```

#### `lib/ratelimit.ts`

```typescript
import { RateLimiterRedis } from "rate-limiter-flexible"
import { redis } from "@/lib/redis"

const createLimiter = (points: number, duration: number) =>
  new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "ratelimit",
    points,
    duration,
  })

// Default limiter: 100 requests per 10 seconds
const defaultLimiter = createLimiter(100, 10)

export const ratelimit = {
  limit: async (identifier: string) => {
    try {
      await defaultLimiter.consume(identifier)
      return { success: true }
    } catch {
      return { success: false }
    }
  },
}

// Factory for custom limits
export const createRateLimiter = (config: { points: number; duration: number }) => {
  const limiter = createLimiter(config.points, config.duration)
  return {
    limit: async (identifier: string) => {
      try {
        await limiter.consume(identifier)
        return { success: true }
      } catch {
        return { success: false }
      }
    },
  }
}
```

#### `env.ts`

Replace Upstash variables:

```typescript
// Remove:
// export const UPSTASH_REDIS_REST_URL_ENV = ...
// export const UPSTASH_REDIS_REST_TOKEN_ENV = ...

// Add:
export const REDIS_URL_ENV = process.env.REDIS_URL || ""
```

#### `trpc/init.ts`

Update import (line ~10):

```typescript
import { ratelimit } from "@/lib/ratelimit"
// No other changes needed - interface is compatible
```

#### API Routes Using Rate Limiting (8 files)

Update these files to use the new import pattern:

- `app/api/feedback/route.ts`
- `app/api/items/route.ts`
- `app/api/items/[itemId]/route.ts`
- `app/api/users/[userId]/route.ts`
- `app/api/workspaces/route.ts`
- `app/api/workspaces/[workspaceId]/route.ts`
- `app/api/workspaces/[workspaceId]/members/route.ts`
- `app/api/image-upload/route.ts`

**Pattern change in each file**:

```typescript
// Remove:
import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "@/lib/redis"
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60s"),
})

// Replace with:
import { createRateLimiter } from "@/lib/ratelimit"
const ratelimit = createRateLimiter({ points: 10, duration: 60 })
```

---

## 1.3 Email Migration (Resend → SMTP)

### Dependencies

**Remove**: `resend`
**Add**: `nodemailer`, `@types/nodemailer` (dev)

### Files to Modify

#### `lib/resend.ts` → Rename to `lib/email.ts`

```typescript
import nodemailer from "nodemailer"
import { render } from "@react-email/render"
import type { ReactElement } from "react"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: ReactElement
  from?: string
  replyTo?: string
}

export async function sendEmail({
  to,
  subject,
  react,
  from,
  replyTo,
}: SendEmailOptions) {
  const html = await render(react)

  const result = await transporter.sendMail({
    from: from || process.env.SMTP_FROM,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    replyTo,
  })

  return {
    data: { id: result.messageId },
    error: null,
  }
}

// Verify connection on startup (optional)
export async function verifyEmailConnection() {
  try {
    await transporter.verify()
    console.log("SMTP connection verified")
    return true
  } catch (error) {
    console.error("SMTP connection failed:", error)
    return false
  }
}
```

#### `lib/auth.ts`

Update magic link email sending (around line 84-97):

```typescript
// Remove:
import { resend } from "@/lib/resend"

// Add:
import { sendEmail } from "@/lib/email"

// In magicLink plugin, replace:
magicLink({
  sendMagicLink: async ({ email, url }) => {
    const result = await sendEmail({
      to: email,
      subject: `Magic Login Link from ${configuration.site.name}!`,
      react: MagicLinkMail({
        email: email,
        magicLinkMail: url,
      }),
    })
    if (result.error) {
      throw new Error("Failed to send magic link email")
    }
  },
}),
```

#### `lib/config.ts`

Remove resend configuration (lines ~24-27):

```typescript
// Remove this section:
// resend: {
//   apiKey: RESEND_API_KEY_ENV,
//   email: RESEND_EMAIL_ENV,
// },
```

#### `types/types.ts`

Update `ConfigurationType` to remove resend:

```typescript
// Remove from ConfigurationType:
// resend: {
//   apiKey: string
//   email: string
// }
```

#### `env.ts`

Replace Resend variables:

```typescript
// Remove:
// export const RESEND_API_KEY_ENV = process.env.RESEND_API_KEY || ""
// export const RESEND_EMAIL_ENV = process.env.RESEND_EMAIL || ""

// Add:
export const SMTP_HOST_ENV = process.env.SMTP_HOST || ""
export const SMTP_PORT_ENV = process.env.SMTP_PORT || "587"
export const SMTP_SECURE_ENV = process.env.SMTP_SECURE || "false"
export const SMTP_USER_ENV = process.env.SMTP_USER || ""
export const SMTP_PASSWORD_ENV = process.env.SMTP_PASSWORD || ""
export const SMTP_FROM_ENV = process.env.SMTP_FROM || ""
```

---

## 1.4 Environment Configuration

### Create `.env.example`

```env
# ===========================================
# Events CRM - Environment Configuration
# ===========================================

# Database (Self-hosted PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/events_crm
DATABASE_SSL=false

# Redis (Self-hosted)
REDIS_URL=redis://localhost:6379

# SMTP (Generic - works with any provider)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@localhost

# Authentication
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AWS S3 (Use Bahrain region for KSA)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=me-south-1
S3_UPLOAD_BUCKET=
```

### Create `docker-compose.yml`

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: events-crm-postgres
    environment:
      POSTGRES_DB: events_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: events-crm-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailpit:
    image: axllent/mailpit
    container_name: events-crm-mailpit
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1

volumes:
  postgres_data:
  redis_data:
```

---

## 1.5 Package.json Updates

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "rate-limiter-flexible": "^4.0.0",
    "nodemailer": "^6.9.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.0",
    "@types/nodemailer": "^6.4.0"
  }
}
```

**Remove from dependencies**:
- `@neondatabase/serverless`
- `@upstash/redis`
- `@upstash/ratelimit`
- `resend`

---

## Verification

After completing Stage 1:

```bash
# Start local services
docker-compose up -d

# Install new dependencies
npm install

# Run database migrations
npm run db:push

# Start dev server
npm run dev

# Test magic link auth (check Mailpit at http://localhost:8025)
# Test rate limiting (rapid requests should be blocked)
```

### Checklist

- [x] `npm run build` passes
- [x] Docker services start correctly
- [x] Database connection works (`npm run db:push` successful)
- [x] Redis connection works
- [x] Dev server starts without errors
- [x] App responds at http://localhost:3000

### Convenience Scripts Added

```json
{
  "dev:start": "docker-compose up -d && npm run dev",
  "dev:setup": "docker-compose up -d && npm run db:push && npm run db:seed && npm run dev"
}
```

### Local Services

| Service | URL | Purpose |
|---------|-----|---------|
| App | http://localhost:3000 | Next.js application |
| Mailpit | http://localhost:8025 | Email testing UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & rate limiting |
| Drizzle Studio | `npm run db:studio` | Database GUI |

---

## Next Stage

→ [Stage 2: Cleanup & Rename](./02-cleanup-rename.md)
