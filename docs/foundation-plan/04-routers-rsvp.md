# Stage 4: tRPC Routers & Public RSVP

> **Parent**: [00-overview.md](./00-overview.md) | **Estimate**: 4-5 hours | **Status**: ✅ COMPLETED (2024-11-29)

## Objective

Create the tRPC data access layer for the Events domain and build public guest-facing RSVP pages.

---

## Implementation Summary

### Adaptations from Original Plan

The implementation was adapted to match the existing codebase patterns:

1. **Terminology**: Used `workspace` instead of `organization` to match existing codebase
2. **Permission signature**: Used `hasPermission({ userId, workspaceId, permissionName })` format
3. **Extended scope**: Added `emailTemplates` and `emailLogs` routers beyond original plan
4. **Enhanced features**: Added bulk operations, token regeneration, and more comprehensive hooks

### Files Created

**tRPC Routers (`trpc/routers/`):**
- ✅ `events.ts` - Events CRUD with getBySlug
- ✅ `guest-categories.ts` - Category management with reorder
- ✅ `guests.ts` - Guests with bulk ops, stats, token regeneration
- ✅ `email-templates.ts` - Template CRUD with duplication
- ✅ `email-logs.ts` - Email log queries and statistics

**tRPC Hooks (`trpc/hooks/`):**
- ✅ `events-hooks.ts`
- ✅ `guests-hooks.ts`
- ✅ `guest-categories-hooks.ts`
- ✅ `email-hooks.ts`

**Public RSVP:**
- ✅ `app/api/rsvp/[token]/route.ts` - Public API (GET/POST)
- ✅ `app/[locale]/rsvp/[token]/page.tsx` - RSVP page
- ✅ `app/[locale]/rsvp/expired/page.tsx` - Expired token page
- ✅ `components/rsvp/rsvp-form.tsx` - Client-side form

**UI Components:**
- ✅ `components/ui/checkbox.tsx` - Added missing Shadcn component

**Modified:**
- ✅ `trpc/routers/_app.ts` - Registered all new routers

### Build Status

```bash
✅ pnpm run build - PASSES
✅ TypeScript type checking - PASSES
✅ All routes generated successfully
```

---

## 4.1 New tRPC Routers

### Events Router

Create `trpc/routers/events.ts`:

```typescript
import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { events, organizations, organizationMembers } from "@/server/db/schemas"
import { hasPermission } from "@/server/queries/permissions"
import { PERMISSIONS } from "@/lib/constants"

export const eventsRouter = createTRPCRouter({
  // Get all events for an organization
  getMany: protectedProcedure
    .input(z.object({ organizationSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.organizationSlug),
      })

      if (!organization) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      // Check membership
      const isMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organization.id),
          eq(organizationMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      return db.query.events.findMany({
        where: eq(events.organizationId, organization.id),
        orderBy: [desc(events.createdAt)],
        with: {
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })
    }),

  // Get single event
  getOne: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
        with: {
          organization: true,
          guestCategories: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      // Check membership
      const isMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, event.organizationId),
          eq(organizationMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      return event
    }),

  // Create event
  create: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string(),
        name: z.string().min(1),
        slug: z.string().min(3),
        description: z.string().optional(),
        eventType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.organizationSlug),
      })

      if (!organization) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canCreate = await hasPermission(
        ctx.user.id,
        organization.id,
        PERMISSIONS.CREATE_EVENT
      )

      if (!canCreate) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const [event] = await db
        .insert(events)
        .values({
          organizationId: organization.id,
          name: input.name,
          slug: input.slug,
          description: input.description,
          eventType: input.eventType,
          startDate: input.startDate,
          endDate: input.endDate,
          createdBy: ctx.user.id,
        })
        .returning()

      return event
    }),

  // Update event
  update: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum([
          "draft",
          "planning",
          "invitations_sent",
          "rsvp_open",
          "rsvp_closed",
          "in_progress",
          "completed",
          "cancelled",
        ]).optional(),
        branding: z.object({
          logo: z.string().optional(),
          primaryColor: z.string().optional(),
          secondaryColor: z.string().optional(),
        }).optional(),
        rsvpDeadline: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canManage = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.MANAGE_EVENT
      )

      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const { eventId, ...updateData } = input

      const [updated] = await db
        .update(events)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning()

      return updated
    }),

  // Delete event
  delete: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canDelete = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.DELETE_EVENT
      )

      if (!canDelete) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      await db.delete(events).where(eq(events.id, input.eventId))

      return { success: true }
    }),
})
```

