# Stage 13: Email Delivery Reporting

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planning

## Objective

Implement email delivery tracking by integrating with Oracle OCI Email Delivery's Suppression List API. This enables event managers to see which emails bounced, why, and manage their sender reputation. Since OCI Email doesn't provide per-email webhooks, we sync the suppression list hourly to update email status.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tracking Method | OCI Suppression List Sync | OCI doesn't provide webhooks; suppression list is the only source of bounce data |
| Sync Frequency | Hourly (BullMQ repeatable) | Balance between freshness and API rate limits |
| Local Cache | Yes (email_suppression table) | Faster pre-send checks, reduces OCI API calls |
| Pre-Send Check | Block suppressed addresses | Protects sender reputation, saves email quota |
| Dashboard Location | Event Emails tab | Natural location for email metrics |

---

## Background: OCI Email Delivery Limitations

Oracle OCI Email Delivery is fundamentally different from services like SendGrid or Mailgun:

| Feature | SendGrid/Mailgun | Oracle OCI Email |
|---------|------------------|------------------|
| Per-email webhooks | Yes | **No** |
| Delivery confirmation | Yes (webhook) | **No** |
| Open/Click tracking | Yes (built-in) | **No** |
| Bounce notifications | Webhook | **Suppression List API only** |
| Aggregate metrics | Dashboard + API | OCI Monitoring API |

**What OCI Does Provide:**
- **Suppression List API**: Email addresses that have bounced, with reasons
- **Aggregate Metrics**: Total sent, bounced, complained via OCI Monitoring
- **Bounce Reasons**: `HARDBOUNCE`, `SOFTBOUNCE`, `COMPLAINT`, `MANUAL`, `UNSUBSCRIBE`

