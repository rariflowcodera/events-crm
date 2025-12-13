# Stage 14: Document Management for Email Templates

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Build a document library feature that allows event managers to upload and organize documents (PDFs, images) which can be inserted as links into email templates. Documents support category-based visibility and integrate seamlessly with the existing variable insertion system from Stage 6.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage Location | AWS S3 (existing) | Reuses Bahrain region setup for KSA compliance |
| Access Control | Public URLs | Works in all email clients, no auth required |
| Organization | Types + Category Visibility | Simple list with document types; can restrict to specific guest categories |
| File Types | PDFs + Images | Covers schedules, maps, policies; images for visual guides |
| Size Limit | 10 MB | Sufficient for multi-page PDFs while controlling costs |
| Template Integration | Variable format `{{document.UUID}}` | Consistent with existing variables, automatic HTML link rendering |
| UI Location | Section in Emails tab | Keeps document management close to template editing |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 14A | Database Schema & Migration | ~3 files |
| 14B | Upload Infrastructure | ~2 files |
| 14C | tRPC Router & Hooks | ~4 files |
| 14D | Email Template Integration | ~2 files |
| 14E | Document Library UI | ~5 files |
| 14F | Branded Document URLs (Custom Domains) | ~3 files |
| 14G | i18n Translations | ~2 files |

---

## 14A: Database Schema & Migration

### Schema Definition

**Create `server/db/schemas/event-document.ts`:**

```typescript
import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { users } from "./user"

export const eventDocumentTypeEnum = pgEnum("event_document_type", [
  "schedule",     // Event agenda/schedule
  "map",          // Venue maps, floor plans
  "policy",       // Terms, policies, guidelines
  "brochure",     // Event brochures, info packets
  "invitation",   // Formal invitation letters
  "other",        // Miscellaneous documents
])

export const eventDocumentTypeValues = [
  "schedule",
  "map",
  "policy",
  "brochure",
  "invitation",
  "other",
] as const

export type EventDocumentType = (typeof eventDocumentTypeValues)[number]

export const eventDocuments = pgTable(
  "event_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    // Document metadata
    name: text("name").notNull(),              // Display name
    fileName: text("file_name").notNull(),     // Original filename
    url: text("url").notNull(),                // S3 public URL
    mimeType: text("mime_type").notNull(),     // e.g., "application/pdf"
    fileSize: integer("file_size").notNull(),  // Size in bytes

    // Categorization
    type: eventDocumentTypeEnum("type").notNull().default("other"),

    // Category visibility: null/empty = all categories, array = specific categories only
    categoryIds: jsonb("category_ids").$type<string[]>(),

    // Audit
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("event_document_event_idx").on(table.eventId),
    index("event_document_type_idx").on(table.eventId, table.type),
  ]
)

export const eventDocumentsRelations = relations(
  eventDocuments,
  ({ one }) => ({
    event: one(events, {
      fields: [eventDocuments.eventId],
      references: [events.id],
    }),
    creator: one(users, {
      fields: [eventDocuments.createdBy],
      references: [users.id],
    }),
  })
)
```

**Update `server/db/schemas/index.ts`:**

```typescript
export * from "@/server/db/schemas/event-document"
```

### Migration

Run after schema creation:
```bash
npm run db:generate
npm run db:migrate
```

---

## 14B: Upload Infrastructure

### Document Upload API

**Create `app/api/document-upload/route.ts`:**

Based on existing `app/api/image-upload/route.ts` pattern with these changes:

