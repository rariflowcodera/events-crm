import { db } from "@/server/db/config/database"
import {
  events,
  guestListViews,
  VIEW_COLORS,
  type GuestListViewConfig,
  type ViewColor,
} from "@/server/db/schemas"
import { DEFAULT_VIEW_CONFIG } from "@/lib/guest-columns"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq } from "drizzle-orm"
import { z } from "zod"

// ============================================================================
// Zod Schemas
// ============================================================================

const columnConfigSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
  width: z.number().optional(),
})

const filterConfigSchema = z.object({
  status: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const sortConfigSchema = z.object({
  column: z.string(),
  direction: z.enum(["asc", "desc"]),
})

const viewConfigSchema = z.object({
  columns: z.array(columnConfigSchema),
  filters: filterConfigSchema,
  sorting: z.array(sortConfigSchema),
})

const viewColorSchema = z.enum(
  Object.keys(VIEW_COLORS) as [ViewColor, ...ViewColor[]]
)

const roleSchema = z.enum(["owner", "admin", "manager", "event_staff", "member"])

// ============================================================================
// Router
// ============================================================================

export const guestListViewsRouter = createTRPCRouter({
  // Get all views for an event
  getMany: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      return db.query.guestListViews.findMany({
        where: eq(guestListViews.eventId, input.eventId),
        orderBy: [asc(guestListViews.pinOrder), asc(guestListViews.name)],
      })
    }),

  // Get pinned views for sidebar (filtered by user's role)
  getPinned: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Get all pinned views - role filtering happens on client
      // (because we need the user's role from workspaceMember)
      return db.query.guestListViews.findMany({
        where: and(
          eq(guestListViews.eventId, input.eventId),
          eq(guestListViews.isPinned, true)
        ),
        orderBy: [asc(guestListViews.pinOrder)],
      })
    }),

  // Get default view for an event
  getDefaultView: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      return db.query.guestListViews.findFirst({
        where: and(
          eq(guestListViews.eventId, input.eventId),
          eq(guestListViews.isDefault, true)
        ),
      })
    }),

  // Get or create "All Guests" system view
  getOrCreateAllGuestsView: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view guests",
        })
      }

      // Check if "All Guests" system view already exists
      const existingView = await db.query.guestListViews.findFirst({
        where: and(
          eq(guestListViews.eventId, input.eventId),
          eq(guestListViews.isSystem, true),
          eq(guestListViews.name, "All Guests")
        ),
      })

      if (existingView) {
        return existingView
      }

      // Create the "All Guests" system view
      const [view] = await db
        .insert(guestListViews)
        .values({
          eventId: input.eventId,
          name: "All Guests",
          description: "Default view showing all guests",
          config: DEFAULT_VIEW_CONFIG,
          visibleToRoles: ["owner", "admin", "manager", "member"],
          color: "gray",
          isPinned: true,
          pinOrder: 0,
          isSystem: true,
          isDefault: true,
          createdBy: ctx.user.id,
        })
        .returning()

      return view
    }),

  // Set a view as the default for an event
  setDefault: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const view = await db.query.guestListViews.findFirst({
        where: eq(guestListViews.id, input.viewId),
        with: { event: true },
      })

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: view.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage views",
        })
      }

      // Unset any existing default for this event
      await db
        .update(guestListViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(guestListViews.eventId, view.eventId),
            eq(guestListViews.isDefault, true)
          )
        )

      // Set this view as default
      const [updated] = await db
        .update(guestListViews)
        .set({
          isDefault: true,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(guestListViews.id, input.viewId))
        .returning()

      return updated
    }),

  // Get single view by ID
  getOne: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const view = await db.query.guestListViews.findFirst({
        where: eq(guestListViews.id, input.viewId),
        with: { event: true },
      })

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" })
      }

      const canView = await hasPermission({
        userId: ctx.user.id,
        workspaceId: view.event.workspaceId,
        permissionName: PERMISSIONS.VIEW_GUESTS,
      })

      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this",
        })
      }

      return view
    }),

  // Create a new view
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        config: viewConfigSchema,
        visibleToRoles: z.array(roleSchema).min(1),
        color: viewColorSchema.default("gray"),
        isPinned: z.boolean().default(false),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage views",
        })
      }

      // Get next pin order if pinned
      let pinOrder: number | null = null
      if (input.isPinned) {
        const maxPinned = await db.query.guestListViews.findFirst({
          where: and(
            eq(guestListViews.eventId, input.eventId),
            eq(guestListViews.isPinned, true)
          ),
          orderBy: [desc(guestListViews.pinOrder)],
        })
        pinOrder = (maxPinned?.pinOrder ?? 0) + 1
      }

      // If this view is being set as default, unset any existing default
      if (input.isDefault) {
        await db
          .update(guestListViews)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(guestListViews.eventId, input.eventId),
              eq(guestListViews.isDefault, true)
            )
          )
      }

      const [view] = await db
        .insert(guestListViews)
        .values({
          eventId: input.eventId,
          name: input.name,
          description: input.description,
          config: input.config as GuestListViewConfig,
          visibleToRoles: input.visibleToRoles,
          color: input.color,
          isPinned: input.isPinned,
          pinOrder,
          isDefault: input.isDefault,
          createdBy: ctx.user.id,
        })
        .returning()

      return view
    }),

  // Update a view
  update: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        config: viewConfigSchema.optional(),
        visibleToRoles: z.array(roleSchema).min(1).optional(),
        color: viewColorSchema.optional(),
        isPinned: z.boolean().optional(),
        pinOrder: z.number().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const view = await db.query.guestListViews.findFirst({
        where: eq(guestListViews.id, input.viewId),
        with: { event: true },
      })

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: view.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage views",
        })
      }

      const { viewId, ...updateData } = input

      // Handle pin order when pinning
      let pinOrder: number | null | undefined = updateData.pinOrder
      if (updateData.isPinned === true && !view.isPinned) {
        const maxPinned = await db.query.guestListViews.findFirst({
          where: and(
            eq(guestListViews.eventId, view.eventId),
            eq(guestListViews.isPinned, true)
          ),
          orderBy: [desc(guestListViews.pinOrder)],
        })
        pinOrder = (maxPinned?.pinOrder ?? 0) + 1
      } else if (updateData.isPinned === false) {
        pinOrder = null
      }

      // If this view is being set as default, unset any existing default
      if (updateData.isDefault === true && !view.isDefault) {
        await db
          .update(guestListViews)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(guestListViews.eventId, view.eventId),
              eq(guestListViews.isDefault, true)
            )
          )
      }

      const [updated] = await db
        .update(guestListViews)
        .set({
          ...updateData,
          config: updateData.config as GuestListViewConfig | undefined,
          pinOrder,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(guestListViews.id, viewId))
        .returning()

      return updated
    }),

  // Delete a view
  delete: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const view = await db.query.guestListViews.findFirst({
        where: eq(guestListViews.id, input.viewId),
        with: { event: true },
      })

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" })
      }

      if (view.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system views",
        })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: view.event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete views",
        })
      }

      // If deleting the default view, cascade default to "All Guests" system view
      if (view.isDefault) {
        const allGuestsView = await db.query.guestListViews.findFirst({
          where: and(
            eq(guestListViews.eventId, view.eventId),
            eq(guestListViews.isSystem, true),
            eq(guestListViews.name, "All Guests")
          ),
        })

        if (allGuestsView) {
          await db
            .update(guestListViews)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(guestListViews.id, allGuestsView.id))
        }
      }

      await db
        .delete(guestListViews)
        .where(eq(guestListViews.id, input.viewId))

      return { success: true }
    }),

  // Reorder pinned views
  reorderPinned: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        viewIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      const canManage = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.MANAGE_EVENT,
      })

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reorder views",
        })
      }

      // Update pin orders
      await Promise.all(
        input.viewIds.map((viewId, index) =>
          db
            .update(guestListViews)
            .set({ pinOrder: index + 1, updatedAt: new Date() })
            .where(eq(guestListViews.id, viewId))
        )
      )

      return { success: true }
    }),
})
