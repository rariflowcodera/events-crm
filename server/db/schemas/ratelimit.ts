import { bigint, integer, pgTable, varchar } from "drizzle-orm/pg-core"

export const ratelimit = pgTable("ratelimit", {
  key: varchar("key", { length: 255 }).primaryKey(), // identifier for the ratelimit
  value: integer("value").notNull(), // Time window in seconds
  lastRequest: bigint("last_request", { mode: "number" }).notNull(), // Max requests in the window
})
