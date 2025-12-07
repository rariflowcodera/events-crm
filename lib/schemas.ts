import { workspaces } from "@/server/db/schemas"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { BUCKET_NAME } from "@/lib/constants"
import { slugRegex } from "@/lib/utils"

// ============================================================================
// Branding Schemas
// ============================================================================

/** Hex color validation */
export const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color format")
  .optional()

/** Branding image URL validation - allows S3, Google, local storage, or empty string */
export const brandingImageSchema = z
  .string()
  .max(2048)
  .refine(
    (url) => {
      // Allow empty string
      if (url === "") return true
      // Allow local storage paths (for development)
      if (url.startsWith("/uploads/") || url.startsWith("/api/file")) return true
      // Allow HTTPS URLs from allowed domains
      if (url.startsWith("https://")) {
        return (
          url.startsWith(`https://${BUCKET_NAME}.s3.amazonaws.com`) ||
          url.startsWith("https://lh3.googleusercontent.com")
        )
      }
      return false
    },
    {
      message: "Image URL must be from S3 bucket, Google user content, or local uploads",
    }
  )
  .optional()

/** Base branding schema (shared fields) */
export const baseBrandingSchema = z.object({
  logo: brandingImageSchema,
  logoDark: brandingImageSchema,
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  primaryColorDark: hexColorSchema,
  accentColorDark: hexColorSchema,
})

export type BaseBrandingInput = z.infer<typeof baseBrandingSchema>

/** Workspace branding schema */
export const workspaceBrandingSchema = baseBrandingSchema

export type WorkspaceBrandingInput = z.infer<typeof workspaceBrandingSchema>

/** Event branding schema (extends base with event-specific fields) */
export const eventBrandingSchema = baseBrandingSchema.extend({
  secondaryColor: hexColorSchema,
  secondaryColorDark: hexColorSchema,
  backgroundImage: brandingImageSchema,
})

export type EventBrandingInput = z.infer<typeof eventBrandingSchema>

/** Update workspace branding schema */
export const updateWorkspaceBrandingSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  branding: workspaceBrandingSchema,
})

export type UpdateWorkspaceBrandingInput = z.infer<typeof updateWorkspaceBrandingSchema>

/** Update event branding schema (null = reset to workspace defaults) */
export const updateEventBrandingSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  branding: eventBrandingSchema.nullable(),
})

export type UpdateEventBrandingInput = z.infer<typeof updateEventBrandingSchema>

// Base schema for string validations with common options
const baseStringSchema = ({
  minChar = 1,
  maxChar = 25,
  required_error = "Field is required",
}: {
  minChar?: number
  maxChar?: number
  required_error?: string
}) =>
  z
    .string({ required_error })
    .min(minChar, { message: `Must be at least ${minChar} characters` })
    .max(maxChar, { message: `Must be at most ${maxChar} characters` })

export const userIdSchema = z
  .string()
  .length(32, { message: "User ID must be 32 characters long" })
  .regex(/^[A-Za-z0-9]+$/, { message: "User ID must be alphanumeric" })

const s3ImageSchema = z
  .string()
  .url()
  .max(2048)
  .refine((url) => url.startsWith("https://"), {
    message: "Image URL must use HTTPS",
  })
  .refine(
    (url) => {
      // Allow either S3 bucket or Google user content URLs
      return (
        url.startsWith(`https://${BUCKET_NAME}.s3.amazonaws.com`) ||
        url.startsWith("https://lh3.googleusercontent.com")
      )
    },
    {
      message: "Image URL must be from either Tsker S3 bucket or Google user content",
    }
  )
  .refine(
    (url) => {
      if (url.startsWith(`https://${BUCKET_NAME}.s3.amazonaws.com`)) {
        const s3Pattern =
          /^https:\/\/tsker\.s3\.amazonaws\.com\/[A-Za-z0-9]{32}\/[a-f0-9]{32}\.(jpg|jpeg|png|gif|webp)$/i
        return s3Pattern.test(url)
      }
      // Google user content URLs pattern
      const googlePattern = /^https:\/\/lh3\.googleusercontent\.com\/.+$/
      return googlePattern.test(url)
    },
    {
      message: "Invalid image URL format",
    }
  )
  .or(z.literal(""))
  .optional()

