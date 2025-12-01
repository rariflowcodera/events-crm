# Stage 7: Bulk Email Sending

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Build bulk email sending functionality that enables event managers to send invitation, reminder, and other emails to guests. This builds on the email template builder (Stage 6) by connecting templates to actual email delivery with background processing for scale.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config UI Location | Event Settings Tab | Keeps configuration with other event settings |
| Batch Processing | BullMQ Background Queue | Reliable async processing, handles 500+ guests |
| Template Binding | Pre-assigned defaults | One-click send, consistent experience |
| Category Templates | Event-level only | Simpler configuration, MVP scope |
| Worker Deployment | PM2 on same server | Simpler deployment, shares resources |
| Progress Tracking | Polling (2s interval) | Simpler than SSE, reliable |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 7A | Email Configuration UI in Settings | ~5 files |
| 7B | BullMQ Queue Infrastructure | ~8 files |
| 7C | Bulk Email tRPC Router & Worker | ~6 files |
| 7D | UI Integration (Send Button, Progress) | ~6 files |

---

## 7A: Email Configuration UI

### Data Model Approach

**Use existing `isDefault` flag on templates** - no schema changes needed:
- Templates with `isDefault: true` and `categoryId: null` are event-level defaults
- Existing router already handles mutual exclusivity per type

### tRPC Changes

**File: `trpc/routers/email-templates.ts`**

Add two procedures:

```typescript
// Get default templates for each type
getDefaultTemplates: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const templates = await db.query.emailTemplates.findMany({
      where: and(
        eq(emailTemplates.eventId, input.eventId),
        eq(emailTemplates.isDefault, true),
        isNull(emailTemplates.categoryId)
      ),
    })
    return Object.fromEntries(templates.map(t => [t.type, t]))
  })

// Set a template as default for its type
setDefaultTemplate: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    type: z.enum(emailTemplateTypeValues),
    templateId: z.string().uuid().nullable(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Unset current default for this type
    await db.update(emailTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(
        eq(emailTemplates.eventId, input.eventId),
        eq(emailTemplates.type, input.type),
        isNull(emailTemplates.categoryId),
        eq(emailTemplates.isDefault, true)
      ))

    // Set new default if provided
    if (input.templateId) {
      await db.update(emailTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(emailTemplates.id, input.templateId))
    }

    return { success: true }
  })
```

### UI Component Design

**New file: `components/events/email-configuration-card.tsx`**

```
+------------------------------------------------------------------+
| Email Configuration                                               |
| Assign templates to each email type for automated sending         |
+------------------------------------------------------------------+
|                                                                   |
| Invitation Email                                                  |
| +---------------------------------------------------------------+ |
| | Select a template...                                       v  | |
| +---------------------------------------------------------------+ |
| Currently: "VIP Invitation" - Subject: "You're Invited..."       |
|                                                                   |
+------------------------------------------------------------------+
| Reminder Email                                                    |
| +---------------------------------------------------------------+ |
| | Select a template...                                       v  | |
| +---------------------------------------------------------------+ |
| No template assigned - Reminders will not be sent               |
|                                                                   |
+------------------------------------------------------------------+
| Confirmation Email                                                |
| +---------------------------------------------------------------+ |
| | Select a template...                                       v  | |
| +---------------------------------------------------------------+ |
| Auto-sent when guest confirms RSVP                               |
|                                                                   |
+------------------------------------------------------------------+
| Need to create new templates? Go to Emails tab →                 |
+------------------------------------------------------------------+
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `trpc/routers/email-templates.ts` | Add `getDefaultTemplates`, `setDefaultTemplate` |
| `trpc/hooks/email-hooks.ts` | Add hooks for new procedures |
| `components/events/email-configuration-card.tsx` | New component |
| `components/events/event-settings-tab.tsx` | Import and render card |
| `messages/en.json`, `messages/ar.json` | Add i18n strings |

---

## 7B: BullMQ Queue Infrastructure

### Dependencies

```bash
pnpm add bullmq
```

### File Structure

```
lib/
├── queue/
│   ├── connection.ts      # Redis connection for BullMQ
│   ├── queues.ts          # Queue definitions
│   └── types.ts           # Job payload types
server/
├── db/schemas/
│   └── bulk-email-job.ts  # New table for tracking bulk jobs
└── workers/
    ├── email-worker.ts    # Worker entry point
    └── email-processor.ts # Job processing logic
