import { users } from "@/server/db/schemas"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const emailVerifications = pgTable("email_verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  token: text("token").notNull().unique(),
  newEmail: text("new_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
})