### Guests Router

Create `trpc/routers/guests.ts`:

```typescript
import { z } from "zod"
import { eq, and, desc, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import crypto from "crypto"

import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { guests, events, guestCategories, organizationMembers } from "@/server/db/schemas"
import { hasPermission } from "@/server/queries/permissions"
import { PERMISSIONS } from "@/lib/constants"

export const guestsRouter = createTRPCRouter({
  // Get guests for an event
  getMany: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        status: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      // Check permission
      const canView = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.VIEW_GUESTS
      )

      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      // Build query conditions
      const conditions = [eq(guests.eventId, input.eventId)]

      if (input.status) {
        conditions.push(eq(guests.status, input.status))
      }

      if (input.categoryId) {
        conditions.push(eq(guests.categoryId, input.categoryId))
      }

      const guestList = await db.query.guests.findMany({
        where: and(...conditions),
        with: {
          category: {
            columns: { id: true, name: true, code: true, color: true },
          },
        },
        orderBy: [desc(guests.createdAt)],
        limit: input.limit,
        offset: input.offset,
      })

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(guests)
        .where(and(...conditions))

      return {
        guests: guestList,
        total: count,
        hasMore: input.offset + guestList.length < count,
      }
    }),

  // Get single guest
  getOne: protectedProcedure
    .input(z.object({ guestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: {
          category: true,
          event: true,
          rsvpResponses: {
            orderBy: [desc(rsvpResponses.submittedAt)],
            limit: 1,
          },
        },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canView = await hasPermission(
        ctx.user.id,
        guest.event.organizationId,
        PERMISSIONS.VIEW_GUESTS
      )

      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      return guest
    }),

  // Create single guest
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        categoryId: z.string().uuid(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        position: z.string().optional(),
        entity: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canManage = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.MANAGE_GUESTS
      )

      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      // Generate unique RSVP token
      const rsvpToken = crypto.randomUUID()

      const [guest] = await db
        .insert(guests)
        .values({
          ...input,
          rsvpToken,
          rsvpTokenExpiresAt: event.rsvpDeadline,
        })
        .returning()

      return guest
    }),

  // Update guest
  update: protectedProcedure
    .input(
      z.object({
        guestId: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        status: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
        with: { event: true },
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canManage = await hasPermission(
        ctx.user.id,
        guest.event.organizationId,
        PERMISSIONS.MANAGE_GUESTS
      )

      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const { guestId, ...updateData } = input

      const [updated] = await db
        .update(guests)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(guests.id, guestId))
        .returning()

      return updated
    }),

  // Get guest statistics for an event
  getStats: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canView = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.VIEW_GUESTS
      )

      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const stats = await db
        .select({
          status: guests.status,
          count: sql<number>`count(*)`,
        })
        .from(guests)
        .where(eq(guests.eventId, input.eventId))
        .groupBy(guests.status)

      const categoryStats = await db
        .select({
          categoryId: guests.categoryId,
          categoryName: guestCategories.name,
          count: sql<number>`count(*)`,
        })
        .from(guests)
        .innerJoin(guestCategories, eq(guests.categoryId, guestCategories.id))
        .where(eq(guests.eventId, input.eventId))
        .groupBy(guests.categoryId, guestCategories.name)

      return {
        byStatus: stats,
        byCategory: categoryStats,
        total: stats.reduce((sum, s) => sum + s.count, 0),
      }
    }),
})
```

### Guest Categories Router

Create `trpc/routers/guest-categories.ts`:

```typescript
import { z } from "zod"
import { eq, and, asc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { guestCategories, events } from "@/server/db/schemas"
import { hasPermission } from "@/server/queries/permissions"
import { PERMISSIONS } from "@/lib/constants"

export const guestCategoriesRouter = createTRPCRouter({
  // Get categories for an event
  getMany: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      return db.query.guestCategories.findMany({
        where: eq(guestCategories.eventId, input.eventId),
        orderBy: [asc(guestCategories.sortOrder)],
      })
    }),

  // Create category
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1),
        code: z.string().min(1).max(10),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        serviceAllocations: z.object({
          hotelStars: z.number().optional(),
          roomType: z.string().optional(),
          transportType: z.string().optional(),
          flightClass: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canManage = await hasPermission(
        ctx.user.id,
        event.organizationId,
        PERMISSIONS.MANAGE_EVENT
      )

      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const [category] = await db
        .insert(guestCategories)
        .values(input)
        .returning()

      return category
    }),

  // Update category
  update: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().uuid(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).max(10).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        serviceAllocations: z.object({
          hotelStars: z.number().optional(),
          roomType: z.string().optional(),
          transportType: z.string().optional(),
          flightClass: z.string().optional(),
        }).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const category = await db.query.guestCategories.findFirst({
        where: eq(guestCategories.id, input.categoryId),
        with: { event: true },
      })

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const canManage = await hasPermission(
        ctx.user.id,
        category.event.organizationId,
        PERMISSIONS.MANAGE_EVENT
      )

      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }

      const { categoryId, ...updateData } = input

      const [updated] = await db
        .update(guestCategories)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(guestCategories.id, categoryId))
        .returning()

      return updated
    }),
})
```

### Update App Router

Update `trpc/routers/_app.ts`:

```typescript
import { createTRPCRouter } from "@/trpc/init"
import { eventsRouter } from "@/trpc/routers/events"
import { guestsRouter } from "@/trpc/routers/guests"
import { guestCategoriesRouter } from "@/trpc/routers/guest-categories"
import { invitationsRouter } from "@/trpc/routers/invitations"
import { membersRouter } from "@/trpc/routers/members"
import { organizationsRouter } from "@/trpc/routers/organizations"
import { subscriptionsRouter } from "@/trpc/routers/subscriptions"
import { usersRouter } from "@/trpc/routers/users"
import { usersSettingsRouter } from "@/trpc/routers/users-settings"

export const appRouter = createTRPCRouter({
  users: usersRouter,
  organizations: organizationsRouter,
  members: membersRouter,
  invitations: invitationsRouter,
  usersSettings: usersSettingsRouter,
  subscriptions: subscriptionsRouter,
  // Events domain
  events: eventsRouter,
  guests: guestsRouter,
  guestCategories: guestCategoriesRouter,
})

export type AppRouter = typeof appRouter
```

---

## 4.2 tRPC Hooks

Create corresponding hooks files:

### `trpc/hooks/events-hooks.ts`

```typescript
import { trpc } from "@/trpc/client"

export const useEvents = (organizationSlug: string) => {
  return trpc.events.getMany.useQuery({ organizationSlug })
}

export const useEvent = (eventId: string) => {
  return trpc.events.getOne.useQuery({ eventId })
}

export const useCreateEvent = () => {
  const utils = trpc.useUtils()
  return trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.getMany.invalidate()
    },
  })
}

export const useUpdateEvent = () => {
  const utils = trpc.useUtils()
  return trpc.events.update.useMutation({
    onSuccess: (data) => {
      utils.events.getOne.invalidate({ eventId: data.id })
      utils.events.getMany.invalidate()
    },
  })
}

export const useDeleteEvent = () => {
  const utils = trpc.useUtils()
  return trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.getMany.invalidate()
    },
  })
}
```

### `trpc/hooks/guests-hooks.ts`