**Important Notes:**
- Suppressions are region-specific (e.g., me-jeddah-1 suppressions don't affect other regions)
- Soft bounces auto-add to suppression after 4 failures in 24 hours
- Bounce rate should stay below 2% for good deliverability

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 13A | OCI SDK Setup & Suppression Schema | ~6 files |
| 13B | Suppression Sync Worker | ~5 files |
| 13C | Pre-Send Suppression Check | ~2 files |
| 13D | Delivery Dashboard UI | ~5 files |
| 13E | Suppression Management UI | ~3 files |
| 13F | Per-Guest Email History UI | ~4 files |

---

## 13A: OCI SDK Setup & Suppression Schema

### Dependencies

```bash
pnpm add oci-sdk
```

### Environment Variables

**Add to `env.ts`:**

```typescript
// OCI Email Delivery
export const OCI_TENANCY_OCID_ENV = process.env.OCI_TENANCY_OCID || ""
export const OCI_USER_OCID_ENV = process.env.OCI_USER_OCID || ""
export const OCI_FINGERPRINT_ENV = process.env.OCI_FINGERPRINT || ""
export const OCI_PRIVATE_KEY_ENV = process.env.OCI_PRIVATE_KEY || ""
export const OCI_REGION_ENV = process.env.OCI_REGION || "me-jeddah-1"
export const OCI_COMPARTMENT_ID_ENV = process.env.OCI_COMPARTMENT_ID || ""
```

**Add to `.env.example`:**

```env
# OCI Email Delivery (for suppression list sync)
OCI_TENANCY_OCID=ocid1.tenancy.oc1..xxxxx
OCI_USER_OCID=ocid1.user.oc1..xxxxx
OCI_FINGERPRINT=xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx
OCI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
OCI_REGION=me-jeddah-1
OCI_COMPARTMENT_ID=ocid1.compartment.oc1..xxxxx
```

### OCI Client Configuration

**New file: `lib/oci/config.ts`**

```typescript
import * as oci from "oci-sdk"
import {
  OCI_TENANCY_OCID_ENV,
  OCI_USER_OCID_ENV,
  OCI_FINGERPRINT_ENV,
  OCI_PRIVATE_KEY_ENV,
  OCI_REGION_ENV,
} from "@/env"

let provider: oci.common.ConfigFileAuthenticationDetailsProvider | null = null

export function getOciAuthProvider() {
  if (provider) return provider

  // Use simple authentication with environment variables
  provider = new oci.common.SimpleAuthenticationDetailsProvider(
    OCI_TENANCY_OCID_ENV,
    OCI_USER_OCID_ENV,
    OCI_FINGERPRINT_ENV,
    OCI_PRIVATE_KEY_ENV,
    null, // passphrase
    oci.common.Region.fromRegionId(OCI_REGION_ENV)
  )

  return provider
}

export function isOciConfigured(): boolean {
  return !!(
    OCI_TENANCY_OCID_ENV &&
    OCI_USER_OCID_ENV &&
    OCI_FINGERPRINT_ENV &&
    OCI_PRIVATE_KEY_ENV &&
    OCI_REGION_ENV
  )
}
```

### OCI Email Client

**New file: `lib/oci/email-client.ts`**

```typescript
import * as oci from "oci-sdk"
import { getOciAuthProvider, isOciConfigured } from "./config"
import { OCI_COMPARTMENT_ID_ENV } from "@/env"

let emailClient: oci.email.EmailClient | null = null

export function getEmailClient() {
  if (!isOciConfigured()) {
    throw new Error("OCI Email Delivery is not configured")
  }

  if (emailClient) return emailClient

  emailClient = new oci.email.EmailClient({
    authenticationDetailsProvider: getOciAuthProvider(),
  })

  return emailClient
}

export interface OciSuppression {
  id: string
  emailAddress: string
  reason: "UNKNOWN" | "HARDBOUNCE" | "SOFTBOUNCE" | "MANUAL" | "COMPLAINT" | "UNSUBSCRIBE"
  errorDetail?: string
  errorSource?: string
  timeCreated: Date
}

/**
 * Fetch all suppressions from OCI (paginated)
 */
export async function listAllSuppressions(): Promise<OciSuppression[]> {
  const client = getEmailClient()
  const suppressions: OciSuppression[] = []
  let page: string | undefined

  do {
    const response = await client.listSuppressions({
      compartmentId: OCI_COMPARTMENT_ID_ENV,
      page,
      limit: 100,
    })

    for (const item of response.items || []) {
      suppressions.push({
        id: item.id!,
        emailAddress: item.emailAddress!.toLowerCase(),
        reason: item.reason as OciSuppression["reason"],
        errorDetail: item.errorDetail,
        errorSource: item.errorSource,
        timeCreated: item.timeCreated!,
      })
    }

    page = response.opcNextPage
  } while (page)

  return suppressions
}

/**
 * Remove an email from the suppression list
 */
export async function deleteSuppression(suppressionId: string): Promise<void> {
  const client = getEmailClient()
  await client.deleteSuppression({ suppressionId })
}

/**
 * Add an email to the suppression list manually
 */
export async function createSuppression(emailAddress: string): Promise<OciSuppression> {
  const client = getEmailClient()
  const response = await client.createSuppression({
    createSuppressionDetails: {
      compartmentId: OCI_COMPARTMENT_ID_ENV,
      emailAddress: emailAddress.toLowerCase(),
    },
  })

  return {
    id: response.suppression.id!,
    emailAddress: response.suppression.emailAddress!.toLowerCase(),
    reason: response.suppression.reason as OciSuppression["reason"],
    errorDetail: response.suppression.errorDetail,
    errorSource: response.suppression.errorSource,
    timeCreated: response.suppression.timeCreated!,
  }
}
```

### Schema: `email_suppression`

**New file: `server/db/schemas/email-suppression.ts`**

```typescript
import { pgEnum, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

export const suppressionReasonEnum = pgEnum("suppression_reason", [
  "UNKNOWN",
  "HARDBOUNCE",
  "SOFTBOUNCE",
  "MANUAL",
  "COMPLAINT",
  "UNSUBSCRIBE",
])

export const emailSuppressions = pgTable(
  "email_suppression",
  {
    id: text("id").primaryKey(), // OCI suppression ID
    email: text("email").notNull(),
    reason: suppressionReasonEnum("reason").notNull(),
    errorDetail: text("error_detail"),
    errorSource: text("error_source"),
    ociCreatedAt: timestamp("oci_created_at", { mode: "date" }),
    syncedAt: timestamp("synced_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("email_suppression_email_idx").on(table.email),
  ]
)
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `lib/oci/config.ts` | Create - OCI auth configuration |
| `lib/oci/email-client.ts` | Create - Email Delivery API wrapper |
| `server/db/schemas/email-suppression.ts` | Create - Suppression cache table |
| `server/db/schemas/index.ts` | Modify - Export new schema |
| `env.ts` | Modify - Add OCI environment variables |
| `.env.example` | Modify - Add OCI env template |
| `package.json` | Modify - Add oci-sdk dependency |

---

## 13B: Suppression Sync Worker

### Queue Definition

**Modify `lib/queue/queues.ts`:**

```typescript
export const QUEUE_NAMES = {
  EMAIL: "email-queue",
  SUPPRESSION_SYNC: "suppression-sync-queue",
} as const

// Suppression sync queue - runs hourly
export const suppressionSyncQueue = new Queue(QUEUE_NAMES.SUPPRESSION_SYNC, {
  connection: getQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 24 }, // Keep last 24 runs
    removeOnFail: { count: 100 },
  },
})

