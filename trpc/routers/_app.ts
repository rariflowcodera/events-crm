import { createTRPCRouter } from "@/trpc/init"
import { invitationsRouter } from "@/trpc/routers/invitations"
import { membersRouter } from "@/trpc/routers/members"
import { usersRouter } from "@/trpc/routers/users"
import { workspacesRouter } from "@/trpc/routers/workspaces"
// Events domain routers
import { eventsRouter } from "@/trpc/routers/events"
import { guestCategoriesRouter } from "@/trpc/routers/guest-categories"
import { guestsRouter } from "@/trpc/routers/guests"
import { guestListViewsRouter } from "@/trpc/routers/guest-list-views"
import { emailTemplatesRouter } from "@/trpc/routers/email-templates"
import { emailLogsRouter } from "@/trpc/routers/email-logs"
import { bulkEmailRouter } from "@/trpc/routers/bulk-email"
import { emailDeliveryRouter } from "@/trpc/routers/email-delivery"
import { eventDocumentsRouter } from "@/trpc/routers/event-documents"
// RSVP domain routers
import { rsvpFormsRouter } from "@/trpc/routers/rsvp-forms"
import { rsvpTemplatesRouter } from "@/trpc/routers/rsvp-templates"
import { rsvpReportsRouter } from "@/trpc/routers/rsvp-reports"
// Custom event forms
import { eventFormsRouter } from "@/trpc/routers/event-forms"
import { publicFormsRouter } from "@/trpc/routers/public-forms"
// Permissions
import { permissionsRouter } from "@/trpc/routers/permissions"
// Email master templates
import { emailMasterTemplatesRouter } from "@/trpc/routers/email-master-templates"

export const appRouter = createTRPCRouter({
  users: usersRouter,
  workspaces: workspacesRouter,
  members: membersRouter,
  invitations: invitationsRouter,
  // Events domain
  events: eventsRouter,
  guestCategories: guestCategoriesRouter,
  guests: guestsRouter,
  guestListViews: guestListViewsRouter,
  emailTemplates: emailTemplatesRouter,
  emailLogs: emailLogsRouter,
  bulkEmail: bulkEmailRouter,
  emailDelivery: emailDeliveryRouter,
  eventDocuments: eventDocumentsRouter,
  // RSVP domain
  rsvpForms: rsvpFormsRouter,
  rsvpTemplates: rsvpTemplatesRouter,
  rsvpReports: rsvpReportsRouter,
  // Custom event forms
  eventForms: eventFormsRouter,
  publicForms: publicFormsRouter,
  // Permissions
  permissions: permissionsRouter,
  // Email master templates
  emailMasterTemplates: emailMasterTemplatesRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