```typescript
import * as crypto from "crypto"
import * as path from "path"
import { NextRequest } from "next/server"
import { S3_UPLOAD_BUCKET_ENV, STORAGE_PROVIDER_ENV } from "@/env"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { awsClient } from "@/lib/aws"
import { createRateLimiter } from "@/lib/ratelimit"
import { responses } from "@/lib/responses"
import { db } from "@/server/db/config/database"
import { workspaceMembers, events } from "@/server/db/schemas"
import { eq, and } from "drizzle-orm"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const getFilename = (originalName: string) => {
  const originalExtension = path.extname(originalName)
  const currentTime = new Date().getTime().toString()
  const hash = crypto.createHash("md5").update(currentTime).digest("hex")
  return `${hash}${originalExtension}`
}

const ratelimit = createRateLimiter(5, 60)

export async function POST(req: NextRequest) {
  try {
    const { filesize, filename, filetype, eventId } = await req.json()
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    // Verify event exists and user has access
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    })

    if (!event) {
      return responses.badRequestResponse("Event not found")
    }

    const isMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, event.workspaceId),
        eq(workspaceMembers.userId, user.id)
      ),
    })

    if (!isMember) {
      return responses.forbiddenResponse("Not a member of this workspace")
    }

    // Rate limiting
    const identifier = `ratelimit:document-upload:${user.id}`
    const { success } = await ratelimit.limit(identifier)
    if (!success) {
      return responses.tooManyRequestsResponse()
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(filetype)) {
      return responses.badRequestResponse("File type not allowed. Only PDF and images accepted.")
    }

    // Validate file size
    if (filesize > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds 10MB limit")
    }

    const generatedFilename = getFilename(filename)

    // Local storage mode
    if (STORAGE_PROVIDER_ENV === "local") {
      return responses.successResponse({
        uploadUrl: `/api/local-document-upload`,
        documentUrl: `/api/document-file?event=${eventId}&name=${generatedFilename}`,
        storageProvider: "local",
        eventId,
      })
    }

    // S3 storage mode
    const s3Key = `documents/${eventId}/${generatedFilename}`

    const params = {
      Bucket: S3_UPLOAD_BUCKET_ENV,
      Key: s3Key,
      ContentType: filetype,
      CacheControl: "max-age=63072000",
    }

    const preSignedUrl = await getSignedUrl(awsClient, new PutObjectCommand(params), {
      expiresIn: 60 * 60, // 1 hour
    })

    const documentUrl = `https://${S3_UPLOAD_BUCKET_ENV}.s3.amazonaws.com/${s3Key}`

    return responses.successResponse({
      preSignedUrl,
      documentUrl,
      storageProvider: "s3",
      eventId,
    })
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
```

**Create `app/api/local-document-upload/route.ts`:**

Mirror `app/api/local-upload/route.ts` pattern with document-specific validation:
- Store in `uploads/documents/{eventId}/{filename}`
- Validate PDF + image MIME types
- 10MB size limit

---

## 14C: tRPC Router & Hooks

### Router

**Create `trpc/routers/event-documents.ts`:**

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { eventDocuments, events, workspaceMembers } from "@/server/db/schemas"
import { eq, and, desc } from "drizzle-orm"
import { eventDocumentTypeValues } from "@/server/db/schemas/event-document"

export const eventDocumentsRouter = createTRPCRouter({
  // List documents for an event
  getMany: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      type: z.enum(eventDocumentTypeValues).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const whereConditions = [eq(eventDocuments.eventId, input.eventId)]
      if (input.type) {
        whereConditions.push(eq(eventDocuments.type, input.type))
      }

      return db.query.eventDocuments.findMany({
        where: and(...whereConditions),
        with: { creator: { columns: { id: true, name: true } } },
        orderBy: [desc(eventDocuments.createdAt)],
      })
    }),

  // Create document record (after S3 upload)
  create: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      name: z.string().min(1).max(100),
      fileName: z.string(),
      url: z.string().url(),
      mimeType: z.string(),
      fileSize: z.number().max(10 * 1024 * 1024),
      type: z.enum(eventDocumentTypeValues),
      categoryIds: z.array(z.string().uuid()).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const [document] = await db
        .insert(eventDocuments)
        .values({
          eventId: input.eventId,
          name: input.name,
          fileName: input.fileName,
          url: input.url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          type: input.type,
          categoryIds: input.categoryIds,
          createdBy: ctx.user.id,
        })
        .returning()

      return document
    }),

  // Update document metadata
  update: protectedProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      type: z.enum(eventDocumentTypeValues).optional(),
      categoryIds: z.array(z.string().uuid()).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await db.query.eventDocuments.findFirst({
        where: eq(eventDocuments.id, input.documentId),
        with: { event: true },
      })

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const [updated] = await db
        .update(eventDocuments)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.type && { type: input.type }),
          ...(input.categoryIds !== undefined && { categoryIds: input.categoryIds }),
          updatedAt: new Date(),
        })
        .where(eq(eventDocuments.id, input.documentId))
        .returning()

      return updated
    }),

  // Delete document
  delete: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const document = await db.query.eventDocuments.findFirst({
        where: eq(eventDocuments.id, input.documentId),
        with: { event: true },
      })

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      await db.delete(eventDocuments).where(eq(eventDocuments.id, input.documentId))

      return { success: true }
    }),
})
```