```

### Schema: `bulk_email_job`

**New file: `server/db/schemas/bulk-email-job.ts`**

```typescript
import { pgEnum, pgTable, text, timestamp, integer, json } from "drizzle-orm/pg-core"
import { events, emailTemplates, users } from "."

export const bulkEmailJobStatusEnum = pgEnum("bulk_email_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
])

export const bulkEmailJobs = pgTable("bulk_email_job", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => emailTemplates.id),
  emailType: text("email_type").notNull(),
  status: bulkEmailJobStatusEnum("status").notNull().default("pending"),
  totalEmails: integer("total_emails").notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  guestIds: json("guest_ids").$type<string[]>(),
  bullmqJobId: text("bullmq_job_id"),
  errorMessage: text("error_message"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
})
```

### Queue Connection

**New file: `lib/queue/connection.ts`**

```typescript
import { REDIS_URL_ENV } from "@/env"
import IORedis from "ioredis"

export const createQueueConnection = () => {
  return new IORedis(REDIS_URL_ENV, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  })
}

let queueConnection: IORedis | null = null

export const getQueueConnection = () => {
  if (!queueConnection) {
    queueConnection = createQueueConnection()
  }
  return queueConnection
}
```

### Queue Definition

**New file: `lib/queue/queues.ts`**

```typescript
import { Queue } from "bullmq"
import { getQueueConnection } from "./connection"

export const QUEUE_NAMES = {
  EMAIL: "email-queue",
} as const

export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: getQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
})
```

### Job Types

**New file: `lib/queue/types.ts`**

```typescript
export type EmailJobType =
  | "invitation"
  | "reminder"
  | "confirmation"
  | "declined_acknowledgment"
  | "update"
  | "cancellation"
  | "custom"

export interface SingleEmailJobData {
  type: "single"
  guestId: string
  eventId: string
  templateId: string
  emailType: EmailJobType
  bulkJobId: string
}

export interface BulkEmailJobData {
  type: "bulk"
  bulkJobId: string
  eventId: string
  templateId: string
  emailType: EmailJobType
  guestIds: string[]
}

export type EmailJobData = SingleEmailJobData | BulkEmailJobData
```

---

## 7C: Bulk Email tRPC Router & Worker

### tRPC Router

**New file: `trpc/routers/bulk-emails.ts`**

```typescript
export const bulkEmailsRouter = createTRPCRouter({
  // Start bulk email send
  sendBulk: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      emailType: z.enum(emailTypeValues),
      guestIds: z.array(z.string().uuid()).min(1).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify permissions
      // 2. Get default template for email type
      // 3. Validate guests have emails
      // 4. Create bulk_email_job record
      // 5. Add job to BullMQ queue
      // 6. Return job ID
    }),

  // Get job status (for polling)
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Return job with calculated progress percentage
    }),

  // List recent jobs for event
  listJobs: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(/* returns paginated job list */),

  // Cancel pending/processing job
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(/* removes from queue, updates status */),
})
```

### Worker Entry Point

**New file: `server/workers/email-worker.ts`**

```typescript
import "dotenv/config"
import { Worker } from "bullmq"
import { createQueueConnection } from "@/lib/queue/connection"
import { QUEUE_NAMES } from "@/lib/queue/queues"
import { processEmailJob } from "./email-processor"

const connection = createQueueConnection()

const worker = new Worker(
  QUEUE_NAMES.EMAIL,
  processEmailJob,
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }, // 10 emails/second
  }
)

worker.on("completed", (job) => console.log(`Job ${job.id} completed`))
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err.message))

