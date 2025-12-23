import { invitations, users, workspaceMembers, events } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"

// ============================================================================
// Email Branding Config Type
// ============================================================================

export type EmailBrandingConfig = {
  // Colors (defaults from visual branding if not set)
  accentStripColor?: string // Top accent strip (default: accentColor)
  headingColor?: string // h1/h2 headings (default: primaryColor)
  bodyTextColor?: string // Body text (default: #374151)
  ctaButtonColor?: string // CTA button bg (default: accentColor)
  ctaButtonTextColor?: string // CTA button text (default: #ffffff)
  contentBackgroundColor?: string // Content area background (default: #ffffff)

  // Typography
  fontFamily?: "noto-sans" | "inter" | "arial" | "georgia" | "system"
  arabicFontFamily?: "noto-sans" | "din-next" | "geeza" | "tahoma" | "system"

  // Layout
  accentStripHeight?: "thin" | "medium" | "thick" // 3px, 6px, 10px
  ctaButtonStyle?: "rounded" | "pill" | "square"

  // Footer
  footerText?: string
  bannerFooterImage?: string // URL for optional banner image above footer text
}

// ============================================================================
// Workspace Branding Type
// ============================================================================

export type WorkspaceBranding = {
  logo?: string // Light mode logo URL
  logoDark?: string // Dark mode logo URL
  primaryColor?: string // Primary brand color (hex)
  accentColor?: string // Accent color (hex)
  primaryColorDark?: string // Dark mode primary color
  accentColorDark?: string // Dark mode accent color
  emailBranding?: EmailBrandingConfig // Email-specific branding
}

// ============================================================================
// Workspace Email Settings Type
// ============================================================================

export type WorkspaceEmailSettings = {
  fromEmail?: string // Sender email address (e.g., "invitations@company.com")
  fromName?: string // Sender display name (e.g., "Company Events Team")
}

// ============================================================================
// Workspace Navigation Settings Type
// ============================================================================

export type NavigationSettings = {
  eventNav?: {
    overview?: string[] // Roles that can see this item (e.g., ["owner", "admin", "manager", "member"])
    guests?: string[]
    categories?: string[]
    forms?: string[]
    branding?: string[]
    emails?: string[]
    reports?: string[]
    settings?: string[]
  }
  workspaceNav?: {
    dashboard?: string[]
    docs?: string[]
    settings?: string[]
  }
}

export const workspaces = pgTable(
  "workspace",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    phone: text("phone"),
    logo: text("logo"),

    branding: json("branding").$type<WorkspaceBranding>(),
    emailSettings: json("email_settings").$type<WorkspaceEmailSettings>(),
    navigationSettings: json("navigation_settings").$type<NavigationSettings>(),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("workspace_slug_idx").on(table.slug),
    index("workspace_owner_idx").on(table.ownerId),
    index("workspace_created_at_idx").on(table.createdAt),
  ]
)

export const workspaceRelations = relations(workspaces, ({ many, one }) => ({
  creator: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  invitations: many(invitations),
  events: many(events),
}))