// Schedule hourly sync
export async function scheduleSuppressionSync() {
  // Remove any existing repeat job
  const repeatableJobs = await suppressionSyncQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await suppressionSyncQueue.removeRepeatableByKey(job.key)
  }

  // Add new hourly repeat job
  await suppressionSyncQueue.add(
    "sync",
    {},
    {
      repeat: { pattern: "0 * * * *" }, // Every hour at minute 0
      jobId: "suppression-sync-hourly",
    }
  )
}
```

### Job Types

**New file: `lib/queue/suppression-sync-types.ts`**

```typescript
export interface SuppressionSyncJobData {
  // Empty - no input needed for sync job
}

export interface SuppressionSyncResult {
  synced: number
  emailLogsUpdated: number
  duration: number
}
```

### Sync Processor

**New file: `server/workers/suppression-sync-processor.ts`**

```typescript
import { Job } from "bullmq"
import { db } from "@/server/db/config/database"
import { emailSuppressions, emailLogs } from "@/server/db/schemas"
import { listAllSuppressions, isOciConfigured } from "@/lib/oci/email-client"
import { eq, and, inArray, not } from "drizzle-orm"
import type { SuppressionSyncJobData, SuppressionSyncResult } from "@/lib/queue/suppression-sync-types"

export async function processSuppressionSync(
  job: Job<SuppressionSyncJobData>
): Promise<SuppressionSyncResult> {
  const startTime = Date.now()

  if (!isOciConfigured()) {
    console.log("OCI not configured, skipping suppression sync")
    return { synced: 0, emailLogsUpdated: 0, duration: 0 }
  }

  console.log("Starting suppression list sync from OCI...")

  // 1. Fetch all suppressions from OCI
  const ociSuppressions = await listAllSuppressions()
  console.log(`Fetched ${ociSuppressions.length} suppressions from OCI`)

  // 2. Upsert into local cache
  const now = new Date()
  for (const suppression of ociSuppressions) {
    await db
      .insert(emailSuppressions)
      .values({
        id: suppression.id,
        email: suppression.emailAddress,
        reason: suppression.reason,
        errorDetail: suppression.errorDetail,
        errorSource: suppression.errorSource,
        ociCreatedAt: suppression.timeCreated,
        syncedAt: now,
      })
      .onConflictDoUpdate({
        target: emailSuppressions.id,
        set: {
          reason: suppression.reason,
          errorDetail: suppression.errorDetail,
          errorSource: suppression.errorSource,
          syncedAt: now,
        },
      })
  }

  // 3. Get all suppressed emails for lookup
  const suppressedEmails = ociSuppressions.map((s) => s.emailAddress)

  // 4. Update email_log entries that match suppressed emails
  // Only update emails that are currently "sent" (not already bounced/failed)
  let emailLogsUpdated = 0

  if (suppressedEmails.length > 0) {
    // Process in batches to avoid huge IN clauses
    const BATCH_SIZE = 500
    for (let i = 0; i < suppressedEmails.length; i += BATCH_SIZE) {
      const batch = suppressedEmails.slice(i, i + BATCH_SIZE)

      const result = await db
        .update(emailLogs)
        .set({
          status: "bounced",
          bouncedAt: now,
          providerResponse: { reason: "SUPPRESSION_LIST_SYNC" },
        })
        .where(
          and(
            inArray(emailLogs.toEmail, batch),
            eq(emailLogs.status, "sent") // Only update sent emails
          )
        )
        .returning({ id: emailLogs.id })

      emailLogsUpdated += result.length
    }
  }

  const duration = Date.now() - startTime
  console.log(
    `Suppression sync complete: ${ociSuppressions.length} synced, ${emailLogsUpdated} email logs updated (${duration}ms)`
  )

  return {
    synced: ociSuppressions.length,
    emailLogsUpdated,
    duration,
  }
}
```

### Sync Worker Entry Point

**New file: `server/workers/suppression-sync-worker.ts`**

```typescript
import "dotenv/config"
import { Worker } from "bullmq"
import { createQueueConnection } from "@/lib/queue/connection"
import { QUEUE_NAMES, scheduleSuppressionSync } from "@/lib/queue/queues"
import { processSuppressionSync } from "./suppression-sync-processor"
import type { SuppressionSyncJobData } from "@/lib/queue/suppression-sync-types"

console.log("Starting suppression sync worker...")

const connection = createQueueConnection()

const worker = new Worker<SuppressionSyncJobData>(
  QUEUE_NAMES.SUPPRESSION_SYNC,
  processSuppressionSync,
  {
    connection,
    concurrency: 1, // Only one sync at a time
  }
)