process.on("SIGTERM", async () => {
  await worker.close()
  process.exit(0)
})

console.log("Email worker started")
```

### Email Processor

**New file: `server/workers/email-processor.ts`**

```typescript
import { Job } from "bullmq"
import { db } from "@/server/db/config/database"
import { email } from "@/lib/email"
import { EmailJobData } from "@/lib/queue/types"
import { renderEmailTemplate } from "@/lib/queue/email-job"

export async function processEmailJob(job: Job<EmailJobData>) {
  if (job.data.type === "bulk") {
    return processBulkJob(job)
  }
  return processSingleJob(job)
}

async function processBulkJob(job: Job) {
  // 1. Update bulk job status to "processing"
  // 2. Create child jobs for each guest
  // 3. Stagger child jobs to smooth rate limiting
}

async function processSingleJob(job: Job) {
  // 1. Fetch guest, template, event
  // 2. Create email_log entry (pending)
  // 3. Render template with variables
  // 4. Send via nodemailer
  // 5. Update email_log status
  // 6. Update guest.lastEmailSentAt
  // 7. Increment bulk job sent/failed count
}
```

### Template Rendering

**New file: `lib/queue/email-job.ts`**

```typescript
export function renderEmailTemplate(
  template: EmailTemplate,
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en"
): { subject: string; html: string; text?: string } {
  const content = language === "ar" && template.content.ar?.subject
    ? template.content.ar
    : template.content.en

  const variables = {
    "guest.firstName": guest.firstName || "",
    "guest.lastName": guest.lastName || "",
    "guest.fullName": `${guest.firstName} ${guest.lastName}`.trim(),
    "guest.title": guest.title || "",
    "guest.email": guest.email || "",
    "guest.position": guest.position || "",
    "guest.entity": guest.entity || "",
    "event.name": event.name,
    "event.venue": event.venue || "",
    "event.venueAddress": event.venueAddress || "",
    "event.startDate": event.startDate ? formatDate(event.startDate) : "",
    "event.endDate": event.endDate ? formatDate(event.endDate) : "",
    "rsvp.link": `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${guest.rsvpToken}`,
    "rsvp.confirmLink": `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${guest.rsvpToken}?action=confirm`,
    "rsvp.declineLink": `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${guest.rsvpToken}?action=decline`,
  }

  return {
    subject: replaceVariables(content.subject, variables),
    html: replaceVariables(content.htmlContent, variables),
    text: content.textContent ? replaceVariables(content.textContent, variables) : undefined,
  }
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+\.\w+)\}\}/g, (match, key) => variables[key] || match)
}
```

---

## 7D: UI Integration

### Enable Send Invitations Button

**File: `components/guests/guests-toolbar.tsx`**

Remove `disabled` prop from Send Invitations button:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => onBulkAction("send_invitation")}
  // disabled  <- Remove this
>
  <Icons.mail className="mr-2 h-4 w-4" />
  Send Invitations
</Button>
```

### Bulk Email Dialog

**New file: `components/guests/bulk-email-dialog.tsx`**

```
+------------------------------------------+
| Send Invitations                         |
+------------------------------------------+
| You are about to send invitation emails  |
| to 45 selected guests.                   |
|                                          |
| Template: "VIP Invitation"               |
| Subject: "You're Invited to..."          |
|                                          |
| [Cancel]              [Send 45 Emails]   |
+------------------------------------------+
```

### Progress Component

**New file: `components/guests/bulk-email-progress.tsx`**

```typescript
export function BulkEmailProgress({ jobId, onComplete }: Props) {
  const { data: job } = trpc.bulkEmails.getJobStatus.useQuery(
    { jobId },
    {
      refetchInterval: (data) => {
        if (["completed", "failed", "cancelled"].includes(data?.status)) {
          return false
        }
        return 2000 // Poll every 2 seconds
      },
    }
  )

  return (
    <div className="space-y-4">
      <Progress value={job?.progress || 0} />
      <p className="text-sm text-muted-foreground">
        {job?.sentCount} of {job?.totalEmails} sent
        {job?.failedCount > 0 && ` (${job.failedCount} failed)`}
      </p>
    </div>
  )
}
```

