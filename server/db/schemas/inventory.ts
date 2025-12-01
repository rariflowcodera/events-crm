import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"

// Inventory Type (hotels, flights, transport, etc.)
export const inventoryTypeEnum = pgEnum("inventory_type_category", [
  "hotel",
  "flight",
  "transport",
  "venue",
  "meal",
  "gift",
  "other",
])

export const inventoryTypes = pgTable(
  "inventory_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    category: inventoryTypeEnum("category").notNull(),
    description: text("description"),

    settings: json("settings").$type<{
      requiresBookingReference?: boolean
      requiresConfirmation?: boolean
      trackCapacity?: boolean
      customFields?: Array<{
        id: string
        label: { en: string; ar?: string }
        type: "text" | "number" | "date" | "select"
        required: boolean
      }>
    }>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("inventory_type_event_idx").on(table.eventId),
    index("inventory_type_category_idx").on(table.eventId, table.category),
  ]
)

// Inventory Items (specific hotels, flights, etc.)
export const inventoryItems = pgTable(
  "inventory_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    inventoryTypeId: text("inventory_type_id")
      .notNull()
      .references(() => inventoryTypes.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    // For hotels
    hotelName: text("hotel_name"),
    hotelStars: integer("hotel_stars"),
    roomType: text("room_type"),
    address: text("address"),

    // For flights
    airline: text("airline"),
    flightNumber: text("flight_number"),
    flightClass: text("flight_class"),
    departureAirport: text("departure_airport"),
    arrivalAirport: text("arrival_airport"),
    departureTime: timestamp("departure_time", { mode: "date" }),
    arrivalTime: timestamp("arrival_time", { mode: "date" }),

    // For transport
    vehicleType: text("vehicle_type"),
    pickupLocation: text("pickup_location"),
    dropoffLocation: text("dropoff_location"),

    // Capacity tracking
    totalCapacity: integer("total_capacity"),
    allocatedCount: integer("allocated_count").default(0),
    availableCount: integer("available_count"),

    // Pricing
    unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
    currency: text("currency").default("SAR"),

    // Dates
    startDate: timestamp("start_date", { mode: "date" }),
    endDate: timestamp("end_date", { mode: "date" }),

    // Vendor/booking info
    vendorName: text("vendor_name"),
    vendorContact: text("vendor_contact"),
    bookingReference: text("booking_reference"),
    confirmationStatus: text("confirmation_status").$type<
      "pending" | "confirmed" | "cancelled"
    >(),

    customData: json("custom_data").$type<Record<string, unknown>>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("inventory_item_type_idx").on(table.inventoryTypeId),
    index("inventory_item_event_idx").on(table.eventId),
  ]
)

// Guest Inventory Allocations
export const guestInventoryAllocations = pgTable(
  "guest_inventory_allocation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    guestId: text("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),

    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    quantity: integer("quantity").notNull().default(1),

    status: text("status")
      .notNull()
      .default("allocated")
      .$type<"allocated" | "confirmed" | "checked_in" | "completed" | "cancelled">(),

    bookingReference: text("booking_reference"),
    confirmationNumber: text("confirmation_number"),

    notes: text("notes"),
    customData: json("custom_data").$type<Record<string, unknown>>(),

    allocatedAt: timestamp("allocated_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    confirmedAt: timestamp("confirmed_at", { mode: "date" }),
    checkedInAt: timestamp("checked_in_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("guest_inventory_guest_idx").on(table.guestId),
    index("guest_inventory_item_idx").on(table.inventoryItemId),
    index("guest_inventory_event_idx").on(table.eventId),
    index("guest_inventory_status_idx").on(table.status),
  ]
)

// Relations
export const inventoryTypesRelations = relations(
  inventoryTypes,
  ({ one, many }) => ({
    event: one(events, {
      fields: [inventoryTypes.eventId],
      references: [events.id],
    }),
    items: many(inventoryItems),
  })
)

export const inventoryItemsRelations = relations(
  inventoryItems,
  ({ one, many }) => ({
    inventoryType: one(inventoryTypes, {
      fields: [inventoryItems.inventoryTypeId],
      references: [inventoryTypes.id],
    }),
    event: one(events, {
      fields: [inventoryItems.eventId],
      references: [events.id],
    }),
    allocations: many(guestInventoryAllocations),
  })
)

export const guestInventoryAllocationsRelations = relations(
  guestInventoryAllocations,
  ({ one }) => ({
    guest: one(guests, {
      fields: [guestInventoryAllocations.guestId],
      references: [guests.id],
    }),
    inventoryItem: one(inventoryItems, {
      fields: [guestInventoryAllocations.inventoryItemId],
      references: [inventoryItems.id],
    }),
    event: one(events, {
      fields: [guestInventoryAllocations.eventId],
      references: [events.id],
    }),
  })
)
