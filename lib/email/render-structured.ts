import Handlebars from "handlebars"
import type { BilingualStructuredContent, StructuredEmailContent } from "@/server/db/schemas/email-template"
import type { MasterTemplateStructure } from "@/server/db/schemas/email-master-template"
import type { WorkspaceBranding, EventBranding } from "@/server/db/schemas"
import {
  resolveEmailBranding,
  resolveBranding,
  getFontStack,
  getArabicFontStack,
  getAccentStripHeight,
  getCtaBorderRadius,
  getContentPadding,
} from "@/lib/branding/utils"
import {
  defaultMasterTemplate,
  defaultMasterTemplateStructure,
  englishContentSectionTemplate,
  arabicContentSectionTemplate,
} from "./master-templates/default"
import { getRsvpUrl, getRsvpConfirmUrl, getRsvpDeclineUrl } from "@/lib/rsvp-url"
import { buildStaticMapHtml, buildGoogleMapsLink } from "@/lib/maps"

// ============================================================================
// Types
// ============================================================================

export interface Guest {
  id: string
  firstName: string
  lastName: string | null
  displayNameAr: string | null
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

export interface Event {
  id: string
  name: string
  nameAr: string | null
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

export interface EventDocument {
  id: string
  name: string
  url: string
  categoryIds: string[] | null
}

export interface FormToken {
  form: { id: string; name: string }
  token: string
}

export interface TemplateWithStructuredContent {
  id: string
  name: string
  structuredContent: BilingualStructuredContent
  defaultLanguage: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  showBannerFooter?: boolean | null
}

export interface MasterTemplate {
  id: string
  htmlTemplate: string
  structure: MasterTemplateStructure | null
}

export interface RenderOptions {
  template: TemplateWithStructuredContent
  masterTemplate?: MasterTemplate | null
  guest: Guest
  event: Event
  workspaceBranding?: WorkspaceBranding | null
  eventBranding?: EventBranding | null
  documents?: EventDocument[]
  formTokens?: FormToken[]
}

export interface RenderResult {
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

// ============================================================================
// Variable Context Builder
// ============================================================================

/**
 * Build the variable context for Handlebars templates.
 * All variables are flattened for easy access in templates.
 */
export function buildVariableContext(
  guest: Guest,
  event: Event,
  language: "en" | "ar" = "en"
): Record<string, string> {
  const rsvpLink = getRsvpUrl(event, guest.rsvpToken)
  const rsvpConfirmLink = getRsvpConfirmUrl(event, guest.rsvpToken)
  const rsvpDeclineLink = getRsvpDeclineUrl(event, guest.rsvpToken)

  return {
    // Guest variables
    "guest.firstName": guest.firstName || "",
    "guest.lastName": guest.lastName || "",
    "guest.fullName": [guest.firstName, guest.lastName].filter(Boolean).join(" "),
    "guest.displayNameAr": guest.displayNameAr || "",
    "guest.title": guest.title || "",
    "guest.salutation": guest.salutation || "",
    "guest.email": guest.email || "",
    "guest.position": guest.position || "",
    "guest.entity": guest.entity || "",
    "guest.category": guest.category?.name || "",

    // Event variables
    "event.name": event.name,
    "event.nameAr": event.nameAr || event.name, // Falls back to English name
    "event.venue": event.venue || "",
    "event.venueAddress": event.venueAddress || "",
    "event.startDate": event.startDate ? formatDate(event.startDate, language) : "",
    "event.endDate": event.endDate ? formatDate(event.endDate, language) : "",
    "event.rsvpDeadline": event.rsvpDeadline ? formatDate(event.rsvpDeadline, language) : "",

    // Map variables
    "event.mapImage": buildStaticMapHtml(event),
    "event.mapLink": buildGoogleMapsLink(event.latitude, event.longitude),

    // RSVP link variables
    "rsvp.link": rsvpLink,
    "rsvp.confirmLink": rsvpConfirmLink,
    "rsvp.declineLink": rsvpDeclineLink,

    // Category variables
    "category.name": guest.category?.name || "",
    "category.code": guest.category?.code || "",
  }
}

/**
 * Format a date based on language.
 */
function formatDate(date: Date, language: "en" | "ar"): string {
  const locale = language === "ar" ? "ar-SA" : "en-US"
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

// ============================================================================
// Variable Substitution
// ============================================================================

/**
 * Replace {{variable.field}} placeholders with actual values.
 * Works with both legacy double-brace and Handlebars-style syntax.
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+\.\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}

/**
 * Process structured content fields to replace variables.
 */
function processStructuredContent(
  content: StructuredEmailContent,
  variables: Record<string, string>
): StructuredEmailContent {
  return {
    subject: replaceVariables(content.subject, variables),
    greeting: content.greeting ? replaceVariables(content.greeting, variables) : undefined,
    heading: replaceVariables(content.heading, variables),
    subheading: content.subheading ? replaceVariables(content.subheading, variables) : undefined,
    bodyParagraphs: content.bodyParagraphs.map((p) => replaceVariables(p, variables)),
    cta: content.cta
      ? {
          text: replaceVariables(content.cta.text, variables),
          url: replaceVariables(content.cta.url, variables),
        }
      : undefined,
    postCtaText: content.postCtaText ? replaceVariables(content.postCtaText, variables) : undefined,
  }
}

// ============================================================================
// Content Section Renderers
// ============================================================================

/**
 * Render English content section from structured content.
 */
function renderEnglishSection(
  content: StructuredEmailContent,
  brandingContext: Record<string, string>
): string {
  const template = Handlebars.compile(englishContentSectionTemplate)
  return template({
    ...content,
    ...brandingContext,
  })
}

/**
 * Render Arabic content section from structured content.
 */
function renderArabicSection(
  content: Partial<StructuredEmailContent>,
  brandingContext: Record<string, string>
): string {
  const template = Handlebars.compile(arabicContentSectionTemplate)
  return template({
    ...content,
    ...brandingContext,
  })
}

// ============================================================================
// Main Renderer
// ============================================================================

/**
 * Render a structured email template with master template and branding.
 *
 * This function:
 * 1. Resolves email branding (workspace + event inheritance)
 * 2. Builds variable context (guest, event, rsvp links)
 * 3. Renders EN and AR content sections from structured fields
 * 4. Assembles final HTML using master template with Handlebars
 * 5. Returns { subject, html, text }
 */
export function renderStructuredEmail(options: RenderOptions): RenderResult {
  const {
    template,
    masterTemplate,
    guest,
    event,
    workspaceBranding,
    eventBranding,
    documents = [],
    formTokens = [],
  } = options

  // 1. Resolve branding
  const resolvedVisualBranding = resolveBranding(workspaceBranding, eventBranding)
  const resolvedEmailBranding = resolveEmailBranding(
    workspaceBranding?.emailBranding,
    eventBranding?.emailBranding,
    resolvedVisualBranding
  )

  // 2. Build variable contexts for EN and AR
  const enVariables = buildVariableContext(guest, event, "en")
  const arVariables = buildVariableContext(guest, event, "ar")

  // 3. Get structured content
  const enContent = template.structuredContent.en
  const arContent = template.structuredContent.ar

  // Process variables in structured content
  const processedEnContent = processStructuredContent(enContent, enVariables)

  // Always generate Arabic content - fallback to English when Arabic is empty
  // This ensures bilingual emails work out of the box without requiring Arabic content
  const processedArContent = processStructuredContent(
    {
      subject: arContent?.subject || enContent.subject,
      greeting: arContent?.greeting || enContent.greeting,
      heading: arContent?.heading || enContent.heading,
      subheading: arContent?.subheading || enContent.subheading,
      bodyParagraphs: arContent?.bodyParagraphs?.length
        ? arContent.bodyParagraphs
        : enContent.bodyParagraphs,
      cta: arContent?.cta || enContent.cta,
      postCtaText: arContent?.postCtaText || enContent.postCtaText,
    },
    arVariables
  )

  // 4. Build branding context for templates
  const brandingContext = {
    headingColor: resolvedEmailBranding.headingColor,
    bodyTextColor: resolvedEmailBranding.bodyTextColor,
    ctaButtonColor: resolvedEmailBranding.ctaButtonColor,
    ctaButtonTextColor: resolvedEmailBranding.ctaButtonTextColor,
    ctaBorderRadius: getCtaBorderRadius(resolvedEmailBranding.ctaButtonStyle),
    fontFamily: getFontStack(resolvedEmailBranding.fontFamily),
    arabicFontFamily: getArabicFontStack(resolvedEmailBranding.arabicFontFamily),
  }

  // 5. Render content sections
  const enSectionHtml = renderEnglishSection(processedEnContent, brandingContext)
  const arSectionHtml = processedArContent
    ? renderArabicSection(processedArContent, brandingContext)
    : ""

  // 6. Build master template context
  const structure = masterTemplate?.structure || defaultMasterTemplateStructure
  const masterHtml = masterTemplate?.htmlTemplate || defaultMasterTemplate

  // Get logo URL - ensure it's absolute for email clients
  const rawLogoUrl = resolvedVisualBranding.logo
  let logoUrl: string | null = null
  if (rawLogoUrl) {
    if (rawLogoUrl.startsWith("http://") || rawLogoUrl.startsWith("https://")) {
      // Already absolute URL (S3, CDN, etc.)
      logoUrl = rawLogoUrl
    } else if (rawLogoUrl.startsWith("/")) {
      // Relative path - convert to absolute using app URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
      logoUrl = baseUrl ? `${baseUrl}${rawLogoUrl}` : null
    } else {
      // Some other format, try to use as-is
      logoUrl = rawLogoUrl
    }
  }

  // Get banner footer image URL - ensure it's absolute for email clients
  const rawBannerUrl = resolvedEmailBranding.bannerFooterImage
  let bannerFooterImageUrl: string | null = null
  if (rawBannerUrl) {
    if (rawBannerUrl.startsWith("http://") || rawBannerUrl.startsWith("https://")) {
      bannerFooterImageUrl = rawBannerUrl
    } else if (rawBannerUrl.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
      bannerFooterImageUrl = baseUrl ? `${baseUrl}${rawBannerUrl}` : null
    } else {
      bannerFooterImageUrl = rawBannerUrl
    }
  }

  const masterContext = {
    // Email metadata
    emailSubject: processedEnContent.subject,
    preheaderText: processedEnContent.subheading || processedEnContent.heading,

    // Logo
    logoUrl,
    logoAlt: event.name,

    // Branding colors and styles
    accentStripColor: resolvedEmailBranding.accentStripColor,
    accentStripHeight: getAccentStripHeight(resolvedEmailBranding.accentStripHeight),
    headingColor: resolvedEmailBranding.headingColor,
    bodyTextColor: resolvedEmailBranding.bodyTextColor,
    ctaButtonColor: resolvedEmailBranding.ctaButtonColor,
    ctaButtonTextColor: resolvedEmailBranding.ctaButtonTextColor,
    ctaBorderRadius: getCtaBorderRadius(resolvedEmailBranding.ctaButtonStyle),
    contentBackgroundColor: resolvedEmailBranding.contentBackgroundColor || "#ffffff",

    // Typography
    fontFamily: getFontStack(resolvedEmailBranding.fontFamily),
    arabicFontFamily: getArabicFontStack(resolvedEmailBranding.arabicFontFamily),

    // Layout
    contentWidth: 600,
    contentPadding: getContentPadding("normal"),

    // Content sections
    enContent: enSectionHtml,
    arContent: arSectionHtml,

    // Structure flags
    showLogo: structure.showLogo && !!logoUrl,
    showAccentStrip: structure.showAccentStrip,
    showEnglishSection: structure.showEnglishSection,
    showArabicSection: structure.showArabicSection && !!processedArContent,
    showDivider: structure.showDivider,
    // Per-template showBannerFooter overrides master template setting
    showBannerFooter:
      (template.showBannerFooter ?? structure.showBannerFooter ?? true) &&
      !!bannerFooterImageUrl,
    showFooter: structure.showFooter,

    // Footer
    bannerFooterImageUrl,
    footerText: resolvedEmailBranding.footerText || `${event.name}`,
  }

  // 7. Compile and render master template
  const compiledMaster = Handlebars.compile(masterHtml)
  let html = compiledMaster(masterContext)

  // 8. Handle document variables in the rendered HTML
  html = processDocumentVariables(html, documents, guest, event)

  // 9. Handle form link variables in the rendered HTML
  if (formTokens.length > 0) {
    html = processFormLinkVariables(html, formTokens, event)
  }

  // 10. Generate plain text version
  const text = generatePlainText(processedEnContent, processedArContent)

  // 11. Build from address
  let from: string | undefined
  if (template.fromEmail) {
    from = template.fromName
      ? `${template.fromName} <${template.fromEmail}>`
      : template.fromEmail
  }

  return {
    subject: processedEnContent.subject,
    html,
    text,
    from,
    replyTo: template.replyTo || undefined,
  }
}

// ============================================================================
// Document Variable Processing
// ============================================================================

/**
 * Process document variables in rendered HTML.
 * Supports patterns:
 * - {{documentUrl.UUID}} - URL only
 * - {{document.UUID|Custom Text}} - link with custom text
 * - {{document.UUID}} - link with document name
 */
function processDocumentVariables(
  html: string,
  documents: EventDocument[],
  guest: Guest,
  event: Event
): string {
  // Filter documents visible to this guest's category
  const visibleDocs = documents.filter(
    (doc) =>
      !doc.categoryIds ||
      doc.categoryIds.length === 0 ||
      (guest.categoryId && doc.categoryIds.includes(guest.categoryId))
  )

  // Determine base URL for document links
  const documentBaseUrl =
    event.customDomain && event.customDomainVerified
      ? `https://${event.customDomain}`
      : process.env.NEXT_PUBLIC_APP_URL || ""

  let result = html

  for (const doc of visibleDocs) {
    const brandedUrl = `${documentBaseUrl}/d/${doc.id}`

    // Pattern 1: {{documentUrl.UUID}}
    const urlOnlyPattern = new RegExp(`\\{\\{documentUrl\\.${doc.id}\\}\\}`, "g")
    result = result.replace(urlOnlyPattern, brandedUrl)

    // Pattern 2: {{document.UUID|Custom Text}}
    const customTextPattern = new RegExp(`\\{\\{document\\.${doc.id}\\|([^}]+)\\}\\}`, "g")
    result = result.replace(customTextPattern, (_, customText) => {
      return `<a href="${brandedUrl}">${customText.trim()}</a>`
    })

    // Pattern 3: {{document.UUID}}
    const defaultPattern = new RegExp(`\\{\\{document\\.${doc.id}\\}\\}`, "g")
    result = result.replace(defaultPattern, `<a href="${brandedUrl}">${doc.name}</a>`)
  }

  // Handle missing/deleted documents
  result = result.replace(/\{\{documentUrl\.[a-f0-9-]+\}\}/g, "[Document unavailable]")
  result = result.replace(/\{\{document\.[a-f0-9-]+\|[^}]+\}\}/g, "[Document unavailable]")
  result = result.replace(/\{\{document\.[a-f0-9-]+\}\}/g, "[Document unavailable]")

  return result
}

// ============================================================================
// Form Link Variable Processing
// ============================================================================

/**
 * Process form link variables in rendered HTML.
 * Supports patterns:
 * - {{formUrl.UUID}} - URL only
 * - {{formLink.UUID|Custom Text}} - link with custom text
 * - {{formLink.UUID}} - link with form name
 */
function processFormLinkVariables(
  html: string,
  formTokens: FormToken[],
  event: Event
): string {
  // Determine base URL for form links
  const baseUrl =
    event.customDomain && event.customDomainVerified
      ? `https://${event.customDomain}`
      : process.env.NEXT_PUBLIC_APP_URL || ""

  let result = html

  for (const { form, token } of formTokens) {
    const formUrl = `${baseUrl}/forms/t/${token}`

    // Pattern 1: {{formUrl.UUID}} - URL only
    const urlOnlyPattern = new RegExp(`\\{\\{formUrl\\.${form.id}\\}\\}`, "g")
    result = result.replace(urlOnlyPattern, formUrl)

    // Pattern 2: {{formLink.UUID|Custom Text}} - link with custom text
    const customTextPattern = new RegExp(`\\{\\{formLink\\.${form.id}\\|([^}]+)\\}\\}`, "g")
    result = result.replace(customTextPattern, (_, customText) => {
      return `<a href="${formUrl}">${customText.trim()}</a>`
    })

    // Pattern 3: {{formLink.UUID}} - link with form name
    const defaultPattern = new RegExp(`\\{\\{formLink\\.${form.id}\\}\\}`, "g")
    result = result.replace(defaultPattern, `<a href="${formUrl}">${form.name}</a>`)
  }

  // Handle missing/unavailable form links (forms not in token mode or deleted)
  result = result.replace(/\{\{formUrl\.[a-f0-9-]+\}\}/g, "[Form unavailable]")
  result = result.replace(/\{\{formLink\.[a-f0-9-]+\|[^}]+\}\}/g, "[Form unavailable]")
  result = result.replace(/\{\{formLink\.[a-f0-9-]+\}\}/g, "[Form unavailable]")

