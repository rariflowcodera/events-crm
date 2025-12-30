import Handlebars from "handlebars"
import type {
  BilingualStructuredContent,
  StructuredEmailContent,
  BodyParagraph,
} from "@/server/db/schemas/email-template"
import type { MasterTemplateStructure, TemplateStructureOverrides } from "@/server/db/schemas/email-master-template"
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
import { getRsvpUrl, getRsvpConfirmUrl, getRsvpDeclineUrl, getVappUrl } from "@/lib/rsvp-url"
import { buildStaticMapHtml, buildGoogleMapsLink } from "@/lib/maps"

// ============================================================================
// Types
// ============================================================================

export interface Guest {
  id: string
  firstName: string
  lastName: string | null
  displayNameAr: string | null
  gender: "male" | "female" | "unspecified" | null
  title: string | null
  salutation: string | null
  salutationAr: string | null
  email: string | null
  position: string | null
  entity: string | null
  rsvpToken: string
  serialNumber?: string | null
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
  settings?: {
    vapp?: {
      enabled?: boolean
      venueCode?: string
      matchCode?: string
    }
  } | null
}

export interface EventDocument {
  id: string
  name: string
  url: string
  type: string
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
  showBannerFooter?: boolean | null // DEPRECATED: Use structureOverrides.showBannerFooter
  structureOverrides?: TemplateStructureOverrides | null
}

export interface MasterTemplate {
  id: string
  name: string
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
    "guest.gender": guest.gender || "",
    "guest.title": guest.title || "",
    "guest.salutation": guest.salutation || "",
    "guest.salutationAr": guest.salutationAr || "",
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

    // VAPP (Vehicle Access Parking Permit) variables
    // Note: vapp.link and vappUrl are handled specially in processVappLinkVariables
    // to support pipe syntax for custom display text
    "vapp.serialNumber": guest.serialNumber || "",
    "vapp.venueCode": event.settings?.vapp?.venueCode || "",
    "vapp.matchCode": event.settings?.vapp?.matchCode || "",
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
// Markdown Processing
// ============================================================================

/**
 * Process markdown-style syntax to HTML.
 * Supports:
 * - **text** → <strong>text</strong> (bold)
 * - _text_ → <em>text</em> (italic)
 * - --- (on its own line) → <hr> (horizontal rule)
 * - Newlines → <br> (line breaks)
 */
function processMarkdown(text: string): string {
  return (
    text
      // Bold: **text** → <strong>text</strong>
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic: _text_ → <em>text</em> (only when not part of a word)
      .replace(/(?<![a-zA-Z0-9])_([^_]+?)_(?![a-zA-Z0-9])/g, "<em>$1</em>")
      // Horizontal rule: --- on its own line → <hr> (neutral gray)
      .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #D1D5DB; margin: 16px 0;">')
      // Line breaks: \n → <br>
      .replace(/\n/g, "<br>")
  )
}

/**
 * Strip markdown syntax from text (for plain text version).
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove bold markers
      .replace(/\*\*(.+?)\*\*/g, "$1")
      // Remove italic markers
      .replace(/(?<![a-zA-Z0-9])_([^_]+?)_(?![a-zA-Z0-9])/g, "$1")
      // Convert horizontal rule to plain text separator
      .replace(/^---$/gm, "---")
  )
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
 * Get font-size CSS value for paragraph size.
 */
function getParagraphFontSize(size: "small" | "normal" | "large" | undefined): string {
  switch (size) {
    case "small":
      return "14px"
    case "large":
      return "20px"
    default:
      return "16px"
  }
}

/**
 * Process structured content fields to replace variables and apply markdown.
 */