**Update `trpc/routers/_app.ts`:**

```typescript
import { eventDocumentsRouter } from "./event-documents"

export const appRouter = createTRPCRouter({
  // ... existing routers
  eventDocuments: eventDocumentsRouter,
})
```

### Hooks

**Create `trpc/hooks/document-hooks.ts`:**

```typescript
import { trpc } from "@/trpc/client"
import { toast } from "sonner"
import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

export const useEventDocuments = (eventId: string, type?: string) => {
  return trpc.eventDocuments.getMany.useQuery(
    { eventId, type: type as any },
    { enabled: !!eventId }
  )
}

export const useCreateEventDocument = (options?: { onSuccess?: () => void }) => {
  const utils = trpc.useUtils()

  return trpc.eventDocuments.create.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully")
      utils.eventDocuments.getMany.invalidate()
      utils.emailTemplates.getVariables.invalidate()
      options?.onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
  })
}

export const useUpdateEventDocument = (options?: { onSuccess?: () => void }) => {
  const utils = trpc.useUtils()

  return trpc.eventDocuments.update.useMutation({
    onSuccess: () => {
      toast.success("Document updated")
      utils.eventDocuments.getMany.invalidate()
      utils.emailTemplates.getVariables.invalidate()
      options?.onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
  })
}

export const useDeleteEventDocument = (options?: { onSuccess?: () => void }) => {
  const utils = trpc.useUtils()

  return trpc.eventDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted")
      utils.eventDocuments.getMany.invalidate()
      utils.emailTemplates.getVariables.invalidate()
      options?.onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
  })
}
```

### Validation Schemas

**Add to `lib/schemas.ts`:**

```typescript
// Event Document Schemas
export const eventDocumentTypeValues = [
  "schedule",
  "map",
  "policy",
  "brochure",
  "invitation",
  "other",
] as const

export type EventDocumentType = (typeof eventDocumentTypeValues)[number]

export const createEventDocumentSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  fileName: z.string(),
  url: z.string().url(),
  mimeType: z.enum([
    "application/pdf",
    "image/gif",
    "image/jpeg",
    "image/png",
  ]),
  fileSize: z.number().max(10 * 1024 * 1024, "File exceeds 10MB limit"),
  type: z.enum(eventDocumentTypeValues),
  categoryIds: z.array(z.string().uuid()).nullable().optional(),
})

export type CreateEventDocumentInput = z.infer<typeof createEventDocumentSchema>

export const updateEventDocumentSchema = z.object({
  documentId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(eventDocumentTypeValues).optional(),
  categoryIds: z.array(z.string().uuid()).nullable().optional(),
})

export type UpdateEventDocumentInput = z.infer<typeof updateEventDocumentSchema>
```

---

## 14D: Email Template Integration

### Update getVariables Procedure

**Modify `trpc/routers/email-templates.ts`:**

Add documents group to the `getVariables` procedure:

```typescript
getVariables: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    categoryId: z.string().uuid().optional(), // Optional: filter by category
  }))
  .query(async ({ ctx, input }) => {
    // ... existing code for event/membership checks ...

    // Fetch documents for this event
    const documents = await db.query.eventDocuments.findMany({
      where: eq(eventDocuments.eventId, input.eventId),
      orderBy: [asc(eventDocuments.name)],
    })

    // Filter by category if specified
    const filteredDocs = input.categoryId
      ? documents.filter(doc =>
          !doc.categoryIds ||
          doc.categoryIds.length === 0 ||
          doc.categoryIds.includes(input.categoryId!)
        )
      : documents

    return {
      guest: [
        // ... existing guest variables
      ],
      event: [
        // ... existing event variables
      ],
      links: [
        // ... existing link variables
      ],
      category: [
        // ... existing category variables
      ],
      // NEW: Documents group
      documents: filteredDocs.map(doc => ({
        key: `{{document.${doc.id}}}`,
        description: `${doc.name} (${doc.type})`,
        url: doc.url,
        name: doc.name,
      })),
    }
  }),
```

### Update Email Rendering

**Modify `lib/queue/email-job.ts`:**

Add document variable replacement to `renderEmailTemplate`:

```typescript
export async function renderEmailTemplate(
  template: EmailTemplate,
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en"
): Promise<{ subject: string; html: string; text?: string }> {
  // ... existing variable replacement code ...

  // Fetch documents for this event that are visible to guest's category
  const documents = await db.query.eventDocuments.findMany({
    where: eq(eventDocuments.eventId, event.id),
  })

  const visibleDocs = documents.filter(doc =>
    !doc.categoryIds ||
    doc.categoryIds.length === 0 ||
    (guest.categoryId && doc.categoryIds.includes(guest.categoryId))
  )

  // Replace document variables
  for (const doc of visibleDocs) {
    const pattern = new RegExp(`\\{\\{document\\.${doc.id}\\}\\}`, 'g')

    // HTML: clickable link
    html = html.replace(pattern, `<a href="${doc.url}">${doc.name}</a>`)

    // Plain text: name with URL
    if (text) {
      text = text.replace(pattern, `${doc.name}: ${doc.url}`)
    }

    // Subject: just the name (links don't work in subjects)
    subject = subject.replace(pattern, doc.name)
  }

  // Handle missing documents gracefully (document was deleted)
  const missingDocPattern = /\{\{document\.[a-f0-9-]+\}\}/g
  html = html.replace(missingDocPattern, '[Document unavailable]')
  if (text) {
    text = text.replace(missingDocPattern, '[Document unavailable]')
  }
  subject = subject.replace(missingDocPattern, '')

  return { subject, html, text }
}
```

---

## 14E: Document Library UI

### Document Library Component

**Create `components/documents/document-library.tsx`:**

```typescript
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useEventDocuments } from "@/trpc/hooks/document-hooks"
import { useCategories } from "@/trpc/hooks/category-hooks"
import { DocumentRow } from "./document-row"
import { DocumentUploadDialog } from "./document-upload-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icons } from "@/components/global/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { eventDocumentTypeValues } from "@/lib/schemas"

interface DocumentLibraryProps {
  eventId: string
  workspaceSlug: string
}

export function DocumentLibrary({ eventId, workspaceSlug }: DocumentLibraryProps) {
  const t = useTranslations("documents")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const { data: documents, isLoading } = useEventDocuments(
    eventId,
    typeFilter === "all" ? undefined : typeFilter
  )
  const { data: categories } = useCategories(eventId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Icons.upload className="mr-2 h-4 w-4" />
            {t("upload")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        <div className="mb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {eventDocumentTypeValues.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !documents?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icons.fileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noDocuments")}</p>
            <p className="text-sm">{t("noDocumentsDescription")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsUploadOpen(true)}
            >
              {t("uploadFirst")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                categories={categories || []}
              />
            ))}
          </div>
        )}
      </CardContent>

      <DocumentUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        eventId={eventId}
        categories={categories || []}
      />
    </Card>
  )
}
```

