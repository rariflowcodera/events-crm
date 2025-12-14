import { db } from "@/server/db/config/database"
import {
  events,
  eventForms,
  formResponses,
  guests,
  guestCategories,
} from "@/server/db/schemas"
import { createTRPCRouter, baseProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import type { FormConfig } from "@/server/db/schemas/event-form"

export const publicFormsRouter = createTRPCRouter({
  // Get form by short code (public, no auth required)
  getByShortCode: baseProcedure
    .input(z.object({ shortCode: z.string() }))
    .query(async ({ input }) => {
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.shortCode, input.shortCode),
      })

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check if form is published
      if (!form.isPublished) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check if form has expired
      if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Form has expired" })
      }

      // Get event info for branding
      const event = await db.query.events.findFirst({
        where: eq(events.id, form.eventId),
      })

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" })
      }

      return {
        id: form.id,
        name: form.name,
        description: form.description,
        purpose: form.purpose,
        formConfig: form.formConfig as FormConfig,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        allowAmendments: form.allowAmendments,
        visibleToCategories: form.visibleToCategories,
        event: {
          id: event.id,
          name: event.name,
          branding: event.branding,
        },
      }
    }),

  // Lookup guest by email (public, returns limited info)
  lookupGuest: baseProcedure
    .input(
      z.object({
        shortCode: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      // Get the form
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.shortCode, input.shortCode),
      })

      if (!form || !form.isPublished) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check if expired
      if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Form has expired" })
      }

      // Find guest by email in this event
      const guest = await db.query.guests.findFirst({
        where: and(
          eq(guests.eventId, form.eventId),
          eq(guests.email, input.email.toLowerCase())
        ),
      })

      if (!guest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No guest found with this email address for this event",
        })
      }

      // Check if guest's category is allowed to see this form
      if (
        form.visibleToCategories &&
        form.visibleToCategories.length > 0 &&
        !form.visibleToCategories.includes(guest.categoryId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form is not available for your guest category",
        })
      }

      // Get category info
      const category = guest.categoryId
        ? await db.query.guestCategories.findFirst({
            where: eq(guestCategories.id, guest.categoryId),
          })
        : null

      // Check if guest has already submitted
      const existingResponse = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.formId, form.id),
          eq(formResponses.guestId, guest.id)
        ),
      })

      const hasSubmitted = !!existingResponse
      const canSubmit = !hasSubmitted || form.allowMultipleSubmissions
      const canAmend = hasSubmitted && form.allowAmendments

      return {
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          categoryId: guest.categoryId,
          categoryName: category?.name ?? null,
        },
        hasSubmitted,
        canSubmit,
        canAmend,
        previousResponse: canAmend && existingResponse
          ? {
              id: existingResponse.id,
              responses: existingResponse.responses,
              submittedAt: existingResponse.submittedAt,
            }
          : null,
      }
    }),

  // Submit form response (public)
  submitResponse: baseProcedure
    .input(
      z.object({
        shortCode: z.string(),
        guestId: z.string().uuid(),
        responses: z.record(z.unknown()),
        isAmendment: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get the form
      const form = await db.query.eventForms.findFirst({
        where: eq(eventForms.shortCode, input.shortCode),
      })

      if (!form || !form.isPublished) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" })
      }

      // Check if expired
      if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Form has expired" })
      }

      // Get guest
      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, input.guestId),
      })

      if (!guest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guest not found" })
      }

      if (!guest.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Guest email is required" })
      }

      // Store email for later use (TypeScript narrowing)
      const guestEmail = guest.email

      // Verify guest belongs to this event
      if (guest.eventId !== form.eventId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid guest" })
      }

      // Check category restrictions
      if (
        form.visibleToCategories &&
        form.visibleToCategories.length > 0 &&
        !form.visibleToCategories.includes(guest.categoryId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form is not available for your guest category",
        })
      }

      // Check for existing response
      const existingResponse = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.formId, form.id),
          eq(formResponses.guestId, guest.id)
        ),
      })

      if (existingResponse) {
        if (input.isAmendment && form.allowAmendments) {
          // Create amendment (new response linked to previous)
          const [response] = await db
            .insert(formResponses)
            .values({
              formId: form.id,
              eventId: form.eventId,
              guestId: guest.id,
              guestEmail,
              responses: input.responses,
              isAmendment: true,
              previousResponseId: existingResponse.id,
            })
            .returning()

          return {
            success: true,
            responseId: response.id,
            isAmendment: true,
          }
        } else if (!form.allowMultipleSubmissions) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already submitted this form",
          })
        }
      }

      // Create new response
      const [response] = await db
        .insert(formResponses)
        .values({
          formId: form.id,
          eventId: form.eventId,
          guestId: guest.id,
          guestEmail,
          responses: input.responses,
          isAmendment: false,
        })
        .returning()

      return {
        success: true,
        responseId: response.id,
        isAmendment: false,
      }
    }),
})