function processStructuredContent(
  content: StructuredEmailContent,
  variables: Record<string, string>
): StructuredEmailContent & { bodyParagraphs: Array<{ content: string; alignment?: string; size?: string; fontSize: string }> } {
  return {
    subject: replaceVariables(content.subject, variables),
    greeting: content.greeting ? replaceVariables(content.greeting, variables) : undefined,
    heading: content.heading ? replaceVariables(content.heading, variables) : undefined,
    subheading: content.subheading ? replaceVariables(content.subheading, variables) : undefined,
    bodyParagraphs: content.bodyParagraphs.map((p) => ({
      content: processMarkdown(replaceVariables(p.content, variables)),
      alignment: p.alignment,
      size: p.size,
      fontSize: getParagraphFontSize(p.size),
    })),
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

  // DEBUG: Log resolved branding to identify where values are lost
  console.log("Render Debug - Input Branding:", {
    workspaceEmailBranding: workspaceBranding?.emailBranding,
    eventEmailBranding: eventBranding?.emailBranding,
  })
  console.log("Render Debug - Resolved Branding:", {
    contentBackgroundColor: resolvedEmailBranding.contentBackgroundColor,
    bannerFooterImage: resolvedEmailBranding.bannerFooterImage,
  })

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
  const baseStructure = masterTemplate?.structure || defaultMasterTemplateStructure
  const overrides = template.structureOverrides || {}
  const masterHtml = masterTemplate?.htmlTemplate || defaultMasterTemplate

  // DEBUG: Log which master template is being used
  console.log("Render Debug - Master Template:", {
    usingCustomTemplate: !!masterTemplate?.htmlTemplate,
    masterTemplateId: masterTemplate?.id,
    masterTemplateName: masterTemplate?.name,
    hasContentBgInTemplate: masterHtml.includes("{{contentBackgroundColor}}"),
    hasBannerFooterInTemplate: masterHtml.includes("{{bannerFooterImageUrl}}"),
    structureOverrides: overrides,
  })

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

    // Structure flags - per-template overrides take precedence over master template
    showLogo: (overrides.showLogo ?? baseStructure.showLogo) && !!logoUrl,
    showAccentStrip: overrides.showAccentStrip ?? baseStructure.showAccentStrip,
    showEnglishSection: overrides.showEnglishSection ?? baseStructure.showEnglishSection,
    showArabicSection: (overrides.showArabicSection ?? baseStructure.showArabicSection) && !!processedArContent,
    showDivider: overrides.showDivider ?? baseStructure.showDivider,
    showFooter: overrides.showFooter ?? baseStructure.showFooter ?? false,
    // Banner footer: structureOverrides > legacy showBannerFooter > master template > default
    showBannerFooter:
      (overrides.showBannerFooter ?? template.showBannerFooter ?? baseStructure.showBannerFooter ?? true) &&
      !!bannerFooterImageUrl,

    // Footer
    bannerFooterImageUrl,
    footerText: resolvedEmailBranding.footerText || `${event.name}`,
  }

  // DEBUG: Log final masterContext values passed to Handlebars
  console.log("Render Debug - Master Context:", {
    contentBackgroundColor: masterContext.contentBackgroundColor,
    bannerFooterImageUrl: masterContext.bannerFooterImageUrl,
    showBannerFooter: masterContext.showBannerFooter,
    showLogo: masterContext.showLogo,
    logoUrl: masterContext.logoUrl,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })

  // 7. Compile and render master template
  const compiledMaster = Handlebars.compile(masterHtml)
  let html = compiledMaster(masterContext)

  // 8. Handle document variables in the rendered HTML
  html = processDocumentVariables(html, documents, guest, event)

  // 8b. Handle image variables in the rendered HTML
  html = processImageVariables(html, documents, guest, event)

  // 9. Handle form link variables in the rendered HTML
  if (formTokens.length > 0) {
    html = processFormLinkVariables(html, formTokens, event)
  }

  // 10. Handle VAPP link variables in the rendered HTML
  html = processVappLinkVariables(html, event, guest)

  // 11. Generate plain text version
  const text = generatePlainText(processedEnContent, processedArContent)

  // 12. Build from address
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
// Image Variable Processing
// ============================================================================

/**
 * Process image variables in rendered HTML.
 * Images are stored as event documents with type="image".
 * Supports patterns:
 * - {{image.UUID|Alt Text}} - image with custom alt text
 * - {{image.UUID}} - image with document name as alt text
 */
function processImageVariables(
  html: string,
  documents: EventDocument[],
  guest: Guest,
  event: Event
): string {
  // Filter to only image type documents visible to this guest's category
  const images = documents.filter(
    (doc) =>
      doc.type === "image" &&
      (!doc.categoryIds ||
        doc.categoryIds.length === 0 ||
        (guest.categoryId && doc.categoryIds.includes(guest.categoryId)))
  )

  let result = html

  for (const img of images) {
    // Use the direct document URL for images
    const imageUrl = img.url

    // Pattern 1: {{image.UUID|Alt Text}} - with custom alt
    const customAltPattern = new RegExp(
      `\\{\\{image\\.${img.id}\\|([^}]+)\\}\\}`,
      "g"
    )
    result = result.replace(customAltPattern, (_, altText) => {
      return `<img src="${imageUrl}" alt="${altText.trim()}" style="max-width: 100%; height: auto; display: block;" />`
    })

    // Pattern 2: {{image.UUID}} - default alt (image name)
    const defaultPattern = new RegExp(`\\{\\{image\\.${img.id}\\}\\}`, "g")
    result = result.replace(
      defaultPattern,
      `<img src="${imageUrl}" alt="${img.name}" style="max-width: 100%; height: auto; display: block;" />`
    )
  }

  // Handle missing/deleted images
  result = result.replace(
    /\{\{image\.[a-f0-9-]+\|[^}]+\}\}/g,
    "[Image unavailable]"
  )
  result = result.replace(/\{\{image\.[a-f0-9-]+\}\}/g, "[Image unavailable]")

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
// VAPP Link Variable Processing
// ============================================================================

/**
 * Process VAPP link variables in rendered HTML.
 * Supports patterns:
 * - {{vappUrl}} - URL only
 * - {{vapp.link|Custom Text}} - link with custom text
 * - {{vapp.link}} - link with default text
 */
function processVappLinkVariables(
  html: string,
  event: Event,
  guest: Guest,
  language: "en" | "ar" = "en"
): string {
  const vappUrl = getVappUrl(event, guest.rsvpToken)
  const defaultText = language === "ar" ? "عرض تصريح الوقوف" : "View Parking Permit"

  let result = html

  // Pattern 1: {{vappUrl}} - URL only
  result = result.replace(/\{\{vappUrl\}\}/g, vappUrl)

  // Pattern 2: {{vapp.link|Custom Text}} - link with custom text
  result = result.replace(/\{\{vapp\.link\|([^}]+)\}\}/g, (_, customText) => {
    return `<a href="${vappUrl}">${customText.trim()}</a>`
  })

  // Pattern 3: {{vapp.link}} - link with default text
  result = result.replace(/\{\{vapp\.link\}\}/g, `<a href="${vappUrl}">${defaultText}</a>`)

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

  // Helper to clean text for plain text output
  const cleanText = (text: string) => stripHtml(stripMarkdown(text))

  // English section
  if (enContent.greeting) {
    lines.push(cleanText(enContent.greeting))
    lines.push("")
  }

  if (enContent.heading) {
    lines.push(cleanText(enContent.heading))
    lines.push("")
  }

  if (enContent.subheading) {
    lines.push(cleanText(enContent.subheading))
    lines.push("")
  }

  for (const paragraph of enContent.bodyParagraphs) {
    lines.push(cleanText(paragraph.content))
    lines.push("")
  }

  if (enContent.cta) {
    lines.push(`${cleanText(enContent.cta.text)}: ${enContent.cta.url}`)
    lines.push("")
  }

  if (enContent.postCtaText) {
    lines.push(cleanText(enContent.postCtaText))
    lines.push("")
  }

  // Arabic section (if present)
  if (arContent) {
    lines.push("---")
    lines.push("")

    if (arContent.greeting) {
      lines.push(cleanText(arContent.greeting))
      lines.push("")
    }

    if (arContent.heading) {
      lines.push(cleanText(arContent.heading))
      lines.push("")
    }

    if (arContent.subheading) {
      lines.push(cleanText(arContent.subheading))
      lines.push("")
    }

    for (const paragraph of arContent.bodyParagraphs) {
      lines.push(cleanText(paragraph.content))
      lines.push("")
    }

    if (arContent.cta) {
      lines.push(`${cleanText(arContent.cta.text)}: ${arContent.cta.url}`)
      lines.push("")
    }

    if (arContent.postCtaText) {
      lines.push(cleanText(arContent.postCtaText))
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
      gender: "male",
      title: "Dr.",
      salutation: "Dr.",
      salutationAr: "السيد",
      email: "john.smith@example.com",
      position: "CEO",
      entity: "Acme Corporation",
      rsvpToken: "preview-token",
      serialNumber: "M21-000001",
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
      settings: {
        vapp: {
          enabled: true,
          venueCode: "KAS",
          matchCode: "M21",
        },
      },
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