const usernameSchema = z
  .string()
  .min(1, { message: "Username must be at least 3 characters" })
  .max(20, { message: "Username cannot exceed 20 characters" })
  .regex(/^[a-zA-Z0-9_.\- ]+$/, {
    message: "Username can only contain letters, numbers, underscores, dots, hyphens, and spaces",
  })
  .refine(
    (username) =>
      !username.startsWith(".") &&
      !username.endsWith(".") &&
      !username.startsWith("-") &&
      !username.endsWith("-") &&
      !username.startsWith("_") &&
      !username.endsWith("_"),
    {
      message: "Username cannot start or end with a period, hyphen, or underscore",
    }
  )
  .refine(
    (name) => {
      // Allow letters (both cases), spaces, hyphens, apostrophes
      // Support international characters
      return /^[\p{L}\p{M}' \-]+$/u.test(name)
    },
    {
      message: "Name should only contain letters, spaces, hyphens, and apostrophes",
    }
  )
  .refine(
    (username) => {
      // List of reserved usernames to prevent
      const reserved = [
        "admin",
        "administrator",
        "system",
        "moderator",
        "mod",
        "help",
        "support",
        "staff",
        "root",
        "webmaster",
        "security",
        "info",
        "contact",
        "abuse",
        "postmaster",
      ]
      return !reserved.includes(username)
    },
    {
      message: "This username is reserved and cannot be used",
    }
  )
  .transform((name) =>
    // Trim whitespace but preserve original case
    name.trim().replace(/\s+/g, " ")
  )

export const slugSchema = baseStringSchema({
  minChar: 3,
  maxChar: 32,
  required_error: "Slug is required",
}).regex(slugRegex, {
  message: "Slug must be lowercase, contain no spaces or special characters (except '-')",
})

export const userSchema = z.object({
  id: userIdSchema,
  name: usernameSchema,
  lastName: usernameSchema.optional(),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(3, { message: "Email must be at least 3 characters" })
    .email("Invalid email address")
    .toLowerCase(),
  image: s3ImageSchema,
})

const nameRegex = /^[a-zA-Z0-9\s]+$/

export const workspaceSchema = createInsertSchema(workspaces, {
  id: z.string().uuid({ message: "Invalid workspace ID" }).optional(),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(32, { message: "Name must be at most 32 characters" })
    .regex(nameRegex, { message: "Name can only contain letters and numbers" }),
  slug: slugSchema,
  logo: s3ImageSchema,
  ownerId: z.string().uuid({ message: "Invalid owner ID" }).optional(),
})

export const createWorkspaceSchema = workspaceSchema.pick({
  name: true,
  slug: true,
  logo: true,
})

export const deleteWorkspaceSchema = workspaceSchema.pick({
  id: true,
})

export const updateWorkspaceSchema = workspaceSchema.pick({
  name: true,
  slug: true,
  id: true,
})

export const invitationSchema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }),
  token: z.string().optional(),
  expiresAt: z.date().optional(),
  workspaceId: z.string().uuid({ message: "Invalid workspace ID" }),
  invitedBy: z.string().min(1, { message: "Invited by is required" }),
  invitedByProfileImage: z.string().nullable().optional(), // Allow null values
  role: z.enum(["member", "admin"]),
})

export const idSchema = ({ uuidMessage }: { uuidMessage?: string }) =>
  z
    .string({
      required_error: "ID is required",
      invalid_type_error: "ID must be a string",
    })
    .uuid({ message: uuidMessage ?? "Invalid ID format: must be a valid UUID" })
    .refine(
      (id) => {
        // Additional security checks
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return uuidV4Regex.test(id)
      },
      { message: "Invalid ID: must be a valid UUID v4" }
    )
    .refine(
      (id) => {
        // Prevent specific patterns or known bad IDs
        const blacklist = [
          "00000000-0000-0000-0000-000000000000",
          "11111111-1111-1111-1111-111111111111",
        ]
        return !blacklist.includes(id)
      },
      { message: "Invalid ID: this ID is not allowed" }
    )

export const bulkInvitationSchema = z.object({
  emails: z.array(z.string().email("Please enter a valid email address")),
})

