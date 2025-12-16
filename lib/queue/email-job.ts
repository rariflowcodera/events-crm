import type { BilingualEmailContentInput } from "@/lib/schemas"
import type { BilingualStructuredContent } from "@/server/db/schemas/email-template"
import type { MasterTemplateStructure } from "@/server/db/schemas/email-master-template"
import type { WorkspaceBranding, EventBranding } from "@/server/db/schemas"
import { getRsvpUrl, getRsvpConfirmUrl, getRsvpDeclineUrl } from "@/lib/rsvp-url"
import { buildStaticMapHtml, buildGoogleMapsLink } from "@/lib/maps"
import { renderStructuredEmail } from "@/lib/email/render-structured"
import {
  defaultMasterTemplate,
  defaultMasterTemplateStructure,
} from "@/lib/email/master-templates/default"

// ============================================================================
// Types
// ============================================================================

interface Guest {
  id: string
  firstName: string
  lastName: string | null
  title: string | null
  salutation: string | null
  email: string | null
  position: string | null
  entity: string | null
  rsvpToken: string
  categoryId?: string | null
  category?: {
    name: string
    code: string
  } | null
}

interface Event {
  id: string
  name: string
  slug: string
  venue: string | null
  venueAddress: string | null
  latitude: string | null
  longitude: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface EventDocument {
  id: string
  name: string
  url: string
  categoryIds: string[] | null
}

/** Legacy template with HTML content */
interface LegacyTemplate {
  id: string
  name: string
  content: BilingualEmailContentInput
  structuredContent?: null
  defaultLanguage: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
}

/** Template with structured content */
interface StructuredTemplate {
  id: string
  name: string
  content: BilingualEmailContentInput
  structuredContent: BilingualStructuredContent
  masterTemplateId?: string | null
  defaultLanguage: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
}

/** Combined template type - can be legacy or structured */
type Template = LegacyTemplate | StructuredTemplate

/** Master template for structured emails */
interface MasterTemplate {
  id: string
  htmlTemplate: string
  structure: MasterTemplateStructure | null
}

/** Branding context for structured rendering */
interface BrandingContext {
  workspaceBranding?: WorkspaceBranding | null
  eventBranding?: EventBranding | null
  masterTemplate?: MasterTemplate | null
}

interface RenderResult {
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

/**
 * Render an email template with variables replaced.
 * Supports both legacy HTML templates and new structured content templates.
 *
 * @param template - The email template (legacy or structured)
 * @param guest - Guest data for variable substitution
 * @param event - Event data for variable substitution
 * @param language - Preferred language (en or ar)
 * @param documents - Event documents for document variable substitution
 * @param branding - Optional branding context for structured templates
 */
export function renderEmailTemplate(
  template: Template,
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en",
  documents: EventDocument[] = [],
  branding?: BrandingContext
): RenderResult {
  // Check if template has structured content - use new renderer
  if (template.structuredContent) {
    return renderStructuredEmailTemplate(
      template as StructuredTemplate,
      guest,
      event,
      documents,
      branding
    )
  }

  // Legacy HTML template rendering
  return renderLegacyEmailTemplate(template, guest, event, language, documents)
}

/**
 * Render a structured email template using master template and branding.
 */
function renderStructuredEmailTemplate(
  template: StructuredTemplate,
  guest: Guest,
  event: Event,
  documents: EventDocument[],
  branding?: BrandingContext
): RenderResult {
  // Determine master template to use
  const masterTemplate = branding?.masterTemplate || {
    id: "built-in-default",
    htmlTemplate: defaultMasterTemplate,
    structure: defaultMasterTemplateStructure,
  }

  // Render using structured renderer
  return renderStructuredEmail({
    template: {
      id: template.id,
      name: template.name,
      structuredContent: template.structuredContent,
      defaultLanguage: template.defaultLanguage,
      fromName: template.fromName,
      fromEmail: template.fromEmail,
      replyTo: template.replyTo,
    },
    masterTemplate,
    guest,
    event,
    workspaceBranding: branding?.workspaceBranding,
    eventBranding: branding?.eventBranding,
    documents,
  })
}

/**
 * Render a legacy HTML email template (backwards compatible).
 */
function renderLegacyEmailTemplate(
  template: Template,
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en",
  documents: EventDocument[] = []
): RenderResult {
  // Get content for the specified language, fallback to English
  // Arabic content has optional fields, so we only use it if subject and htmlContent exist
  const arContent = template.content.ar
  let subject: string
  let htmlContent: string
  let textContent: string | undefined

  if (
    language === "ar" &&
    arContent?.subject &&
    arContent?.htmlContent
  ) {
    subject = arContent.subject
    htmlContent = arContent.htmlContent
    textContent = arContent.textContent
  } else {
    // English content always has required fields
    subject = template.content.en.subject
    htmlContent = template.content.en.htmlContent
    textContent = template.content.en.textContent
  }

  // Build the variables map
  // Use custom domain if configured and verified, otherwise use app URL
  const rsvpLink = getRsvpUrl(event, guest.rsvpToken)
  const rsvpConfirmLink = getRsvpConfirmUrl(event, guest.rsvpToken)
  const rsvpDeclineLink = getRsvpDeclineUrl(event, guest.rsvpToken)

  const variables: Record<string, string> = {
    // Guest variables
    "guest.firstName": guest.firstName || "",
    "guest.lastName": guest.lastName || "",
    "guest.fullName": [guest.firstName, guest.lastName].filter(Boolean).join(" "),
    "guest.title": guest.title || "",
    "guest.salutation": guest.salutation || "",
    "guest.email": guest.email || "",
    "guest.position": guest.position || "",
    "guest.entity": guest.entity || "",
    "guest.category": guest.category?.name || "",

    // Event variables
    "event.name": event.name,
    "event.venue": event.venue || "",
    "event.venueAddress": event.venueAddress || "",
    "event.startDate": event.startDate ? formatDate(event.startDate, language) : "",
    "event.endDate": event.endDate ? formatDate(event.endDate, language) : "",
    "event.rsvpDeadline": event.rsvpDeadline
      ? formatDate(event.rsvpDeadline, language)
      : "",

    // RSVP link variables (uses custom domain if configured)
    "rsvp.link": rsvpLink,
    "rsvp.confirmLink": rsvpConfirmLink,
    "rsvp.declineLink": rsvpDeclineLink,

    // Category variables
    "category.name": guest.category?.name || "",
    "category.code": guest.category?.code || "",

    // Map variables
    "event.mapImage": buildStaticMapHtml(event),
    "event.mapLink": buildGoogleMapsLink(event.latitude, event.longitude),
  }

  // Replace variables in content
  let renderedSubject = replaceVariables(subject, variables)
  let html = replaceVariables(htmlContent, variables)
  let text = textContent ? replaceVariables(textContent, variables) : undefined

  // Replace document variables
  // Filter documents visible to this guest's category
  const visibleDocs = documents.filter(
    (doc) =>
      !doc.categoryIds ||
      doc.categoryIds.length === 0 ||
      (guest.categoryId && doc.categoryIds.includes(guest.categoryId))
  )

  // Determine base URL for document links (use custom domain if available)
  const documentBaseUrl =
    event.customDomain && event.customDomainVerified
      ? `https://${event.customDomain}`
      : process.env.NEXT_PUBLIC_APP_URL || ""

  for (const doc of visibleDocs) {
    // Use branded /d/{id} URL instead of direct S3 URL
    const brandedUrl = `${documentBaseUrl}/d/${doc.id}`

    // Pattern 1: {{documentUrl.UUID}} - URL only
    const urlOnlyPattern = new RegExp(`\\{\\{documentUrl\\.${doc.id}\\}\\}`, "g")
    html = html.replace(urlOnlyPattern, brandedUrl)
    if (text) {
      text = text.replace(urlOnlyPattern, brandedUrl)
    }
    renderedSubject = renderedSubject.replace(urlOnlyPattern, brandedUrl)

    // Pattern 2: {{document.UUID|Custom Text}} - link with custom display text
    const customTextPattern = new RegExp(`\\{\\{document\\.${doc.id}\\|([^}]+)\\}\\}`, "g")
    html = html.replace(customTextPattern, (_, customText) => {
      return `<a href="${brandedUrl}">${customText.trim()}</a>`
    })
    if (text) {
      text = text.replace(customTextPattern, (_, customText) => {
        return `${customText.trim()}: ${brandedUrl}`
      })
    }
    // Subject: just the custom text (links don't work in subjects)
    renderedSubject = renderedSubject.replace(customTextPattern, (_, customText) => {
      return customText.trim()
    })

    // Pattern 3: {{document.UUID}} - link with document name (no custom text)
    const defaultPattern = new RegExp(`\\{\\{document\\.${doc.id}\\}\\}`, "g")
    html = html.replace(defaultPattern, `<a href="${brandedUrl}">${doc.name}</a>`)
    if (text) {
      text = text.replace(defaultPattern, `${doc.name}: ${brandedUrl}`)
    }
    // Subject: just the name (links don't work in subjects)
    renderedSubject = renderedSubject.replace(defaultPattern, doc.name)
  }

  // Handle missing/deleted documents gracefully
  // First handle documentUrl patterns
  const missingDocUrlPattern = /\{\{documentUrl\.[a-f0-9-]+\}\}/g
  html = html.replace(missingDocUrlPattern, "[Document unavailable]")
  if (text) {
    text = text.replace(missingDocUrlPattern, "[Document unavailable]")
  }
  renderedSubject = renderedSubject.replace(missingDocUrlPattern, "")

  // Then handle document patterns with custom text
  const missingDocWithTextPattern = /\{\{document\.[a-f0-9-]+\|[^}]+\}\}/g
  html = html.replace(missingDocWithTextPattern, "[Document unavailable]")
  if (text) {
    text = text.replace(missingDocWithTextPattern, "[Document unavailable]")
  }
  renderedSubject = renderedSubject.replace(missingDocWithTextPattern, "")