### Document Upload Dialog

**Create `components/documents/document-upload-dialog.tsx`:**

Features:
- File dropzone with drag-and-drop
- Name input (defaults to filename without extension)
- Type dropdown
- Category multi-select with "All Categories" option
- Upload progress indicator

### Document Row

**Create `components/documents/document-row.tsx`:**

Features:
- Document name, type badge, file size, upload date
- Category visibility badges
- Actions dropdown: Rename, Edit Categories, Copy Link, Delete

### Upload Hook

**Create `hooks/use-document-upload.ts`:**

```typescript
import { useState, useCallback } from "react"
import { useCreateEventDocument } from "@/trpc/hooks/document-hooks"

export function useDocumentUpload(eventId: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const createDocument = useCreateEventDocument()

  const upload = useCallback(async (
    file: File,
    metadata: {
      name: string
      type: string
      categoryIds: string[] | null
    }
  ) => {
    setIsUploading(true)
    setProgress(0)

    try {
      // 1. Get pre-signed URL
      const response = await fetch("/api/document-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          filetype: file.type,
          filesize: file.size,
          eventId,
        }),
      })

      const { data } = await response.json()

      // 2. Upload to S3
      if (data.storageProvider === "s3") {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
          })
          xhr.addEventListener("load", resolve)
          xhr.addEventListener("error", reject)
          xhr.open("PUT", data.preSignedUrl)
          xhr.setRequestHeader("Content-Type", file.type)
          xhr.setRequestHeader("Cache-Control", "max-age=63072000")
          xhr.send(file)
        })
      } else {
        // Local upload
        const formData = new FormData()
        formData.append("file", file)
        formData.append("eventId", eventId)
        await fetch(data.uploadUrl, { method: "POST", body: formData })
      }

      // 3. Create document record
      await createDocument.mutateAsync({
        eventId,
        name: metadata.name,
        fileName: file.name,
        url: data.documentUrl,
        mimeType: file.type,
        fileSize: file.size,
        type: metadata.type as any,
        categoryIds: metadata.categoryIds,
      })

      return data.documentUrl
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }, [eventId, createDocument])

  return { upload, isUploading, progress }
}
```

### Add to Emails Tab

**Modify `components/email-templates/event-emails-tab.tsx`:**

Add `DocumentLibrary` component as a collapsible section:

```typescript
import { DocumentLibrary } from "@/components/documents/document-library"

// In the component:
<div className="space-y-6">
  {/* Existing template list */}

  {/* Document Library Section */}
  <DocumentLibrary eventId={eventId} workspaceSlug={workspaceSlug} />
</div>
```

---

## 14F: Branded Document URLs (Custom Domains)

When an event has a verified custom domain, document links in emails should use the branded URL instead of the main app URL. This ensures guests see branded links when hovering over document links in their email client.

### How It Works

**Email link format based on event configuration:**

| Event Has Custom Domain? | Link in Email (visible on hover) |
|-------------------------|----------------------------------|
| Yes (verified) | `https://afc2027.sa/d/abc123` |
| No | `https://main-app.sa/d/abc123` |

**Flow:**
```
1. Email rendered for guest → event has custom domain afc2027.sa
2. Document link inserted as: https://afc2027.sa/d/{documentId}
3. Guest hovers over link in email → sees branded URL ✓
4. Guest clicks → request goes to afc2027.sa/d/{documentId}
5. Middleware routes to document handler
6. Handler validates document belongs to this event → 302 redirect to S3
7. Guest downloads/views the PDF
```

### Document Proxy Route

