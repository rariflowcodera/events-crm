import { relations } from "drizzle-orm"
import { index, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { events } from "./event"
import { guests } from "./guest"

// Communication channel types
export const communicationChannelEnum = pgEnum("communication_channel", [
  "whatsapp",
  "sms",
  "push_notification",
])

// Communication status
export const communicationStatusEnum = pgEnum("communication_status", [
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "expired",
])

// Communications (WhatsApp, SMS, Push notifications)
export const communications = pgTable(
  "communication",
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

    channel: communicationChannelEnum("channel").notNull(),
    status: communicationStatusEnum("status").notNull().default("pending"),

    // Recipient info
    toNumber: text("to_number"),
    toDeviceToken: text("to_device_token"),

    // Message content
    templateId: text("template_id"),
    templateName: text("template_name"),
    templateParams: json("template_params").$type<Record<string, string>>(),
    messageContent: text("message_content"),

    // WhatsApp specific
    whatsappMessageId: text("whatsapp_message_id"),
    whatsappConversationId: text("whatsapp_conversation_id"),

    // Provider response
    providerMessageId: text("provider_message_id"),
    providerResponse: json("provider_response").$type<Record<string, unknown>>(),

    // Tracking
    sentAt: timestamp("sent_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    readAt: timestamp("read_at", { mode: "date" }),
    failedAt: timestamp("failed_at", { mode: "date" }),

    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // Cost tracking
    cost: text("cost"),
    currency: text("currency").default("SAR"),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("communication_guest_idx").on(table.guestId),
    index("communication_event_idx").on(table.eventId),
    index("communication_channel_idx").on(table.channel),
    index("communication_status_idx").on(table.status),
    index("communication_sent_at_idx").on(table.sentAt),
  ]
)

// Relations
export const communicationsRelations = relations(communications, ({ one }) => ({
  guest: one(guests, {
    fields: [communications.guestId],
    references: [guests.id],
  }),
  event: one(events, {
    fields: [communications.eventId],
    references: [events.id],
  }),
}))