```typescript
import { trpc } from "@/trpc/client"

export const useGuests = (params: {
  eventId: string
  status?: string
  categoryId?: string
  limit?: number
  offset?: number
}) => {
  return trpc.guests.getMany.useQuery(params)
}

export const useGuest = (guestId: string) => {
  return trpc.guests.getOne.useQuery({ guestId })
}

export const useGuestStats = (eventId: string) => {
  return trpc.guests.getStats.useQuery({ eventId })
}

export const useCreateGuest = () => {
  const utils = trpc.useUtils()
  return trpc.guests.create.useMutation({
    onSuccess: (data) => {
      utils.guests.getMany.invalidate({ eventId: data.eventId })
      utils.guests.getStats.invalidate({ eventId: data.eventId })
    },
  })
}

export const useUpdateGuest = () => {
  const utils = trpc.useUtils()
  return trpc.guests.update.useMutation({
    onSuccess: (data) => {
      utils.guests.getOne.invalidate({ guestId: data.id })
      utils.guests.getMany.invalidate({ eventId: data.eventId })
    },
  })
}
```

---

## 4.3 Public RSVP API Routes

### Get Guest Info (Public)

Create `app/api/rsvp/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { eq, and, gt } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests, events, guestCategories, rsvpResponses } from "@/server/db/schemas"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  // Find guest by RSVP token
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      // Token not expired
      gt(guests.rsvpTokenExpiresAt, new Date())
    ),
    with: {
      event: {
        columns: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          venue: true,
          rsvpDeadline: true,
          rsvpFormConfig: true,
          branding: true,
        },
        with: {
          organization: {
            columns: {
              name: true,
              logo: true,
              primaryColor: true,
            },
          },
        },
      },
      category: {
        columns: {
          id: true,
          name: true,
          rsvpPageConfig: true,
          serviceAllocations: true,
        },
      },
    },
  })

  if (!guest) {
    return NextResponse.json(
      { error: "Invalid or expired RSVP link" },
      { status: 404 }
    )
  }

  // Track page visit
  await db
    .update(guests)
    .set({
      lastRsvpPageVisitAt: new Date(),
      status: guest.status === "pending" ? "viewed" : guest.status,
    })
    .where(eq(guests.id, guest.id))

  // Return guest info for RSVP form (exclude sensitive data)
  return NextResponse.json({
    guest: {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      title: guest.title,
      email: guest.email,
      status: guest.status,
      hasCompanion: guest.hasCompanion,
    },
    event: guest.event,
    category: guest.category,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const body = await request.json()

  // Find guest
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      gt(guests.rsvpTokenExpiresAt, new Date())
    ),
    with: {
      event: true,
    },
  })

  if (!guest) {
    return NextResponse.json(
      { error: "Invalid or expired RSVP link" },
      { status: 404 }
    )
  }

  // Check RSVP deadline
  if (guest.event.rsvpDeadline && guest.event.rsvpDeadline < new Date()) {
    return NextResponse.json(
      { error: "RSVP deadline has passed" },
      { status: 400 }
    )
  }

  const { responseStatus, formResponses, companionInfo } = body

  // Validate response status
  if (!["confirmed", "declined", "maybe"].includes(responseStatus)) {
    return NextResponse.json(
      { error: "Invalid response status" },
      { status: 400 }
    )
  }

  // Check if already responded
  const existingResponse = await db.query.rsvpResponses.findFirst({
    where: eq(rsvpResponses.guestId, guest.id),
  })

  // Create RSVP response
  const [response] = await db
    .insert(rsvpResponses)
    .values({
      guestId: guest.id,
      eventId: guest.eventId,
      responseStatus,
      formResponses,
      companionInfo,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      isAmendment: !!existingResponse,
      previousResponseId: existingResponse?.id,
    })
    .returning()

  // Update guest status
  await db
    .update(guests)
    .set({
      status: responseStatus,
      rsvpRespondedAt: new Date(),
      hasCompanion: companionInfo?.bringing || false,
      companionDetails: companionInfo?.details?.[0] || null,
      updatedAt: new Date(),
    })
    .where(eq(guests.id, guest.id))

  return NextResponse.json({
    success: true,
    responseId: response.id,
    status: responseStatus,
  })
}
```

---

## 4.4 Public RSVP Pages

### RSVP Page