  // Finally handle basic document patterns
  const missingDocPattern = /\{\{document\.[a-f0-9-]+\}\}/g
  html = html.replace(missingDocPattern, "[Document unavailable]")
  if (text) {
    text = text.replace(missingDocPattern, "[Document unavailable]")
  }
  renderedSubject = renderedSubject.replace(missingDocPattern, "")

  // Build from address
  let from: string | undefined
  if (template.fromEmail) {
    from = template.fromName
      ? `${template.fromName} <${template.fromEmail}>`
      : template.fromEmail
  }

  return {
    subject: renderedSubject,
    html,
    text,
    from,
    replyTo: template.replyTo || undefined,
  }
}

/**
 * Replace {{variable}} placeholders with actual values
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+\.\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}

/**
 * Format a date based on language
 */
function formatDate(date: Date, language: "en" | "ar"): string {
  // Use locale-appropriate formatting
  const locale = language === "ar" ? "ar-SA" : "en-US"
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

/**
 * Validate that a guest has an email address
 */
export function guestHasEmail(guest: { email: string | null }): boolean {
  return !!guest.email && guest.email.includes("@")
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Guest as EmailGuest,
  Event as EmailEvent,
  EventDocument as EmailEventDocument,
  Template as EmailTemplate,
  MasterTemplate as EmailMasterTemplate,
  BrandingContext as EmailBrandingContext,
  RenderResult as EmailRenderResult,
}
