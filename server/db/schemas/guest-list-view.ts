import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { users } from "./user"

// ============================================================================
// View Color Options
// ============================================================================

export const VIEW_COLORS = {
  gray: { label: "Default", labelAr: "افتراضي", dot: "bg-gray-400" },
  blue: { label: "Operational", labelAr: "تشغيلي", dot: "bg-blue-500" },
  green: { label: "Management", labelAr: "إداري", dot: "bg-green-500" },
  orange: { label: "On-site", labelAr: "في الموقع", dot: "bg-orange-500" },
  purple: { label: "VIP", labelAr: "كبار الشخصيات", dot: "bg-purple-500" },
  red: { label: "Priority", labelAr: "أولوية", dot: "bg-red-500" },
} as const

export type ViewColor = keyof typeof VIEW_COLORS

// ============================================================================
// View Configuration Types
// ============================================================================

export type GuestListViewColumnConfig = {
  id: string // Column identifier (e.g., "firstName", "email", "status")
  visible: boolean // Whether column is visible
  width?: number // Column width in pixels (optional)
}

export type GuestListViewFilterConfig = {
  status?: string[] // Status filter values
  categoryIds?: string[] // Category filter values
  countries?: string[] // Country filter values
  search?: string // Search query
  tags?: string[] // Tag filters
  lastEmailTemplateNames?: string[] // Last email template name filter values
}

export type GuestListViewSortConfig = {
  column: string // Column to sort by
  direction: "asc" | "desc" // Sort direction
}

export type GuestListViewConfig = {
  columns: GuestListViewColumnConfig[] // Column configuration array (order determines display order)
  filters: GuestListViewFilterConfig // Active filters
  sorting: GuestListViewSortConfig[] // Multi-column sorting support
}

// ============================================================================
// Guest List Views Table
// ============================================================================

export const guestListViews = pgTable(
  "guest_list_view",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    // View configuration stored as JSON
    config: json("config").$type<GuestListViewConfig>().notNull(),

    // Role visibility - which roles can see this view in their sidebar
    visibleToRoles: json("visible_to_roles")
      .$type<string[]>()
      .default(["owner", "admin", "manager", "member"])
      .notNull(),

    // Color for visual categorization
    color: text("color").$type<ViewColor>().default("gray").notNull(),

    // Sidebar pinning
    isPinned: boolean("is_pinned").default(false).notNull(),
    pinOrder: integer("pin_order"),

    // System view flag (for default views that can't be deleted)
    isSystem: boolean("is_system").default(false).notNull(),

    // Default view flag (only ONE view per event can be default)
    isDefault: boolean("is_default").default(false).notNull(),

    // Audit
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_list_view_event_idx").on(table.eventId),
    index("guest_list_view_pinned_idx").on(
      table.eventId,
      table.isPinned,
      table.pinOrder
    ),
    index("guest_list_view_default_idx").on(table.eventId, table.isDefault),
  ]
)

export const guestListViewsRelations = relations(guestListViews, ({ one }) => ({
  event: one(events, {
    fields: [guestListViews.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [guestListViews.createdBy],
    references: [users.id],
    relationName: "viewCreator",
  }),
  updater: one(users, {
    fields: [guestListViews.updatedBy],
    references: [users.id],
    relationName: "viewUpdater",
  }),
}))
