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

export const guestCategories = pgTable(
  "guest_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    color: text("color").default("#6366f1"),

    serviceAllocations: json("service_allocations").$type<{
      hotelStars?: number
      roomType?: string
      transportType?: string
      airportPickup?: boolean
      flightClass?: string
      flightIncluded?: boolean
      mealType?: string
      accessLevel?: string[]
      giftPackage?: string
      custom?: Record<string, unknown>
    }>(),

    defaultEmailTemplateId: text("default_email_template_id"),

    rsvpPageConfig: json("rsvp_page_config").$type<{
      headline?: { en: string; ar?: string }
      welcomeMessage?: { en: string; ar?: string }
      backgroundImage?: string
      showServiceDetails?: boolean
    }>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_category_event_idx").on(table.eventId),
    index("guest_category_code_idx").on(table.eventId, table.code),
  ]
)

export const guestCategoriesRelations = relations(
  guestCategories,
  ({ one }) => ({
    event: one(events, {
      fields: [guestCategories.eventId],
      references: [events.id],
    }),
  })
)