**Create: `app/api/d/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db/config/database"
import { eventDocuments, events } from "@/server/db/schemas"
import { eq } from "drizzle-orm"
import { getEventByCustomDomain, isMainAppDomain } from "@/lib/domain"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const host = request.headers.get("host") || ""

  // Look up document with event details
  const document = await db.query.eventDocuments.findFirst({
    where: eq(eventDocuments.id, id),
    with: {
      event: {
        columns: {
          id: true,
          customDomain: true,
          customDomainVerified: true,
        },
      },
    },
  })

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // If accessed via custom domain, verify it matches this document's event
  if (!isMainAppDomain(host)) {
    const domainData = await getEventByCustomDomain(host)

    if (!domainData || domainData.eventId !== document.eventId) {
      // Document doesn't belong to this custom domain's event
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
  }

  // Redirect to actual S3 URL (fast, no bandwidth through server)
  return NextResponse.redirect(document.url, 302)
}
```

### Update Middleware for Custom Domains

**Modify: `middleware.ts`**

Add `/d/` route handling in the `handleCustomDomain` function:

```typescript
async function handleCustomDomain(
  request: NextRequest,
  host: string,
  pathname: string
): Promise<NextResponse> {
  // ... existing RSVP handling ...

  // Handle document routes: /d/{documentId}
  const docMatch = pathname.match(/^\/d\/([a-zA-Z0-9-]+)\/?$/)

  if (docMatch) {
    // Pass through to API route - it handles domain validation
    const response = NextResponse.next()
    response.headers.set("x-custom-domain", host)
    return response
  }

  // ... rest of existing code ...
}
```

### Update Email Rendering for Branded URLs

**Modify: `lib/queue/email-job.ts`**

Update document link generation to use the event's custom domain when available:

