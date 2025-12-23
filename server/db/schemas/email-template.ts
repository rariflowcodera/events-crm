import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { guestCategories } from "./guest-category"
import { users } from "./user"
import { emailMasterTemplates } from "./email-master-template"

export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "maybe_acknowledgment",
  "update",
  "cancellation",
  "custom",
])

// Bilingual content structure for email templates (legacy HTML mode)
export type EmailTemplateLanguageContent = {
  subject: string
  htmlContent: string
  textContent?: string
}

export type BilingualEmailContent = {
  en: EmailTemplateLanguageContent
  ar?: Partial<EmailTemplateLanguageContent>
}

// ============================================================================
// Structured Content Types (new mode)
// ============================================================================

export type StructuredEmailContent = {
  subject: string
  greeting?: string // "Dear {{guest.fullName}},"
  heading: string // "You Are Cordially Invited"
  subheading?: string // Event name or tagline
  bodyParagraphs: string[] // Array of paragraphs
  cta?: {
    text: string // "Confirm Your Attendance"
    url: string // "{{rsvp.link}}"
  }
  postCtaText?: string // Optional text after CTA
  htmlOverride?: string // Full HTML override for backwards compat
}

export type BilingualStructuredContent = {
  en: StructuredEmailContent
  ar?: Partial<StructuredEmailContent>
}

export const emailTemplates = pgTable(
  "email_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    type: emailTemplateTypeEnum("type").notNull(),

    categoryId: text("category_id").references(() => guestCategories.id, {
      onDelete: "set null",
    }),

    // Bilingual content stored as JSON (legacy HTML mode)
    content: jsonb("content").$type<BilingualEmailContent>().notNull(),

    // Structured content (new mode - optional, takes precedence if set)
    structuredContent: jsonb("structured_content").$type<BilingualStructuredContent>(),

    // Reference to master template (optional - uses workspace default if not set)
    masterTemplateId: text("master_template_id").references(
      () => emailMasterTemplates.id,
      { onDelete: "set null" }
    ),

    // Per-template toggle for banner footer image (overrides master template setting)
    showBannerFooter: boolean("show_banner_footer").default(true),

    // Default language for this template
    defaultLanguage: text("default_language").notNull().default("en"),

    fromName: text("from_name"),
    fromEmail: text("from_email"),
    replyTo: text("reply_to"),

    attachments: jsonb("attachments").$type<
      Array<{
        name: string
        url: string
        type: string
      }>
    >(),

    availableVariables: jsonb("available_variables").$type<string[]>(),

    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("email_template_event_idx").on(table.eventId),
    index("email_template_type_idx").on(table.eventId, table.type),
  ]
)

export const emailTemplatesRelations = relations(
  emailTemplates,
  ({ one }) => ({
    event: one(events, {
      fields: [emailTemplates.eventId],
      references: [events.id],
    }),
    category: one(guestCategories, {
      fields: [emailTemplates.categoryId],
      references: [guestCategories.id],
    }),
    masterTemplate: one(emailMasterTemplates, {
      fields: [emailTemplates.masterTemplateId],
      references: [emailMasterTemplates.id],
    }),
    creator: one(users, {
      fields: [emailTemplates.createdBy],
      references: [users.id],
    }),
  })
)