worker.on("completed", (job, result) => {
  console.log(`Suppression sync completed:`, result)
})

worker.on("failed", (job, error) => {
  console.error(`Suppression sync failed:`, error.message)
})

// Schedule the hourly sync job
scheduleSuppressionSync().then(() => {
  console.log("Suppression sync scheduled (hourly)")
})

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`)
  await worker.close()
  await connection.quit()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

console.log("Suppression sync worker started")
```

### PM2 Configuration

**Modify `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [
    {
      name: "events-crm-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: { NODE_ENV: "production", PORT: 3000 },
    },
    {
      name: "events-crm-email-worker",
      script: "server/workers/email-worker.ts",
      interpreter: "node",
      interpreter_args: "--loader tsx",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
    },
    {
      name: "events-crm-suppression-worker",
      script: "server/workers/suppression-sync-worker.ts",
      interpreter: "node",
      interpreter_args: "--loader tsx",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
    },
  ],
}
```

### Package.json Scripts

**Add to `package.json`:**

```json
{
  "scripts": {
    "worker:suppression": "tsx --watch server/workers/suppression-sync-worker.ts"
  }
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `lib/queue/queues.ts` | Modify - Add suppression sync queue |
| `lib/queue/suppression-sync-types.ts` | Create - Job type definitions |
| `server/workers/suppression-sync-processor.ts` | Create - Sync logic |
| `server/workers/suppression-sync-worker.ts` | Create - Worker entry point |
| `ecosystem.config.js` | Modify - Add suppression worker |
| `package.json` | Modify - Add worker script |

---

## 13C: Pre-Send Suppression Check

### Email Processor Update

**Modify `server/workers/email-processor.ts`:**

Add suppression check before sending:

```typescript
import { db } from "@/server/db/config/database"
import { emailSuppressions, emailLogs } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

async function processSingleJob(job: Job) {
  const { guestId, eventId, templateId, emailType, bulkJobId } = job.data

  // ... existing guest/template fetch code ...

  // NEW: Check if recipient is suppressed
  const suppression = await db.query.emailSuppressions.findFirst({
    where: eq(emailSuppressions.email, guest.email.toLowerCase()),
  })

  if (suppression) {
    // Mark email as bounced without sending
    await db
      .update(emailLogs)
      .set({
        status: "bounced",
        bouncedAt: new Date(),
        errorMessage: `Recipient on suppression list (${suppression.reason})`,
        providerResponse: {
          suppressionId: suppression.id,
          reason: suppression.reason,
          errorDetail: suppression.errorDetail,
        },
      })
      .where(eq(emailLogs.id, emailLogId))

    // Update bulk job failed count
    if (bulkJobId) {
      await db
        .update(bulkEmailJobs)
        .set({ failedCount: sql`${bulkEmailJobs.failedCount} + 1` })
        .where(eq(bulkEmailJobs.id, bulkJobId))
    }

    return { success: false, reason: "suppressed", email: guest.email }
  }

  // ... continue with existing send logic ...
}
```

### Files to Modify

| File | Action |
|------|--------|
| `server/workers/email-processor.ts` | Modify - Add suppression check before sending |

---

## 13D: Delivery Dashboard UI

### tRPC Router

**New file: `trpc/routers/email-delivery.ts`**

```typescript
import { db } from "@/server/db/config/database"
import { emailLogs, emailSuppressions, events } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, sql, gte, count } from "drizzle-orm"
import { z } from "zod"

