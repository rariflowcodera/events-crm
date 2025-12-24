import { db } from "@/server/db/config/database"
import { events, guests, guestCategories } from "@/server/db/schemas"
import { createTRPCRouter, baseProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { resolveBranding, getFontStack, getArabicFontStack } from "@/lib/branding/utils"

export const publicVappRouter = createTRPCRouter({
  // Get VAPP data by guest's rsvpToken
  getByToken: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      // Find guest by rsvpToken
      const guest = await db.query.guests.findFirst({
        where: eq(guests.rsvpToken, input.token),
      })

      if (!guest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired VAPP link",
        })
      }

      // Check if guest has a serial number (required for VAPP)
      if (!guest.serialNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "VAPP not available for this guest",
        })
      }

      // Get event with workspace for branding
      const event = await db.query.events.findFirst({
        where: eq(events.id, guest.eventId),
        with: {
          workspace: {
            columns: {
              branding: true,
              logo: true,
            },
          },
        },
      })

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        })
      }

      // Check if VAPP is enabled for this event
      const vapp = event.settings?.vapp
      if (!vapp?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "VAPP is not enabled for this event",
        })
      }

      // Get category
      const category = await db.query.guestCategories.findFirst({
        where: eq(guestCategories.id, guest.categoryId),
      })

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Guest category not found",
        })
      }

      // Build workspace branding with legacy logo fallback
      const workspaceBranding = {
        ...event.workspace.branding,
        logo: event.workspace.branding?.logo ?? event.workspace.logo ?? undefined,
      }

      // Resolve branding with workspace fallback
      const resolvedBranding = resolveBranding(workspaceBranding, event.branding)

      // Get font family from email branding (workspace -> event fallback)
      const emailBranding = event.branding?.emailBranding ?? event.workspace.branding?.emailBranding
      const fontFamily = emailBranding?.fontFamily ?? "inter"
      const arabicFontFamily = emailBranding?.arabicFontFamily ?? "din-next"

      return {
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          serialNumber: guest.serialNumber,
        },
        category: {
          id: category.id,
          name: category.name,
          code: category.code,
          accessCode: category.vappAccessCode,
        },
        event: {
          id: event.id,
          name: event.name,
          venueCode: vapp.venueCode,
          matchCode: vapp.matchCode,
        },
        branding: {
          logo: resolvedBranding.logo,
          primaryColor: resolvedBranding.primaryColor,
          vappBackgroundImage: event.branding?.vappBackgroundImage,
          fontFamily: getFontStack(fontFamily),
          arabicFontFamily: getArabicFontStack(arabicFontFamily),
        },
      }
    }),
})
