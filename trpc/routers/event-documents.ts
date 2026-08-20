import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import {
  eventDocuments,
  events,
  workspaceMembers,
  eventDocumentTypeValues,
} from "@/server/db/schemas"
import { eq, and, desc } from "drizzle-orm"

export const eventDocumentsRouter = createTRPCRouter({
  // List documents for an event
  getMany: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        type: z.enum(eventDocumentTypeValues).optional(),
      })
    )
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
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      const conditions = [eq(eventDocuments.eventId, input.eventId)]
      if (input.type) {
        conditions.push(eq(eventDocuments.type, input.type))
      }

      return db.query.eventDocuments.findMany({
        where: and(...conditions),
        with: {
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
        orderBy: [desc(eventDocuments.createdAt)],
      })
    }),

  // Get single document
  getOne: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await db.query.eventDocuments.findFirst({
        where: eq(eventDocuments.id, input.documentId),
        with: {
          event: true,
          creator: {
            columns: { id: true, name: true, image: true },
          },
        },
      })

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      return document
    }),

  // Create document record (after S3 upload)
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        name: z.string().min(1).max(100),
        fileName: z.string(),
        url: z.string().url(),
        mimeType: z.string(),
        fileSize: z.number().max(10 * 1024 * 1024),
        type: z.enum(eventDocumentTypeValues),
        categoryIds: z.array(z.string().uuid()).nullable().optional(),
      })
    )
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
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
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
    .input(
      z.object({
        documentId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        type: z.enum(eventDocumentTypeValues).optional(),
        categoryIds: z.array(z.string().uuid()).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await db.query.eventDocuments.findFirst({
        where: eq(eventDocuments.id, input.documentId),
        with: { event: true },
      })

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      const { documentId, ...updateData } = input

      const [updated] = await db
        .update(eventDocuments)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(eventDocuments.id, documentId))
        .returning()

      return updated
    }),

  // Replace the underlying file of an existing document
  replaceFile: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        fileName: z.string(),
        url: z.string().url(),
        mimeType: z.string(),
        fileSize: z.number().max(10 * 1024 * 1024),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await db.query.eventDocuments.findFirst({
        where: eq(eventDocuments.id, input.documentId),
        with: { event: true },
      })

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      const [updated] = await db
        .update(eventDocuments)
        .set({
          fileName: input.fileName,
          url: input.url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
      }

      const isMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, document.event.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        ),
      })

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
      }

      await db.delete(eventDocuments).where(eq(eventDocuments.id, input.documentId))

      return { success: true }
    }),
})