  return result
}

// ============================================================================
// Plain Text Generation
// ============================================================================

/**
 * Generate a plain text version from structured content.
 */
function generatePlainText(
  enContent: StructuredEmailContent,
  arContent: StructuredEmailContent | null
): string {
  const lines: string[] = []

  // English section
  if (enContent.greeting) {
    lines.push(stripHtml(enContent.greeting))
    lines.push("")
  }

  lines.push(stripHtml(enContent.heading))
  lines.push("")

  if (enContent.subheading) {
    lines.push(stripHtml(enContent.subheading))
    lines.push("")
  }

  for (const paragraph of enContent.bodyParagraphs) {
    lines.push(stripHtml(paragraph))
    lines.push("")
  }

  if (enContent.cta) {
    lines.push(`${stripHtml(enContent.cta.text)}: ${enContent.cta.url}`)
    lines.push("")
  }

  if (enContent.postCtaText) {
    lines.push(stripHtml(enContent.postCtaText))
    lines.push("")
  }

  // Arabic section (if present)
  if (arContent) {
    lines.push("---")
    lines.push("")

    if (arContent.greeting) {
      lines.push(stripHtml(arContent.greeting))
      lines.push("")
    }

    lines.push(stripHtml(arContent.heading))
    lines.push("")

    if (arContent.subheading) {
      lines.push(stripHtml(arContent.subheading))
      lines.push("")
    }

    for (const paragraph of arContent.bodyParagraphs) {
      lines.push(stripHtml(paragraph))
      lines.push("")
    }

    if (arContent.cta) {
      lines.push(`${stripHtml(arContent.cta.text)}: ${arContent.cta.url}`)
      lines.push("")
    }

    if (arContent.postCtaText) {
      lines.push(stripHtml(arContent.postCtaText))
    }
  }

  return lines.join("\n").trim()
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// ============================================================================
// Preview Helpers
// ============================================================================

/**
 * Generate sample data for email preview.
 */
export function getSamplePreviewData(): { guest: Guest; event: Event } {
  return {
    guest: {
      id: "preview-guest",
      firstName: "John",
      lastName: "Smith",
      displayNameAr: "جون سميث",
      title: "Dr.",
      salutation: "Dr.",
      email: "john.smith@example.com",
      position: "CEO",
      entity: "Acme Corporation",
      rsvpToken: "preview-token",
      categoryId: "cat-1",
      category: {
        name: "VIP",
        code: "AAA",
      },
    },
    event: {
      id: "preview-event",
      name: "Annual Gala 2025",
      nameAr: "الحفل السنوي 2025",
      slug: "annual-gala-2025",
      venue: "Grand Ballroom",
      venueAddress: "123 Main Street, Riyadh, Saudi Arabia",
      latitude: "24.7136",
      longitude: "46.6753",
      startDate: new Date("2025-03-15T19:00:00"),
      endDate: new Date("2025-03-15T23:00:00"),
      rsvpDeadline: new Date("2025-03-10T23:59:59"),
      customDomain: null,
      customDomainVerified: null,
    },
  }
}

/**
 * Render a preview of structured email content.
 */
export function renderPreview(
  structuredContent: BilingualStructuredContent,
  masterTemplate?: MasterTemplate | null,
  workspaceBranding?: WorkspaceBranding | null,
  eventBranding?: EventBranding | null
): RenderResult {
  const { guest, event } = getSamplePreviewData()

  return renderStructuredEmail({
    template: {
      id: "preview",
      name: "Preview Template",
      structuredContent,
      defaultLanguage: "en",
      fromName: null,
      fromEmail: null,
      replyTo: null,
    },
    masterTemplate,
    guest,
    event,
    workspaceBranding,
    eventBranding,
    documents: [],
  })
}