// ============================================================================
// Email Template Schemas
// ============================================================================

export const emailTemplateTypeValues = [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "update",
  "cancellation",
  "custom",
] as const

export type EmailTemplateType = (typeof emailTemplateTypeValues)[number]

// Content schema for a single language
const emailTemplateLanguageContentSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be 200 characters or less"),
  htmlContent: z
    .string()
    .min(1, "HTML content is required")
    .max(100000, "HTML content exceeds maximum length"),
  textContent: z.string().max(50000, "Text content exceeds maximum length").optional(),
})

// Bilingual content schema
export const bilingualEmailContentSchema = z.object({
  en: emailTemplateLanguageContentSchema,
  ar: z
    .object({
      subject: z.string().max(200).optional(),
      htmlContent: z.string().max(100000).optional(),
      textContent: z.string().max(50000).optional(),
    })
    .optional(),
})

export type BilingualEmailContentInput = z.infer<typeof bilingualEmailContentSchema>

// Create email template schema
export const createEmailTemplateSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  name: z.string().min(1, "Template name is required").max(100, "Template name must be 100 characters or less"),
  type: z.enum(emailTemplateTypeValues, { required_error: "Template type is required" }),
  categoryId: z.string().uuid().nullable().optional(),
  content: bilingualEmailContentSchema,
  defaultLanguage: z.enum(["en", "ar"]).default("en"),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  replyTo: z.string().email("Invalid email address").optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
})

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>

// Update email template schema
export const updateEmailTemplateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(emailTemplateTypeValues).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  content: bilingualEmailContentSchema.optional(),
  defaultLanguage: z.enum(["en", "ar"]).optional(),
  fromName: z.string().max(100).nullable().optional(),
  fromEmail: z.string().email().nullable().optional().or(z.literal("")),
  replyTo: z.string().email().nullable().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>

// ============================================================================
// RSVP Form Builder Schemas
// ============================================================================

/** Bilingual text content */
export const bilingualTextSchema = z.object({
  en: z.string().min(1, "English text is required"),
  ar: z.string().optional(),
})

/** Field validation rules */
export const fieldValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})

/** Conditional visibility configuration */
export const fieldConditionalSchema = z.object({
  fieldKey: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "not_empty"]).optional(),
  value: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
})

/** Custom field types */
export const customFieldTypeValues = [
  "text",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "number",
  "email",
  "phone",
] as const

export type CustomFieldType = (typeof customFieldTypeValues)[number]

/** Field option for select/radio/checkbox */
export const fieldOptionSchema = z.object({
  value: z.string().min(1),
  label: bilingualTextSchema,
})

/** Custom field definition */
export const customFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(customFieldTypeValues),
  label: bilingualTextSchema,
  description: bilingualTextSchema.optional(),
  placeholder: bilingualTextSchema.optional(),
  required: z.boolean().default(false),
  visibleToCategories: z.array(z.string().uuid()).optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: fieldValidationSchema.optional(),
  conditionalOn: fieldConditionalSchema.optional(),
  sortOrder: z.number().int().min(0),
})

export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>

/** Standard field configuration */
export const standardFieldConfigSchema = z.object({
  fieldKey: z.string().min(1),
  enabled: z.boolean(),
  required: z.boolean(),
  visibleToCategories: z.array(z.string().uuid()).optional(),
  labelOverride: bilingualTextSchema.optional(),
})

export type StandardFieldConfigInput = z.infer<typeof standardFieldConfigSchema>

/** Section IDs */
export const sectionIdValues = ["personal_info", "logistics", "experience", "important_to_know"] as const
export type RsvpFormSectionId = (typeof sectionIdValues)[number]

