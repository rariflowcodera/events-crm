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
import { guests } from "./guest"
import { guestCategories } from "./guest-category"

// Itinerary Templates (base schedule for an event or category)
export const itineraryTemplates = pgTable(
  "itinerary_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    categoryId: text("category_id").references(() => guestCategories.id, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),
    description: text("description"),

    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("itinerary_template_event_idx").on(table.eventId),
    index("itinerary_template_category_idx").on(table.categoryId),
  ]
)

// Itinerary Items (individual activities/sessions)
export const itineraryItems = pgTable(
  "itinerary_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    templateId: text("template_id")
      .notNull()
      .references(() => itineraryTemplates.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),

    itemType: text("item_type").$type<
      | "session"
      | "meal"
      | "transport"
      | "check_in"
      | "check_out"
      | "free_time"
      | "networking"
      | "entertainment"
      | "other"
    >(),

    dayNumber: integer("day_number").notNull().default(1),
    startTime: timestamp("start_time", { mode: "date" }),
    endTime: timestamp("end_time", { mode: "date" }),
    duration: integer("duration_minutes"),

    location: text("location"),
    locationDetails: json("location_details").$type<{
      venue?: string
      room?: string
      floor?: string
      address?: string
      mapUrl?: string
    }>(),

    // For category-specific visibility
    visibleToCategories: json("visible_to_categories").$type<string[]>(),

    // Additional info
    dresscode: text("dresscode"),
    notes: text("notes"),
    attachments: json("attachments").$type<
      Array<{
        name: string
        url: string
        type: string
      }>
    >(),

    sortOrder: integer("sort_order").notNull().default(0),
    isOptional: boolean("is_optional").default(false),
    requiresRsvp: boolean("requires_rsvp").default(false),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("itinerary_item_template_idx").on(table.templateId),
    index("itinerary_item_event_idx").on(table.eventId),
    index("itinerary_item_day_idx").on(table.templateId, table.dayNumber),
  ]
)

// Guest Itineraries (personalized itinerary per guest)
export const guestItineraries = pgTable(
  "guest_itinerary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    templateId: text("template_id").references(() => itineraryTemplates.id, {
      onDelete: "set null",
    }),

    // Personalization overrides
    customizations: json("customizations").$type<
      Array<{
        itineraryItemId: string
        excluded?: boolean
        customStartTime?: string
        customLocation?: string
        notes?: string
      }>
    >(),

    // Tracking
    sentAt: timestamp("sent_at", { mode: "date" }),
    viewedAt: timestamp("viewed_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_itinerary_guest_idx").on(table.guestId),
    index("guest_itinerary_event_idx").on(table.eventId),
  ]
)

// Relations
export const itineraryTemplatesRelations = relations(
  itineraryTemplates,
  ({ one, many }) => ({
    event: one(events, {
      fields: [itineraryTemplates.eventId],
      references: [events.id],
    }),
    category: one(guestCategories, {
      fields: [itineraryTemplates.categoryId],
      references: [guestCategories.id],
    }),
    items: many(itineraryItems),
    guestItineraries: many(guestItineraries),
  })
)

export const itineraryItemsRelations = relations(itineraryItems, ({ one }) => ({
  template: one(itineraryTemplates, {
    fields: [itineraryItems.templateId],
    references: [itineraryTemplates.id],
  }),
  event: one(events, {
    fields: [itineraryItems.eventId],
    references: [events.id],
  }),
}))

export const guestItinerariesRelations = relations(
  guestItineraries,
  ({ one }) => ({
    guest: one(guests, {
      fields: [guestItineraries.guestId],
      references: [guests.id],
    }),
    event: one(events, {
      fields: [guestItineraries.eventId],
      references: [events.id],
    }),
    template: one(itineraryTemplates, {
      fields: [guestItineraries.templateId],
      references: [itineraryTemplates.id],
    }),
  })
)