### Row Actions

**File: `components/guests/guest-row-actions.tsx`**

Enable "Send Invitation" menu item for individual guests.

---

## PM2 Deployment Configuration

**New file: `ecosystem.config.js`**

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
      name: "events-crm-worker",
      script: "server/workers/email-worker.ts",
      interpreter: "node",
      interpreter_args: "--loader tsx",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
    },
  ],
}
```

---

## i18n Additions

**Add to `messages/en.json`:**

```json
{
  "emailConfig": {
    "title": "Email Configuration",
    "description": "Assign templates to each email type for automated sending",
    "types": {
      "invitation": "Invitation Email",
      "reminder": "Reminder Email",
      "confirmation": "Confirmation Email",
      "declined_acknowledgment": "Decline Acknowledgment",
      "update": "Update Email",
      "cancellation": "Cancellation Email"
    },
    "noTemplate": "No template assigned",
    "selectTemplate": "Select a template...",
    "currentTemplate": "Currently using",
    "createNew": "Need to create new templates?"
  },
  "bulkEmail": {
    "sendInvitations": "Send Invitations",
    "sendReminders": "Send Reminders",
    "confirmTitle": "Send {type}",
    "confirmMessage": "You are about to send {type} emails to {count} guest(s).",
    "confirmSend": "Send {count} Email(s)",
    "sending": "Sending Emails...",
    "progress": "{sent} of {total} sent",
    "failed": "{count} failed",
    "complete": "All emails sent successfully!",
    "noTemplateError": "No {type} template configured. Go to Event Settings to assign one."
  }
}
```

**Add to `messages/ar.json`:**

```json
{
  "emailConfig": {
    "title": "تكوين البريد الإلكتروني",
    "description": "تعيين القوالب لكل نوع بريد للإرسال التلقائي",
    "types": {
      "invitation": "بريد الدعوة",
      "reminder": "بريد التذكير",
      "confirmation": "بريد التأكيد",
      "declined_acknowledgment": "إقرار الاعتذار",
      "update": "بريد التحديث",
      "cancellation": "بريد الإلغاء"
    },
    "noTemplate": "لم يتم تعيين قالب",
    "selectTemplate": "اختر قالب...",
    "currentTemplate": "يستخدم حاليا",
    "createNew": "تحتاج إلى إنشاء قوالب جديدة؟"
  },
  "bulkEmail": {
    "sendInvitations": "إرسال الدعوات",
    "sendReminders": "إرسال التذكيرات",
    "confirmTitle": "إرسال {type}",
    "confirmMessage": "أنت على وشك إرسال {count} رسالة {type}.",
    "confirmSend": "إرسال {count} رسالة",
    "sending": "جاري إرسال الرسائل...",
    "progress": "تم إرسال {sent} من {total}",
    "failed": "فشل {count}",
    "complete": "تم إرسال جميع الرسائل بنجاح!",
    "noTemplateError": "لم يتم تكوين قالب {type}. اذهب إلى إعدادات الحدث لتعيين واحد."
  }
}
```

---

## Critical Files Reference

| Pattern | File |
|---------|------|
| Event Settings Tab | `components/events/event-settings-tab.tsx` |
| Email Templates Schema | `server/db/schemas/email-template.ts` |
| Email Templates Router | `trpc/routers/email-templates.ts` |
| Email Logs Schema | `server/db/schemas/email-log.ts` |
| Email Service | `lib/email.ts` |
| Guests Toolbar | `components/guests/guests-toolbar.tsx` |
| Guest Row Actions | `components/guests/guest-row-actions.tsx` |
| Guests Router | `trpc/routers/guests.ts` |
| Redis Connection | `lib/redis.ts` |
| App Router | `trpc/routers/_app.ts` |

---

## Verification Checklist

### 7A: Email Configuration UI
- [x] Email Configuration card renders in Settings tab
- [x] Dropdown shows templates filtered by type
- [x] Selecting template sets it as default
- [x] "No template" state shows warning
- [x] Link to Emails tab works

### 7B: Queue Infrastructure
- [x] BullMQ dependency installed
- [x] `bulk_email_job` table created via migration
- [x] Worker starts without errors
- [x] Rate limiting enforced (10 emails/sec)

### 7C: Bulk Email Router
- [x] `sendBulk` creates job and queues it
- [x] `getJobStatus` returns progress percentage
- [x] `listJobs` returns event's job history
- [x] `cancelJob` removes pending jobs
- [x] Emails sent with correct template content
- [x] Template variables replaced correctly
- [x] `email_log` entries created for each send
- [x] Guest status updated to "invited"
- [x] Guest `lastEmailSentAt` updated

### 7D: UI Integration
- [x] Send Invitations button enabled (not disabled)
- [x] Confirmation dialog shows guest count and template
- [x] Progress bar updates every 2 seconds (1 second polling)
- [x] Completion message shown
- [x] Failed count displayed if any
- [ ] Individual guest "Send Invitation" action works (future enhancement)

---

## File Structure Summary

**New files to create:**

```
lib/queue/
├── connection.ts
├── queues.ts
├── types.ts
└── email-job.ts