Create `app/[locale]/rsvp/[token]/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import { eq, and, gt } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { RsvpForm } from "@/components/rsvp/rsvp-form"

interface RsvpPageProps {
  params: {
    token: string
    locale: string
  }
}

export default async function RsvpPage({ params }: RsvpPageProps) {
  const { token, locale } = params

  // Verify token exists (actual data fetched client-side)
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      gt(guests.rsvpTokenExpiresAt, new Date())
    ),
    columns: { id: true },
  })

  if (!guest) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <RsvpForm token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: RsvpPageProps) {
  return {
    title: "RSVP - Confirm Your Attendance",
    robots: "noindex, nofollow",
  }
}
```

### RSVP Form Component

Create `components/rsvp/rsvp-form.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const rsvpSchema = z.object({
  responseStatus: z.enum(["confirmed", "declined", "maybe"]),
  formResponses: z.record(z.unknown()).optional(),
  companionInfo: z.object({
    bringing: z.boolean(),
    count: z.number().optional(),
    names: z.array(z.string()).optional(),
  }).optional(),
})

type RsvpFormData = z.infer<typeof rsvpSchema>

interface RsvpFormProps {
  token: string
  locale: string
}

export function RsvpForm({ token, locale }: RsvpFormProps) {
  const t = useTranslations("rsvp")
  const [guestData, setGuestData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RsvpFormData>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      responseStatus: "confirmed",
    },
  })

  useEffect(() => {
    async function fetchGuest() {
      try {
        const res = await fetch(`/api/rsvp/${token}`)
        if (!res.ok) {
          throw new Error("Invalid or expired link")
        }
        const data = await res.json()
        setGuestData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    fetchGuest()
  }, [token])

  async function onSubmit(data: RsvpFormData) {
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t("loading") || "Loading..."}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold">{t("submitted")}</h2>
            <p className="mt-2 text-muted-foreground">
              {form.getValues("responseStatus") === "confirmed"
                ? "We look forward to seeing you!"
                : "Thank you for letting us know."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { guest, event, category } = guestData

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundColor: event.branding?.secondaryColor || "#f5f5f5",
      }}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {event.organization?.logo && (
            <img
              src={event.organization.logo}
              alt={event.organization.name}
              className="mx-auto mb-4 h-16 object-contain"
            />
          )}
          <CardTitle>{event.name}</CardTitle>
          <p className="text-muted-foreground">
            {category.rsvpPageConfig?.welcomeMessage?.[locale] ||
              `Dear ${guest.title || ""} ${guest.firstName} ${guest.lastName}`}
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="responseStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="confirmed" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t("confirm")}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="declined" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t("decline")}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="maybe" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t("maybe")}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                {t("submit") || "Submit Response"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Expired Token Page

Create `app/[locale]/rsvp/expired/page.tsx`:

```typescript
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"

export default function ExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <h2 className="text-2xl font-bold">Link Expired</h2>
          <p className="mt-2 text-muted-foreground">
            This RSVP link has expired. Please contact the event organizer for
            assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Verification

After completing Stage 4:

```bash
npm run build
npm run dev

# Test endpoints:
# 1. Create an event via tRPC
# 2. Create a guest category
# 3. Create a guest (generates RSVP token)
# 4. Visit /rsvp/{token} - should load public form
# 5. Submit RSVP - should update guest status
```

### Checklist

- [ ] Events router working (CRUD operations)
- [ ] Guests router working (CRUD + stats)
- [ ] Guest categories router working
- [ ] Public RSVP page loads without authentication
- [ ] RSVP form displays guest name and event info
- [ ] RSVP submission updates guest status
- [ ] Arabic/English translations work on RSVP page
- [ ] RTL layout correct for Arabic RSVP page

---

## Foundation Complete

After all 4 stages, you have:

1. **KSA-compliant infrastructure** - Self-hostable PostgreSQL, Redis, SMTP
2. **Clean codebase** - Demo code removed, Organization terminology
3. **Events domain schema** - Full data model for Phase 1 + future phases
4. **i18n foundation** - Arabic/English with RTL support
5. **Data access layer** - tRPC routers for events, guests, categories
6. **Public RSVP** - Guest-facing pages without authentication

### Next Steps (Post-Foundation)

1. Build admin dashboard UI for managing events/guests
2. Implement guest import from Excel/CSV
3. Create email template builder
4. Add bulk email sending functionality
5. Build reporting/analytics dashboards
