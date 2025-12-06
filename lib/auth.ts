import {
  BETTER_AUTH_TRUSTED_ORIGINS_ENV,
  BETTER_AUTH_URL_ENV,
  GITHUB_CLIENT_ID_ENV,
  GITHUB_CLIENT_SECRET_ENV,
  GOOGLE_CLIENT_ID_ENV,
  GOOGLE_CLIENT_SECRET_ENV,
  SMTP_FROM_ENV,
} from "@/env"
import { db } from "@/server/db/config/database"
import { account, sessions, users, verification } from "@/server/db/schemas"
import { render } from "@react-email/render"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { createAuthMiddleware, magicLink, multiSession } from "better-auth/plugins"
import { eq } from "drizzle-orm"

import { configuration } from "@/lib/config"
import { email } from "@/lib/email"
import { MagicLinkMail } from "@/components/mail/magic-link-mail"

// Build trusted origins array from environment variables
// Supports both primary URL and additional comma-separated origins
const trustedOrigins = [
  BETTER_AUTH_URL_ENV,
  ...BETTER_AUTH_TRUSTED_ORIGINS_ENV.split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean)

export const auth = betterAuth({
  appName: "Events CRM",
  baseURL: BETTER_AUTH_URL_ENV,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: account,
      verification: verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID_ENV,
      clientSecret: GOOGLE_CLIENT_SECRET_ENV,
    },
    github: {
      clientId: GITHUB_CLIENT_ID_ENV,
      clientSecret: GITHUB_CLIENT_SECRET_ENV,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "email-password"],
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.includes("/sign-in/social")) {
        const newSession = ctx.context.newSession
        if (newSession) {
          await db
            .update(users)
            .set({ lastLoggedIn: new Date() })
            .where(eq(users.id, newSession.user.id))
        }
      }

      if (ctx.path.includes("/sign-in/verify")) {
        const newSession = ctx.context.newSession
        if (newSession) {
          await db
            .update(users)
            .set({ lastLoggedIn: new Date() })
            .where(eq(users.id, newSession.user.id))
        }
      }

      if (ctx.path.includes("/sign-in/email-password")) {
        const newSession = ctx.context.newSession
        if (newSession) {
          await db
            .update(users)
            .set({ lastLoggedIn: new Date() })
            .where(eq(users.id, newSession.user.id))
        }
      }
    }),
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email: toEmail, url }) => {
        const html = await render(
          MagicLinkMail({
            email: toEmail,
            magicLinkMail: url,
          })
        )

        const result = await email.send({
          from: SMTP_FROM_ENV,
          to: toEmail,
          subject: `Magic Login Link from ${configuration.site.name}!`,
          html,
        })
        if (result.error) {
          throw new Error(result.error.message)
        }
      },
    }),
    nextCookies(),
    multiSession(),
  ],
})