server/db/schemas/
└── bulk-email-job.ts

server/workers/
├── email-worker.ts
└── email-processor.ts

trpc/routers/
└── bulk-emails.ts

trpc/hooks/
└── bulk-emails-hooks.ts

components/events/
└── email-configuration-card.tsx

components/guests/
├── bulk-email-dialog.tsx
└── bulk-email-progress.tsx

ecosystem.config.js
```

**Files to modify:**

```
trpc/routers/email-templates.ts    # Add getDefaultTemplates, setDefaultTemplate
trpc/routers/_app.ts               # Add bulkEmailsRouter
trpc/hooks/email-hooks.ts          # Add hooks for new procedures
components/events/event-settings-tab.tsx  # Add EmailConfigurationCard
components/guests/guests-toolbar.tsx      # Enable Send Invitations button
components/guests/guest-row-actions.tsx   # Enable Send Invitation item
server/db/schemas/index.ts         # Export bulkEmailJobs
messages/en.json                   # Add emailConfig, bulkEmail
messages/ar.json                   # Add Arabic translations
package.json                       # Add bullmq, pm2 scripts
```

---

## Implementation Notes

### Completed: 2024-11-29

All phases (7A-7D) have been implemented successfully.

**Key Files Created:**
- `lib/queue/connection.ts` - Redis connection for BullMQ
- `lib/queue/types.ts` - Job data types (SingleEmailJobData, BulkEmailJobData)
- `lib/queue/queues.ts` - Queue definition with rate limiting
- `lib/queue/email-job.ts` - Template rendering with variable substitution
- `server/db/schemas/bulk-email-job.ts` - Bulk job tracking table
- `server/workers/email-processor.ts` - Job processor for bulk/single emails
- `server/workers/email-worker.ts` - Worker entry point
- `trpc/routers/bulk-email.ts` - tRPC router for bulk email operations
- `trpc/hooks/bulk-email-hooks.ts` - React Query hooks
- `components/events/email-configuration-card.tsx` - Default template configuration UI
- `components/guests/bulk-send-email-dialog.tsx` - Send dialog with progress

**Key Commands:**
```bash
# Development (with hot reload)
pnpm worker:email

# Production (via PM2)
pm2 start ecosystem.config.js

# Start just the worker
pm2 start ecosystem.config.js --only events-crm-worker
```

**Notes:**
- Individual guest "Send Invitation" action (from row menu) is listed as future enhancement
- Polling interval is 1 second (not 2 seconds as originally planned) for faster UI updates
- Router named `bulkEmail` (singular) instead of `bulkEmails` (plural) in final implementation