export const emailDeliveryRouter = createTRPCRouter({
  // Get delivery stats for an event
  getStats: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_REPORTS,
      })

      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      // Get status counts
      const statusCounts = await db
        .select({
          status: emailLogs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailLogs)
        .where(eq(emailLogs.eventId, input.eventId))
        .groupBy(emailLogs.status)

      const stats = {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      }

      for (const row of statusCounts) {
        stats[row.status as keyof typeof stats] = row.count
      }

      const total = Object.values(stats).reduce((a, b) => a + b, 0)
      const totalAttempted = stats.sent + stats.bounced + stats.failed

      return {
        ...stats,
        total,
        bounceRate: totalAttempted > 0
          ? ((stats.bounced / totalAttempted) * 100).toFixed(2)
          : "0",
        failureRate: totalAttempted > 0
          ? ((stats.failed / totalAttempted) * 100).toFixed(2)
          : "0",
      }
    }),

  // Get recent bounces for an event
  getRecentBounces: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_REPORTS,
      })

      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      return db.query.emailLogs.findMany({
        where: and(
          eq(emailLogs.eventId, input.eventId),
          eq(emailLogs.status, "bounced")
        ),
        with: {
          guest: {
            columns: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [desc(emailLogs.bouncedAt)],
        limit: input.limit,
      })
    }),

  // Get suppression list stats
  getSuppressionStats: protectedProcedure
    .query(async ({ ctx }) => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailSuppressions)

      const byCause = await db
        .select({
          reason: emailSuppressions.reason,
          count: sql<number>`count(*)::int`,
        })
        .from(emailSuppressions)
        .groupBy(emailSuppressions.reason)

      // Get last sync time
      const [latest] = await db
        .select({ syncedAt: emailSuppressions.syncedAt })
        .from(emailSuppressions)
        .orderBy(desc(emailSuppressions.syncedAt))
        .limit(1)

      return {
        total: total.count,
        byCause,
        lastSyncAt: latest?.syncedAt || null,
      }
    }),

  // List suppressed emails (paginated)
  listSuppressions: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = []

      if (input.search) {
        conditions.push(sql`${emailSuppressions.email} ILIKE ${`%${input.search}%`}`)
      }

      const suppressions = await db.query.emailSuppressions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(emailSuppressions.ociCreatedAt)],
        limit: input.limit,
        offset: input.offset,
      })

      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailSuppressions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)

      return {
        suppressions,
        total,
        hasMore: input.offset + suppressions.length < total,
      }
    }),

  // Trigger manual sync
  triggerSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Check admin permission
      const { suppressionSyncQueue } = await import("@/lib/queue/queues")
      await suppressionSyncQueue.add("manual-sync", {}, { priority: 1 })
      return { success: true }
    }),
})
```

### Dashboard Component

**New file: `components/events/email-delivery-dashboard.tsx`**

```typescript
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Icons } from "@/components/icons"
import { trpc } from "@/lib/trpc/client"
import { formatDistanceToNow } from "date-fns"

interface EmailDeliveryDashboardProps {
  eventId: string
}