/** Form section configuration */
export const rsvpFormSectionSchema = z.object({
  id: z.enum(sectionIdValues),
  title: bilingualTextSchema,
  description: bilingualTextSchema.optional(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
  standardFields: z.array(standardFieldConfigSchema),
  customFields: z.array(customFieldDefinitionSchema),
})

export type RsvpFormSectionInput = z.infer<typeof rsvpFormSectionSchema>

/** Form settings */
export const rsvpFormSettingsSchema = z.object({
  allowAmendments: z.boolean().default(true),
  showProgressIndicator: z.boolean().default(true),
  confirmationMessage: bilingualTextSchema.optional(),
  declineMessage: bilingualTextSchema.optional(),
  maybeMessage: bilingualTextSchema.optional(),
  submitButtonText: bilingualTextSchema.optional(),
  // RSVP question customization
  rsvpQuestionLabel: bilingualTextSchema.optional(),
  confirmOptionLabel: bilingualTextSchema.optional(),
  declineOptionLabel: bilingualTextSchema.optional(),
  maybeOptionLabel: bilingualTextSchema.optional(),
  showMaybeOption: z.boolean().optional(),
})

export type RsvpFormSettingsInput = z.infer<typeof rsvpFormSettingsSchema>

/** Complete form configuration */
export const rsvpFormConfigSchema = z.object({
  sections: z.array(rsvpFormSectionSchema),
  settings: rsvpFormSettingsSchema,
})

export type RsvpFormConfigInput = z.infer<typeof rsvpFormConfigSchema>

/** Template categories */
export const rsvpFormTemplateCategoryValues = [
  "corporate",
  "conference",
  "gala",
  "sports",
  "government",
  "wedding",
  "custom",
] as const

export type RsvpFormTemplateCategory = (typeof rsvpFormTemplateCategoryValues)[number]

/** Create RSVP form template schema */
export const createRsvpFormTemplateSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  name: z.string().min(1, "Template name is required").max(100, "Template name must be 100 characters or less"),
  description: z.string().max(500).optional(),
  config: rsvpFormConfigSchema,
  category: z.enum(rsvpFormTemplateCategoryValues).optional(),
})

export type CreateRsvpFormTemplateInput = z.infer<typeof createRsvpFormTemplateSchema>

/** Update RSVP form template schema */
export const updateRsvpFormTemplateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  config: rsvpFormConfigSchema.optional(),
  category: z.enum(rsvpFormTemplateCategoryValues).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateRsvpFormTemplateInput = z.infer<typeof updateRsvpFormTemplateSchema>

/** Update event form config schema */
export const updateEventRsvpFormConfigSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  config: rsvpFormConfigSchema,
})

export type UpdateEventRsvpFormConfigInput = z.infer<typeof updateEventRsvpFormConfigSchema>

// ============================================================================
// RSVP Response Schemas (for form submission)
// ============================================================================

/** Dietary type values */
export const dietaryTypeValues = [
  "none",
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
  "gluten_free",
  "other",
] as const

export type DietaryType = (typeof dietaryTypeValues)[number]

/** Accessibility type values */
export const accessibilityTypeValues = [
  "none",
  "wheelchair",
  "hearing",
  "visual",
  "mobility",
  "other",
] as const

export type AccessibilityType = (typeof accessibilityTypeValues)[number]

/** RSVP submission schema */
export const rsvpSubmissionSchema = z.object({
  responseStatus: z.enum(["confirmed", "declined", "maybe"]),

  // Personal Info
  preferredLanguage: z.enum(["en", "ar"]).optional(),

  // Logistics
  arrivalDate: z.coerce.date().optional(),
  departureDate: z.coerce.date().optional(),
  arrivalFlight: z.string().max(20).optional(),
  departureFlight: z.string().max(20).optional(),
  hotelRequired: z.boolean().optional(),
  hotelCheckin: z.coerce.date().optional(),
  hotelCheckout: z.coerce.date().optional(),
  transportRequired: z.boolean().optional(),

  // Important to Know
  dietaryType: z.enum(dietaryTypeValues).optional(),
  dietaryDetails: z.string().max(500).optional(),
  accessibilityType: z.enum(accessibilityTypeValues).optional(),
  accessibilityDetails: z.string().max(500).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),

  // Experience
  sessionsInterested: z.array(z.string()).optional(),

  // Companion
  companionInfo: z
    .object({
      bringing: z.boolean(),
      count: z.number().int().min(1).max(10).optional(),
      names: z.array(z.string()).optional(),
      details: z
        .array(
          z.object({
            name: z.string(),
            dietary: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),

  // Custom responses (for custom fields)
  customResponses: z.record(z.unknown()).optional(),
})

export type RsvpSubmissionInput = z.infer<typeof rsvpSubmissionSchema>