```typescript
export async function renderEmailTemplate(
  template: EmailTemplate,
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en"
): Promise<{ subject: string; html: string; text?: string }> {
  // ... existing variable replacement code ...

  // Determine base URL for document links (use custom domain if available)
  const documentBaseUrl = event.customDomain && event.customDomainVerified
    ? `https://${event.customDomain}`
    : process.env.NEXT_PUBLIC_APP_URL

  // Fetch documents for this event
  const documents = await db.query.eventDocuments.findMany({
    where: eq(eventDocuments.eventId, event.id),
  })

  // Filter by guest's category visibility
  const visibleDocs = documents.filter(doc =>
    !doc.categoryIds ||
    doc.categoryIds.length === 0 ||
    (guest.categoryId && doc.categoryIds.includes(guest.categoryId))
  )

  // Replace document variables with branded links
  for (const doc of visibleDocs) {
    const pattern = new RegExp(`\\{\\{document\\.${doc.id}\\}\\}`, 'g')
    const brandedUrl = `${documentBaseUrl}/d/${doc.id}`

    // HTML: clickable link with branded URL
    html = html.replace(pattern, `<a href="${brandedUrl}">${doc.name}</a>`)

    // Plain text: name with branded URL
    if (text) {
      text = text.replace(pattern, `${doc.name}: ${brandedUrl}`)
    }

    // Subject: just the name (links don't work in subjects)
    subject = subject.replace(pattern, doc.name)
  }

  // Handle deleted documents gracefully
  const missingDocPattern = /\{\{document\.[a-f0-9-]+\}\}/g
  html = html.replace(missingDocPattern, '[Document unavailable]')
  if (text) {
    text = text.replace(missingDocPattern, '[Document unavailable]')
  }
  subject = subject.replace(missingDocPattern, '')

  return { subject, html, text }
}
```

### Files for Phase 14F

| Action | File |
|--------|------|
| Create | `app/api/d/[id]/route.ts` |
| Modify | `middleware.ts` (add `/d/` route handling) |
| Modify | `lib/queue/email-job.ts` (branded URL generation) |

---

## 14G: i18n Translations

### English

**Add to `messages/en.json`:**

```json
{
  "documents": {
    "title": "Document Library",
    "description": "Upload and manage event documents for email templates",
    "upload": "Upload Document",
    "noDocuments": "No documents uploaded yet",
    "noDocumentsDescription": "Upload PDFs and images to include in email templates",
    "uploadFirst": "Upload First Document",
    "name": "Document Name",
    "type": "Type",
    "categories": "Visible to Categories",
    "allCategories": "All Categories",
    "fileSize": "File Size",
    "uploadedAt": "Uploaded",
    "uploadedBy": "Uploaded by",
    "copyLink": "Copy Link",
    "linkCopied": "Link copied to clipboard",
    "delete": "Delete Document",
    "confirmDelete": "Are you sure you want to delete this document?",
    "deleteWarning": "Email templates using this document will show broken links.",
    "types": {
      "schedule": "Schedule",
      "map": "Map",
      "policy": "Policy",
      "brochure": "Brochure",
      "invitation": "Invitation",
      "other": "Other"
    },
    "upload": {
      "title": "Upload Document",
      "dragDrop": "Drag and drop or click to upload",
      "maxSize": "Max file size: 10MB",
      "allowedTypes": "PDF, PNG, JPEG, GIF",
      "uploading": "Uploading...",
      "success": "Document uploaded successfully"
    },
    "edit": {
      "title": "Edit Document",
      "save": "Save Changes"
    },
    "errors": {
      "fileTooLarge": "File size exceeds 10MB limit",
      "invalidType": "Only PDF and image files are allowed",
      "uploadFailed": "Failed to upload document"
    }
  }
}
```

### Arabic

**Add to `messages/ar.json`:**

```json
{
  "documents": {
    "title": "مكتبة المستندات",
    "description": "تحميل وإدارة مستندات الفعالية لقوالب البريد الإلكتروني",
    "upload": "تحميل مستند",
    "noDocuments": "لا توجد مستندات حتى الآن",
    "noDocumentsDescription": "قم بتحميل ملفات PDF وصور لتضمينها في قوالب البريد الإلكتروني",
    "uploadFirst": "تحميل المستند الأول",
    "name": "اسم المستند",
    "type": "النوع",
    "categories": "مرئي للفئات",
    "allCategories": "جميع الفئات",
    "fileSize": "حجم الملف",
    "uploadedAt": "تاريخ التحميل",
    "uploadedBy": "تم التحميل بواسطة",
    "copyLink": "نسخ الرابط",
    "linkCopied": "تم نسخ الرابط",
    "delete": "حذف المستند",
    "confirmDelete": "هل أنت متأكد من حذف هذا المستند؟",
    "deleteWarning": "قوالب البريد الإلكتروني التي تستخدم هذا المستند ستظهر روابط معطلة.",
    "types": {
      "schedule": "جدول",
      "map": "خريطة",
      "policy": "سياسة",
      "brochure": "كتيب",
      "invitation": "دعوة",
      "other": "أخرى"
    },
    "upload": {
      "title": "تحميل مستند",
      "dragDrop": "اسحب وأفلت أو انقر للتحميل",
      "maxSize": "الحد الأقصى لحجم الملف: 10 ميجابايت",
      "allowedTypes": "PDF، PNG، JPEG، GIF",
      "uploading": "جاري التحميل...",
      "success": "تم تحميل المستند بنجاح"
    },
    "edit": {
      "title": "تعديل المستند",
      "save": "حفظ التغييرات"
    },
    "errors": {
      "fileTooLarge": "حجم الملف يتجاوز الحد المسموح 10 ميجابايت",
      "invalidType": "يُسمح فقط بملفات PDF والصور",
      "uploadFailed": "فشل تحميل المستند"
    }
  }
}
```

---

## Verification Checklist

### 14A: Database Schema
- [ ] Schema created with all fields
- [ ] Indexes on eventId and type
- [ ] Relations to events and users
- [ ] Migration runs successfully

### 14B: Upload Infrastructure
- [ ] Document upload endpoint created
- [ ] 10MB limit enforced
- [ ] PDF + images validated
- [ ] S3 path uses eventId
- [ ] Local upload works in dev mode
- [ ] Rate limiting applied

### 14C: tRPC Router
- [ ] getMany returns documents with filters
- [ ] create stores metadata correctly
- [ ] update modifies name/type/categories
- [ ] delete removes record
- [ ] Workspace membership verified
- [ ] Hooks invalidate relevant queries

### 14D: Email Template Integration
- [ ] Documents appear in getVariables
- [ ] Category filtering works
- [ ] Variables render as HTML links
- [ ] Plain text shows URL
- [ ] Missing documents handled gracefully

### 14E: Document Library UI
- [ ] Document list displays correctly
- [ ] Filter by type works
- [ ] Upload dialog with progress
- [ ] Category selection works
- [ ] Actions menu: rename, edit, delete
- [ ] Copy link to clipboard
- [ ] Delete confirmation with warning
- [ ] Empty state displays

### 14F: Branded Document URLs
- [ ] `/d/{id}` route returns 302 redirect to S3
- [ ] Custom domain validation works (document must belong to event)
- [ ] Main app domain access works for all documents
- [ ] Middleware handles `/d/` routes on custom domains
- [ ] Email rendering uses custom domain URL when available
- [ ] Email rendering falls back to main app URL when no custom domain

### 14G: i18n
- [ ] English translations complete
- [ ] Arabic translations complete
- [ ] All UI strings use translations

---

## Critical Files Reference

| Pattern | File |
|---------|------|
| Image upload API | `app/api/image-upload/route.ts` |
| Local upload | `app/api/local-upload/route.ts` |
| Email templates router | `trpc/routers/email-templates.ts` |
| Email rendering | `lib/queue/email-job.ts` |
| Variable inserter | `components/email-templates/variable-inserter.tsx` |
| Emails tab | `components/email-templates/event-emails-tab.tsx` |
| Schema pattern | `server/db/schemas/email-template.ts` |

---

## File Structure Summary

**New files to create:**

```
server/db/schemas/
└── event-document.ts

