import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"

export const rsvpResponses = pgTable(
  "rsvp_response",
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

    responseStatus: text("response_status")
      .notNull()
      .$type<"confirmed" | "declined" | "maybe">(),

    // === PERSONAL INFO SECTION ===
    preferredLanguage: text("preferred_language").$type<"en" | "ar">(),
    country: text("country"), // ISO 3166-1 alpha-2 code (used by country_origin or country_traveling_from)

    // === LOGISTICS SECTION ===
    arrivalDate: timestamp("arrival_date", { mode: "date" }),
    departureDate: timestamp("departure_date", { mode: "date" }),
    arrivalFlight: text("arrival_flight"),
    departureFlight: text("departure_flight"),
    hotelRequired: boolean("hotel_required"),
    hotelCheckin: timestamp("hotel_checkin", { mode: "date" }),
    hotelCheckout: timestamp("hotel_checkout", { mode: "date" }),
    transportRequired: boolean("transport_required"),

    // === IMPORTANT TO KNOW SECTION ===
    dietaryType: text("dietary_type").$type<
      "none" | "vegetarian" | "vegan" | "halal" | "kosher" | "gluten_free" | "other"
    >(),
    dietaryDetails: text("dietary_details"),
    accessibilityType: text("accessibility_type").$type<
      "none" | "wheelchair" | "hearing" | "visual" | "mobility" | "other"
    >(),
    accessibilityDetails: text("accessibility_details"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),

    // === EXPERIENCE SECTION ===
    sessionsInterested: json("sessions_interested").$type<string[]>(),

    // === CUSTOM FIELDS (JSON for flexibility) ===
    customResponses: json("custom_responses").$type<Record<string, unknown>>(),

    // === LEGACY/BACKUP (full form data) ===
    formResponses: json("form_responses").$type<Record<string, unknown>>(),

    companionInfo: json("companion_info").$type<{
      bringing: boolean
      count?: number
      names?: string[]
      details?: Array<{ name: string; dietary?: string }>
    }>(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    isAmendment: boolean("is_amendment").default(false),
    previousResponseId: text("previous_response_id"),

    submittedAt: timestamp("submitted_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("rsvp_response_guest_idx").on(table.guestId),
    index("rsvp_response_event_idx").on(table.eventId),
    index("rsvp_response_status_idx").on(table.eventId, table.responseStatus),
    // Indexes for common query patterns
    index("rsvp_response_arrival_idx").on(table.eventId, table.arrivalDate),
    index("rsvp_response_departure_idx").on(table.eventId, table.departureDate),
    index("rsvp_response_dietary_idx").on(table.eventId, table.dietaryType),
    index("rsvp_response_accessibility_idx").on(table.eventId, table.accessibilityType),
    index("rsvp_response_hotel_idx").on(table.eventId, table.hotelRequired),
    index("rsvp_response_transport_idx").on(table.eventId, table.transportRequired),
  ]
)

export const rsvpResponsesRelations = relations(rsvpResponses, ({ one }) => ({
  guest: one(guests, {
    fields: [rsvpResponses.guestId],
    references: [guests.id],
  }),
  event: one(events, {
    fields: [rsvpResponses.eventId],
    references: [events.id],
  }),
}))
