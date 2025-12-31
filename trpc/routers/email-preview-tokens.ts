import { db } from "@/server/db/config/database"
import {
  events,
  emailPreviewTokens,
  emailTemplates,
  guests,
  workspaceMembers,
} from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const emailPreviewTokensRouter = createTRPCRouter({
  // Generate a token for a guest + template pair
  generateToken: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        guestId: z.string().uuid(),
        templateId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the event
      const event = await db.query.events.findFirst({
        where: eq(events.id, input.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      // Check permission
      const canSendEmails = await hasPermission({
        userId: ctx.user.id,
        workspaceId: event.workspaceId,
        permissionName: PERMISSIONS.SEND_EMAILS,
      })

      if (!canSendEmails) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate email preview links",
        })
      }

      // Get the guest and verify they belong to this event
      const guest = await db.query.guests.findFirst({
        where: and(eq(guests.id, input.guestId), eq(guests.eventId, input.eventId)),
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found in this event" })
      }

      // Get the template and verify it belongs to this event
      const template = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.id, input.templateId),
          eq(emailTemplates.eventId, input.eventId)
        ),
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email template not found" })
      }

      // Check if token already exists for this guest + template combo
      const existingToken = await db.query.emailPreviewTokens.findFirst({
        where: and(
          eq(emailPreviewTokens.guestId, input.guestId),
          eq(emailPreviewTokens.templateId, input.templateId)
        ),
      })

      if (existingToken) {
        // Return existing token
        // Use custom domain URL if available and verified
        let url: string
        if (event.customDomain && event.customDomainVerified) {
          url = `https://${event.customDomain}/email/${existingToken.token}`
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
          url = `${baseUrl}/api/email/${existingToken.token}`
        }
        return {
          token: existingToken.token,
          url,
          guest: {
            id: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
          },
          template: {
            id: template.id,
            name: template.name,
          },
        }
      }

      // Create new token
      const [newToken] = await db
        .insert(emailPreviewTokens)
        .values({
          guestId: input.guestId,
          templateId: input.templateId,
          eventId: input.eventId,
          createdBy: ctx.user.id,
        })
        .returning()

      // Use custom domain URL if available and verified
      let url: string
      if (event.customDomain && event.customDomainVerified) {
        url = `https://${event.customDomain}/email/${newToken.token}`
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
        url = `${baseUrl}/api/email/${newToken.token}`
      }

      return {
        token: newToken.token,
        url,
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
        },
        template: {
          id: template.id,
          name: template.name,
        },
      }
    }),

  // Get token data for public preview (no auth required)
  getByToken: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const tokenRecord = await db.query.emailPreviewTokens.findFirst({
        where: eq(emailPreviewTokens.token, input.token),
        with: {
          guest: {
            with: {
              category: true,
            },
          },
          template: {
            with: {
              masterTemplate: true,
            },
          },
          event: {
            with: {
              workspace: {
                columns: {
                  branding: true,
                  logo: true,
                },
              },
            },
          },
        },
      })

      if (!tokenRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired link" })
      }

      return {
        id: tokenRecord.id,
        token: tokenRecord.token,
        guest: tokenRecord.guest,
        template: tokenRecord.template,
        event: tokenRecord.event,
        createdAt: tokenRecord.createdAt,
      }
    }),
})
