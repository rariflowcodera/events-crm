/**
 * Event Duplication Helper Functions
 *
 * This module provides utilities for safely duplicating events with all their
 * related entities while maintaining referential integrity through ID remapping.
 */

import { db } from "@/server/db/config/database"
import { events } from "@/server/db/schemas"
import { eq, and, like } from "drizzle-orm"

// ============================================================================
// Types
// ============================================================================

/**
 * Mapping of old IDs to new IDs for maintaining referential integrity
 */
export interface DuplicationMapping {
  categoryIdMap: Map<string, string>
  emailTemplateIdMap: Map<string, string>
  documentIdMap: Map<string, string>
  inventoryTypeIdMap: Map<string, string>
  itineraryTemplateIdMap: Map<string, string>
  workflowIdMap: Map<string, string>
  masterTemplateIdMap: Map<string, string>
}

/**
 * Statistics returned after duplication
 */
export interface DuplicationStats {
  categoriesCopied: number
  emailTemplatesCopied: number
  guestListViewsCopied: number
  eventFormsCopied: number
  documentsCopied: number
  itineraryTemplatesCopied: number
  itineraryItemsCopied: number
  inventoryTypesCopied: number
  workflowsCopied: number
  workflowStepsCopied: number
  masterTemplatesCopied: number
}

/**
 * Options for event duplication
 */
export interface DuplicationOptions {
  includeCategories: boolean
  includeEmailTemplates: boolean
  includeGuestListViews: boolean
  includeEventForms: boolean
  includeDocuments: boolean
  includeItineraries: boolean
  includeInventoryTypes: boolean
  includeWorkflows: boolean
  includeMasterTemplates: boolean
}

/**
 * Default duplication options - all included by default
 */
export const DEFAULT_DUPLICATION_OPTIONS: DuplicationOptions = {
  includeCategories: true,
  includeEmailTemplates: true,
  includeGuestListViews: true,
  includeEventForms: true,
  includeDocuments: true,
  includeItineraries: true,
  includeInventoryTypes: true,
  includeWorkflows: true,
  includeMasterTemplates: true,
}

// ============================================================================
// ID Mapping Helpers
// ============================================================================

/**
 * Creates an empty duplication mapping
 */
export function createEmptyMapping(): DuplicationMapping {
  return {
    categoryIdMap: new Map(),
    emailTemplateIdMap: new Map(),
    documentIdMap: new Map(),
    inventoryTypeIdMap: new Map(),
    itineraryTemplateIdMap: new Map(),
    workflowIdMap: new Map(),
    masterTemplateIdMap: new Map(),
  }
}

/**
 * Creates empty duplication stats
 */
export function createEmptyStats(): DuplicationStats {
  return {
    categoriesCopied: 0,
    emailTemplatesCopied: 0,
    guestListViewsCopied: 0,
    eventFormsCopied: 0,
    documentsCopied: 0,
    itineraryTemplatesCopied: 0,
    itineraryItemsCopied: 0,
    inventoryTypesCopied: 0,
    workflowsCopied: 0,
    workflowStepsCopied: 0,
    masterTemplatesCopied: 0,
  }
}

/**
 * Remaps a single category ID using the mapping
 * Returns null if the original ID is null/undefined or not found in mapping
 */
export function remapCategoryId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.categoryIdMap.get(oldId) ?? null
}

/**
 * Remaps an array of category IDs using the mapping
 * Filters out any IDs that aren't in the mapping
 */
export function remapCategoryIds(
  oldIds: string[] | null | undefined,
  mapping: DuplicationMapping
): string[] | null {
  if (!oldIds || oldIds.length === 0) return null

  const newIds = oldIds
    .map((id) => mapping.categoryIdMap.get(id))
    .filter((id): id is string => id !== undefined)

  return newIds.length > 0 ? newIds : null
}

/**
 * Remaps a template ID using the mapping
 */
export function remapTemplateId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.emailTemplateIdMap.get(oldId) ?? null
}

/**
 * Remaps an inventory type ID using the mapping
 */
export function remapInventoryTypeId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.inventoryTypeIdMap.get(oldId) ?? null
}

/**
 * Remaps an itinerary template ID using the mapping
 */
export function remapItineraryTemplateId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.itineraryTemplateIdMap.get(oldId) ?? null
}

/**
 * Remaps a workflow ID using the mapping
 */
export function remapWorkflowId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.workflowIdMap.get(oldId) ?? null
}

/**
 * Remaps a master template ID using the mapping
 */