app/api/
├── document-upload/route.ts
├── local-document-upload/route.ts
└── d/[id]/route.ts              # Branded URL proxy (Phase 14F)

trpc/
├── routers/event-documents.ts
└── hooks/document-hooks.ts

components/documents/
├── document-library.tsx
├── document-upload-dialog.tsx
├── document-row.tsx
└── index.ts

hooks/
└── use-document-upload.ts
```

**Files to modify:**

```
server/db/schemas/index.ts       # Export new schema
trpc/routers/_app.ts             # Register router
trpc/routers/email-templates.ts  # Add documents to getVariables
lib/queue/email-job.ts           # Document variable rendering + branded URLs
lib/schemas.ts                   # Validation schemas
middleware.ts                    # Handle /d/ routes on custom domains (Phase 14F)
components/email-templates/event-emails-tab.tsx  # Add DocumentLibrary
messages/en.json                 # English translations
messages/ar.json                 # Arabic translations
```

---

## Dependencies

No new npm packages required. Uses existing:
- AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Drizzle ORM patterns
- Shadcn components
- react-hook-form + zod

---

## Related Documents

- [06-email-template-builder.md](./06-email-template-builder.md) - Email template system (variable insertion pattern)
- [07-bulk-email-sending.md](./07-bulk-email-sending.md) - Email rendering and delivery
- [09-branding-system.md](./09-branding-system.md) - S3 upload pattern for branding assets
- [10-custom-domains.md](./10-custom-domains.md) - Custom domain infrastructure (required for Phase 14F branded URLs)

---

## Implementation Notes

**Phase 14F Dependency**: The branded document URLs feature (Phase 14F) depends on the custom domains infrastructure from Stage 10. If custom domains are not yet implemented:
- Phases 14A-14E can be implemented independently
- Phase 14F should be implemented after Stage 10 is complete
- Document links will use the main app domain until custom domains are available
