import { workspaceMembers } from "@/server/db/schemas"
import { relations } from "drizzle-orm"
import { boolean, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lastName: text("last_name"),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),

  lastLoggedIn: timestamp("last_logged_in").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  userNotificationSettings: one(userNotificationSettings),
  workspaceMemberships: many(workspaceMembers),
}))

export const userSettings = pgTable(
  "user_setting",
  {
    id: text("id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })]
)

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}))

export const userNotificationSettings = pgTable("user_notification_setting", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userSettingsId: text("user_settings_id").notNull(),
  updateEmails: boolean("update_emails").notNull(),
  subscriptionEmails: boolean("subscription_emails"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationSettings.userId],
    references: [users.id],
  }),
  userSettings: one(userSettings, {
    fields: [userNotificationSettings.userSettingsId],
    references: [userSettings.id],
  }),
}))