export function remapMasterTemplateId(
  oldId: string | null | undefined,
  mapping: DuplicationMapping
): string | null {
  if (!oldId) return null
  return mapping.masterTemplateIdMap.get(oldId) ?? null
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generates a unique event slug by appending a counter if needed
 *
 * Original: annual-gala-2024
 * First copy: annual-gala-2024-copy
 * Second copy: annual-gala-2024-copy-2
 */
export async function generateUniqueEventSlug(
  workspaceId: string,
  baseSlug: string
): Promise<string> {
  // First, try the base slug with "-copy" suffix
  const copySlug = `${baseSlug}-copy`

  // Check if the copy slug already exists
  const existingWithCopy = await db.query.events.findFirst({
    where: and(
      eq(events.workspaceId, workspaceId),
      eq(events.slug, copySlug)
    ),
  })

  if (!existingWithCopy) {
    return copySlug
  }

  // Find all existing slugs that match the pattern "baseSlug-copy-N"
  const existingEvents = await db.query.events.findMany({
    where: and(
      eq(events.workspaceId, workspaceId),
      like(events.slug, `${baseSlug}-copy%`)
    ),
    columns: { slug: true },
  })

  // Extract numbers from existing slugs
  const numbers = existingEvents
    .map((e) => {
      const match = e.slug.match(new RegExp(`^${escapeRegex(baseSlug)}-copy(?:-(\\d+))?$`))
      if (match) {
        return match[1] ? parseInt(match[1], 10) : 1
      }
      return 0
    })
    .filter((n) => n > 0)

  // Find the next available number
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1
  const nextNumber = maxNumber + 1

  return `${baseSlug}-copy-${nextNumber}`
}

/**
 * Generates a unique form slug for the new event
 * @param eventId - The new event ID
 * @param baseSlug - The original slug to base the new one on
 * @param queryClient - A database client that supports query operations (can be db or transaction)
 */
export async function generateUniqueFormSlug(
  eventId: string,
  baseSlug: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryClient: { query: { eventForms: { findFirst: (args: any) => Promise<any> } } }
): Promise<string> {
  // Import here to avoid circular dependency
  const { eventForms } = await import("@/server/db/schemas")
  const { and, eq } = await import("drizzle-orm")

  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await queryClient.query.eventForms.findFirst({
      where: and(
        eq(eventForms.eventId, eventId),
        eq(eventForms.slug, slug)
      ),
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++

    // Safety limit
    if (counter > 100) {
      return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
    }
  }
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ============================================================================
// JSON Field Remapping Helpers
// ============================================================================

/**
 * Remaps category IDs within a guest list view config
 * Preserves the original type structure for Drizzle compatibility
 */
export function remapGuestListViewConfig<T extends {
  columns: unknown[]
  filters: {
    status?: string[]
    categoryIds?: string[]
    countries?: string[]
    search?: string
    tags?: string[]
  }
  sorting: unknown[]
}>(
  config: T,
  mapping: DuplicationMapping
): T {
  return {
    ...config,
    filters: {
      ...config.filters,
      categoryIds: remapCategoryIds(config.filters.categoryIds, mapping) ?? undefined,
    },
  } as T
}

/**
 * Remaps category IDs within workflow trigger conditions
 * Preserves the original type structure for Drizzle compatibility
 */
export function remapWorkflowTriggerConditions<T extends {
  categoryIds?: string[]
  guestStatuses?: string[]
  customConditions?: Array<{
    field: string
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than"
    value: unknown
  }>
} | null | undefined>(
  conditions: T,
  mapping: DuplicationMapping
): T {
  if (!conditions) return conditions

  return {
    ...conditions,
    categoryIds: remapCategoryIds(conditions.categoryIds, mapping) ?? undefined,
  } as T
}

/**
 * Remaps IDs within workflow step action config
 */
export function remapWorkflowStepActionConfig(
  config: {
    templateId?: string
    categoryId?: string
    inventoryTypeId?: string
    [key: string]: unknown
  } | null | undefined,
  mapping: DuplicationMapping
): typeof config {
  if (!config) return null

  return {
    ...config,
    templateId: config.templateId
      ? (mapping.emailTemplateIdMap.get(config.templateId) ?? config.templateId)
      : undefined,
    categoryId: config.categoryId
      ? (mapping.categoryIdMap.get(config.categoryId) ?? config.categoryId)
      : undefined,
    inventoryTypeId: config.inventoryTypeId
      ? (mapping.inventoryTypeIdMap.get(config.inventoryTypeId) ?? config.inventoryTypeId)
      : undefined,
  }
}

// ============================================================================
// Dependency Validation
// ============================================================================

/**
 * Determines which options must be enabled based on dependencies
 *
 * Categories must be included if any of these are included:
 * - Email Templates (reference categoryId)
 * - Guest List Views (reference categoryIds in filters)
 * - Event Forms (reference visibleToCategories)
 * - Documents (reference categoryIds)
 * - Itinerary Items (reference visibleToCategories)
 * - Workflows (reference categoryIds in trigger conditions)
 */
export function enforceDependencies(options: DuplicationOptions): DuplicationOptions {
  const requiresCategories =
    options.includeEmailTemplates ||
    options.includeGuestListViews ||
    options.includeEventForms ||
    options.includeDocuments ||
    options.includeItineraries ||
    options.includeWorkflows

  return {
    ...options,
    includeCategories: options.includeCategories || requiresCategories,
  }
}

/**
 * Gets a list of entities that depend on categories
 */
export function getCategoryDependentEntities(options: DuplicationOptions): string[] {
  const dependents: string[] = []

  if (options.includeEmailTemplates) dependents.push("Email Templates")
  if (options.includeGuestListViews) dependents.push("Guest List Views")
  if (options.includeEventForms) dependents.push("Event Forms")
  if (options.includeDocuments) dependents.push("Documents")
  if (options.includeItineraries) dependents.push("Itineraries")
  if (options.includeWorkflows) dependents.push("Workflows")

  return dependents
}

// ============================================================================
// Document Reference Remapping
// ============================================================================

/**
 * Remaps document IDs in a string by replacing old document IDs with new ones.
 *
 * Handles three placeholder patterns:
 * - {{documentUrl.UUID}} - URL only
 * - {{document.UUID|Custom Text}} - Link with custom text
 * - {{document.UUID}} - Link with document name
 */
function remapDocumentIdsInString(
  text: string,
  mapping: DuplicationMapping
): string {
  if (!text || mapping.documentIdMap.size === 0) return text

  let result = text

  // Process each document ID mapping
  for (const [oldId, newId] of mapping.documentIdMap) {
    // Pattern 1: {{documentUrl.UUID}}
    result = result.replace(
      new RegExp(`\\{\\{documentUrl\\.${escapeRegex(oldId)}\\}\\}`, 'g'),
      `{{documentUrl.${newId}}}`
    )

    // Pattern 2: {{document.UUID|Custom Text}}
    result = result.replace(
      new RegExp(`\\{\\{document\\.${escapeRegex(oldId)}\\|([^}]+)\\}\\}`, 'g'),
      `{{document.${newId}|$1}}`
    )

    // Pattern 3: {{document.UUID}}
    result = result.replace(
      new RegExp(`\\{\\{document\\.${escapeRegex(oldId)}\\}\\}`, 'g'),
      `{{document.${newId}}}`
    )
  }

  return result
}

/**
 * Body paragraph type with optional alignment and size
 */
type BodyParagraph = {
  content: string
  alignment?: "left" | "center" | "right"
  size?: "small" | "normal" | "large"
}

/**
 * Remaps document references in structured email content.
 * Processes all string fields that may contain document placeholders.
 */
export function remapDocumentReferences<T extends {
  en: {
    subject: string
    greeting?: string
    heading?: string
    subheading?: string
    bodyParagraphs: BodyParagraph[]
    cta?: { text: string; url: string }
    postCtaText?: string
    htmlOverride?: string
  }
  ar?: Partial<{
    subject: string
    greeting?: string
    heading?: string
    subheading?: string
    bodyParagraphs: BodyParagraph[]
    cta?: { text: string; url: string }
    postCtaText?: string
    htmlOverride?: string
  }>
} | null | undefined>(
  structuredContent: T,
  mapping: DuplicationMapping
): T {
  if (!structuredContent || mapping.documentIdMap.size === 0) {
    return structuredContent
  }

  // Helper to process a language section
  const processSection = <S extends {
    subject?: string
    greeting?: string
    heading?: string
    subheading?: string
    bodyParagraphs?: BodyParagraph[]
    cta?: { text: string; url: string }
    postCtaText?: string
    htmlOverride?: string
  }>(section: S): S => {
    if (!section) return section

    return {
      ...section,
      subject: section.subject ? remapDocumentIdsInString(section.subject, mapping) : section.subject,
      greeting: section.greeting ? remapDocumentIdsInString(section.greeting, mapping) : section.greeting,
      heading: section.heading ? remapDocumentIdsInString(section.heading, mapping) : section.heading,
      subheading: section.subheading ? remapDocumentIdsInString(section.subheading, mapping) : section.subheading,
      bodyParagraphs: section.bodyParagraphs?.map(p => ({
        ...p,
        content: remapDocumentIdsInString(p.content, mapping),
      })),
      cta: section.cta ? {
        text: remapDocumentIdsInString(section.cta.text, mapping),
        url: remapDocumentIdsInString(section.cta.url, mapping),
      } : section.cta,
      postCtaText: section.postCtaText ? remapDocumentIdsInString(section.postCtaText, mapping) : section.postCtaText,
      htmlOverride: section.htmlOverride ? remapDocumentIdsInString(section.htmlOverride, mapping) : section.htmlOverride,
    } as S
  }

  return {
    ...structuredContent,
    en: processSection(structuredContent.en),
    ar: structuredContent.ar ? processSection(structuredContent.ar) : structuredContent.ar,
  } as T
}