export function EmailDeliveryDashboard({ eventId }: EmailDeliveryDashboardProps) {
  const { data: stats, isLoading: statsLoading } = trpc.emailDelivery.getStats.useQuery({ eventId })
  const { data: bounces, isLoading: bouncesLoading } = trpc.emailDelivery.getRecentBounces.useQuery({ eventId, limit: 5 })
  const { data: suppressionStats } = trpc.emailDelivery.getSuppressionStats.useQuery()

  const triggerSync = trpc.emailDelivery.triggerSync.useMutation()

  if (statsLoading) {
    return <div>Loading delivery stats...</div>
  }

  const bounceRate = parseFloat(stats?.bounceRate || "0")
  const highBounceRate = bounceRate > 2

  return (
    <div className="space-y-6">
      {/* Bounce Rate Warning */}
      {highBounceRate && (
        <Alert variant="destructive">
          <Icons.alertTriangle className="h-4 w-4" />
          <AlertTitle>High Bounce Rate</AlertTitle>
          <AlertDescription>
            Your bounce rate is {stats?.bounceRate}%. Oracle recommends keeping it below 2%
            to maintain good sender reputation.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.bounced || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.bounceRate}% bounce rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.pending || 0) + (stats?.queued || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Suppression List Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppression List</CardTitle>
              <CardDescription>
                Addresses that have bounced or complained
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync.mutate()}
              disabled={triggerSync.isPending}
            >
              {triggerSync.isPending ? (
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.refresh className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold">{suppressionStats?.total || 0}</span>
              <span className="text-sm text-muted-foreground ml-2">suppressed addresses</span>
            </div>
            {suppressionStats?.lastSyncAt && (
              <Badge variant="secondary">
                Synced {formatDistanceToNow(suppressionStats.lastSyncAt, { addSuffix: true })}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bounces */}
      {bounces && bounces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Bounces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bounces.map((bounce) => (
                <div key={bounce.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{bounce.guest?.firstName} {bounce.guest?.lastName}</span>
                    <span className="text-muted-foreground ml-2">{bounce.toEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {(bounce.providerResponse as { reason?: string })?.reason || "BOUNCED"}
                    </Badge>
                    {bounce.bouncedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(bounce.bouncedAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `trpc/routers/email-delivery.ts` | Create - Delivery metrics router |
| `trpc/routers/_app.ts` | Modify - Register email-delivery router |
| `trpc/hooks/email-delivery-hooks.ts` | Create - React Query hooks |
| `components/events/email-delivery-dashboard.tsx` | Create - Dashboard UI |
| `app/[locale]/(web)/(dashboard)/[slug]/[eventId]/emails/page.tsx` | Modify - Add dashboard section |

---

## 13E: Suppression Management UI (Optional Enhancement)

### Suppression List Dialog

**New file: `components/events/suppression-list-dialog.tsx`**

A dialog to:
- View all suppressed emails with search
- See suppression reason and date
- Remove addresses from suppression list (calls OCI API)
- Manually add addresses to suppression list

### Files to Create

| File | Action |
|------|--------|
| `components/events/suppression-list-dialog.tsx` | Create - Management UI |

---

## 13F: Per-Guest Email History UI

Show email history at the guest level - both in the guest table (summary column) and in the guest detail sheet (full history tab).

### Guest Table: "Last Email" Column

**Modify `components/guests/guests-table.tsx`:**

Add a new column between "Status" and "Actions" showing the last email sent:

```
| Name        | Email           | ... | Status    | Last Email      | Actions |
|-------------|-----------------|-----|-----------|-----------------|---------|
| Ahmed Al-R. | ahmed@co.com    | ... | Confirmed | ✓ Sent Dec 11   | ...     |
| Sara Khan   | sara@test.com   | ... | Pending   | ✗ Bounced Dec 10| ...     |
| Mike Johnson| mike@org.com    | ... | Declined  | —               | ...     |
```

**Implementation:**
- Use existing `guest.lastEmailSentAt` field from schema
- Width: 140px
- Display: Relative date (e.g., "2 days ago") or "—" if never sent
- Add status icon: ✓ for sent, ✗ for bounced (requires fetching last email status)

**Column Header:**
```tsx
<div className="w-[140px] px-3 py-2 text-sm font-medium text-muted-foreground">
  Last Email
</div>
```

**Column Cell:**
```tsx
<div className="w-[140px] px-3 py-2 text-sm">
  {guest.lastEmailSentAt ? (
    <span className="text-muted-foreground">
      {formatDistanceToNow(guest.lastEmailSentAt, { addSuffix: true })}
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</div>
```

### Guest Detail Sheet: Email History Tab

**Modify `components/guests/guest-detail-sheet.tsx`:**

Convert the current single-view to a tabbed interface:

```
┌─────────────────────────────────────────────────────────┐
│ Ahmed Al-Rashid                           [Edit] [Close]│
│ Created Dec 1, 2024 • Confirmed                         │
├─────────────────────────────────────────────────────────┤
│ RSVP Link: https://...                    [Copy] [Regen]│
├─────────────────────────────────────────────────────────┤
│ [Details] [Email History]                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Email History tab content:                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Invitation Email                                 │   │
│  │ "You're Invited to Annual Summit 2024"          │   │
│  │ ✓ Sent • Dec 10, 2024 at 2:30 PM               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Reminder Email                                   │   │
│  │ "Don't Forget: Annual Summit is Tomorrow"       │   │
│  │ ✓ Sent • Dec 11, 2024 at 9:00 AM               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Confirmation Email                               │   │
│  │ "Thank You for Confirming"                      │   │
│  │ ✗ Bounced (HARDBOUNCE) • Dec 11, 2024 at 3:15 PM│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  No more emails                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### New Component: Guest Email History

**New file: `components/guests/guest-email-history.tsx`**

```typescript
"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { trpc } from "@/lib/trpc/client"
import { format } from "date-fns"

interface GuestEmailHistoryProps {
  guestId: string
}

const statusConfig = {
  pending: { icon: Icons.clock, color: "text-muted-foreground", label: "Pending" },
  queued: { icon: Icons.clock, color: "text-muted-foreground", label: "Queued" },
  sent: { icon: Icons.check, color: "text-green-600", label: "Sent" },
  delivered: { icon: Icons.checkCheck, color: "text-green-600", label: "Delivered" },
  opened: { icon: Icons.eye, color: "text-blue-600", label: "Opened" },
  clicked: { icon: Icons.mousePointer, color: "text-blue-600", label: "Clicked" },
  bounced: { icon: Icons.x, color: "text-destructive", label: "Bounced" },
  failed: { icon: Icons.alertTriangle, color: "text-orange-500", label: "Failed" },
}

export function GuestEmailHistory({ guestId }: GuestEmailHistoryProps) {
  const { data: emails, isLoading } = trpc.emailLogs.getByGuest.useQuery({
    guestId,
    limit: 20,
  })

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground">Loading email history...</div>
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icons.mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No emails sent yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => {
        const config = statusConfig[email.status]
        const StatusIcon = config.icon

        return (
          <Card key={email.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {email.template?.name || email.template?.type || "Email"}
                  </CardTitle>
                  <CardDescription className="text-xs truncate max-w-[280px]">
                    {email.subject}
                  </CardDescription>
                </div>
                <Badge
                  variant={email.status === "bounced" || email.status === "failed" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                <span>
                  {email.sentAt
                    ? format(email.sentAt, "MMM d, yyyy 'at' h:mm a")
                    : format(email.createdAt, "MMM d, yyyy 'at' h:mm a")}
                </span>
                {email.status === "bounced" && email.errorMessage && (
                  <span className="text-destructive">• {email.errorMessage}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

### Guest Detail Sheet Updates

**Modify `components/guests/guest-detail-sheet.tsx`:**

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GuestEmailHistory } from "./guest-email-history"

// Inside the component, wrap content in tabs:
<SheetContent className="sm:max-w-xl overflow-y-auto">
  <SheetHeader>
    {/* ... existing header ... */}
  </SheetHeader>

  {/* RSVP Link section stays above tabs */}
  <div className="px-4 py-3 border-b">
    {/* ... existing RSVP link UI ... */}
  </div>

  {/* Tabbed content */}
  <Tabs defaultValue="details" className="px-4 pb-4">
    <TabsList className="w-full mt-4">
      <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
      <TabsTrigger value="emails" className="flex-1">Email History</TabsTrigger>
    </TabsList>

    <TabsContent value="details" className="mt-4 space-y-6">
      {/* ... existing guest details content ... */}
    </TabsContent>

    <TabsContent value="emails" className="mt-4">
      <GuestEmailHistory guestId={guest.id} />
    </TabsContent>
  </Tabs>
</SheetContent>
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `components/guests/guest-email-history.tsx` | Create - Email history list component |
| `components/guests/guest-detail-sheet.tsx` | Modify - Add tabs and Email History tab |
| `components/guests/guests-table.tsx` | Modify - Add "Last Email" column |
| `components/guests/guests-table-skeleton.tsx` | Modify - Update skeleton to match new column count |

---

## i18n Additions

**Add to `messages/en.json`:**

```json
{
  "emailDelivery": {
    "title": "Email Delivery",
    "stats": {
      "sent": "Sent",
      "bounced": "Bounced",
      "failed": "Failed",
      "pending": "Pending",
      "bounceRate": "Bounce Rate"
    },
    "suppressionList": {
      "title": "Suppression List",
      "description": "Addresses that have bounced or complained",
      "syncNow": "Sync Now",
      "lastSync": "Last synced {time}",
      "total": "{count} suppressed addresses"
    },
    "recentBounces": {
      "title": "Recent Bounces"
    },
    "warnings": {
      "highBounceRate": "High Bounce Rate",
      "highBounceRateDesc": "Your bounce rate is {rate}%. Oracle recommends keeping it below 2% to maintain good sender reputation."
    },
    "reasons": {
      "HARDBOUNCE": "Hard Bounce",
      "SOFTBOUNCE": "Soft Bounce",
      "COMPLAINT": "Complaint",
      "MANUAL": "Manual",
      "UNSUBSCRIBE": "Unsubscribe"
    }
  },
  "guestEmailHistory": {
    "title": "Email History",
    "lastEmail": "Last Email",
    "noEmailsSent": "No emails sent yet",
    "loading": "Loading email history...",
    "status": {
      "pending": "Pending",
      "queued": "Queued",
      "sent": "Sent",
      "delivered": "Delivered",
      "opened": "Opened",
      "clicked": "Clicked",
      "bounced": "Bounced",
      "failed": "Failed"
    }
  }
}
```

**Add to `messages/ar.json`:**

```json
{
  "emailDelivery": {
    "title": "تسليم البريد الإلكتروني",
    "stats": {
      "sent": "مرسل",
      "bounced": "مرتد",
      "failed": "فاشل",
      "pending": "قيد الانتظار",
      "bounceRate": "معدل الارتداد"
    },
    "suppressionList": {
      "title": "قائمة الحظر",
      "description": "العناوين التي ارتدت أو تم الإبلاغ عنها",
      "syncNow": "مزامنة الآن",
      "lastSync": "آخر مزامنة {time}",
      "total": "{count} عنوان محظور"
    },
    "recentBounces": {
      "title": "الارتدادات الأخيرة"
    },
    "warnings": {
      "highBounceRate": "معدل ارتداد مرتفع",
      "highBounceRateDesc": "معدل الارتداد لديك {rate}%. توصي Oracle بإبقائه أقل من 2% للحفاظ على سمعة المرسل."
    },
    "reasons": {
      "HARDBOUNCE": "ارتداد دائم",
      "SOFTBOUNCE": "ارتداد مؤقت",
      "COMPLAINT": "شكوى",
      "MANUAL": "يدوي",
      "UNSUBSCRIBE": "إلغاء الاشتراك"
    }
  },
  "guestEmailHistory": {
    "title": "سجل البريد الإلكتروني",
    "lastEmail": "آخر بريد",
    "noEmailsSent": "لم يتم إرسال أي بريد بعد",
    "loading": "جاري تحميل سجل البريد...",
    "status": {
      "pending": "قيد الانتظار",
      "queued": "في الطابور",
      "sent": "مرسل",
      "delivered": "تم التسليم",
      "opened": "تم الفتح",
      "clicked": "تم النقر",
      "bounced": "مرتد",
      "failed": "فاشل"
    }
  }
}
```

---

## Critical Files Reference

| Purpose | File Path |
|---------|-----------|
| Email log schema | `server/db/schemas/email-log.ts` |
| Email sending | `lib/email.ts` |
| Email processor | `server/workers/email-processor.ts` |
| Email worker | `server/workers/email-worker.ts` |
| Queue definitions | `lib/queue/queues.ts` |
| PM2 config | `ecosystem.config.js` |
| Environment vars | `env.ts` |
| App router | `trpc/routers/_app.ts` |

---

## Verification Checklist

### 13A: OCI SDK Setup
- [ ] `oci-sdk` dependency installed
- [ ] OCI environment variables added to `.env.example`
- [ ] OCI client connects successfully
- [ ] `email_suppression` migration created and run

### 13B: Suppression Sync Worker
- [ ] Worker starts without errors (`pnpm worker:suppression`)
- [ ] Hourly job scheduled correctly
- [ ] Suppressions synced from OCI to local table
- [ ] Email logs updated to `bounced` when recipient matches

### 13C: Pre-Send Check
- [ ] Emails to suppressed addresses blocked
- [ ] Blocked emails marked as `bounced` with reason
- [ ] Bulk job counts updated correctly

### 13D: Dashboard
- [ ] Stats display correctly (sent/bounced/failed)
- [ ] Bounce rate calculated and displayed
- [ ] Warning shown when bounce rate > 2%
- [ ] Recent bounces list populated
- [ ] Manual sync button works

### 13E: Suppression Management
- [ ] Suppression list viewable with search
- [ ] Remove from suppression calls OCI API
- [ ] Add to suppression calls OCI API

### 13F: Per-Guest Email History UI
- [ ] "Last Email" column added to guest table
- [ ] Column shows relative date (e.g., "2 days ago")
- [ ] Guest detail sheet converted to tabs
- [ ] "Email History" tab shows all emails sent to guest
- [ ] Email cards show template type, subject, status, date
- [ ] Bounced emails show error reason
- [ ] Empty state when no emails sent

---

## File Structure Summary

**New files to create:**

```
lib/
├── oci/
│   ├── config.ts
│   └── email-client.ts
├── queue/
│   └── suppression-sync-types.ts

server/
├── db/schemas/
│   └── email-suppression.ts
├── workers/
│   ├── suppression-sync-processor.ts
│   └── suppression-sync-worker.ts

trpc/
├── routers/
│   └── email-delivery.ts
├── hooks/
│   └── email-delivery-hooks.ts

components/events/
├── email-delivery-dashboard.tsx
└── suppression-list-dialog.tsx

components/guests/
└── guest-email-history.tsx
```

**Files to modify:**

```
env.ts                              # Add OCI environment variables
.env.example                        # Add OCI env template
package.json                        # Add oci-sdk, worker script
lib/queue/queues.ts                 # Add suppression sync queue
server/db/schemas/index.ts          # Export emailSuppressions
server/workers/email-processor.ts   # Add pre-send suppression check
trpc/routers/_app.ts                # Register emailDelivery router
ecosystem.config.js                 # Add suppression worker
messages/en.json                    # Add emailDelivery translations
messages/ar.json                    # Add Arabic translations
components/guests/guests-table.tsx           # Add "Last Email" column
components/guests/guests-table-skeleton.tsx  # Update skeleton columns
components/guests/guest-detail-sheet.tsx     # Add tabs and Email History tab
```

---

## References

- [OCI Email Delivery Metrics](https://docs.oracle.com/en-us/iaas/Content/Email/Reference/metricsalarms.htm)
- [OCI Suppression List API](https://docs.oracle.com/en-us/iaas/tools/oci-cli/3.68.0/oci_cli_docs/cmdref/email/suppression/list.html)
- [OCI Email Delivery Overview](https://docs.oracle.com/en-us/iaas/Content/Email/Concepts/overview.htm)
- [OCI Email Delivery FAQ](https://www.oracle.com/application-development/email-delivery/faq/)
