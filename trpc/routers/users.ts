import { headers } from "next/headers"
import { db, dbClient } from "@/server/db/config/database"
import { account, emailVerifications, users, userSettings, workspaces } from "@/server/db/schemas"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { render } from "@react-email/render"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { configuration } from "@/lib/config"
import { email } from "@/lib/email"
import { generateUniqueToken } from "@/lib/invitation"
import { userSchema } from "@/lib/schemas"
import { EmailVerificationMail } from "@/components/mail/email-verification-mail"

export const usersRouter = createTRPCRouter({
  getOne: protectedProcedure.query(async ({ ctx }) => {
    const { user, sessionId } = ctx
    const [[userWithAccount], sessions, deviceSessions] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          lastName: users.lastName,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          account: {
            provider: account.providerId,
          },
        })
        .from(users)
        .leftJoin(account, eq(users.id, account.userId))
        .where(eq(users.id, user.id))
        .limit(1),
      auth.api.listSessions({
        headers: await headers(),
      }),
      auth.api.listDeviceSessions({
        headers: await headers(),
      }),
    ])

    if (!userWithAccount) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      })
    }

    return {
      user: userWithAccount,
      sessions,
      deviceSessions,
      sessionId,
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        values: userSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { values } = input
      const { user } = ctx

      const { email: userEmail, name, id, image, lastName } = values

      if (id !== user.id || userEmail !== user.email) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to create this user",
        })
      }

      const result = await dbClient.transaction(async (trx) => {
        // Update user profile
        await trx
          .update(users)
          .set({
            name,
            image,
            lastName,
            updatedAt: new Date(),
          })
          .where(and(eq(users.id, user.id), eq(users.email, userEmail)))

        // Get or create user settings
        const existingSettings = await trx
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, user.id))
          .limit(1)
          .then((results) => results[0])

        if (!existingSettings) {
          await trx.insert(userSettings).values({
            userId: user.id,
          })
        }

        // Get workspace status
        const [workspace] = await trx
          .select()
          .from(workspaces)
          .where(eq(workspaces.ownerId, id))
          .limit(1)

        return workspace
      })

      return {
        status: 200,
        success: true,
        hasWorkspace: !!result,
        message: "Profile created successfully",
        description: "Please wait until you get redirected...",
      }
    }),

  update: protectedProcedure
    .input(userSchema.pick({ name: true, email: true, image: true, id: true, lastName: true }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx

      const { name, id, image, email: userEmail, lastName } = input

      if (id !== user.id || userEmail !== user.email) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to update this user",
        })
      }

      const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1)

      if (!dbUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        })
      }
      const [updatedUser] = await db
        .update(users)
        .set({ name, image, lastName, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          name: users.name,
          image: users.image,
          lastName: users.lastName,
          updatedAt: users.updatedAt,
        })

      return {
        message: "Profile updated successfully",
        updatedUser,
      }
    }),

  updateImage: protectedProcedure
    .input(userSchema.pick({ image: true }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { image } = input

      const [updatedUser] = await db
        .update(users)
        .set({ image })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          image: users.image ?? null,
        })

      return {
        message: "Image updated successfully",
        updatedUser,
      }
    }),

  delete: protectedProcedure
    .input(userSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input
      const { user } = ctx

      if (id !== user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this user",
        })
      }
      const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1)

      if (!dbUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        })
      }

      await db.delete(users).where(eq(users.id, id))

      return {
        message: "User deleted successfully",
        description: "You will be redirected to the homepage",
        shouldClearCookies: true,
      }
    }),

  initialEmailChange: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email: newEmail } = input
      const { user } = ctx

      if (user.email === newEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email is the same as the current email",
        })
      }

      await dbClient.transaction(async (trx) => {
        // Check if the new email is already in use
        const [existingUser] = await trx.select().from(users).where(eq(users.email, newEmail)).limit(1)

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email is already in use",
          })
        }

        const token = await generateUniqueToken()
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

        if (!token) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error generating token",
          })
        }

        await db.insert(emailVerifications).values({
          userId: user.id,
          token,
          newEmail: newEmail,
          expiresAt,
        })

        const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`

        const html = await render(
          EmailVerificationMail({
            email: newEmail,
            verificationUrl,
          })
        )

        const result = await email.send({
          from: configuration.smtp.from,
          to: newEmail,
          subject: `Verify your email | ${configuration.site.name}`,
          html,
        })

        if (result.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error sending email",
          })
        }
      })

      return {
        status: 200,
        message: `Email verification sent to ${newEmail}`,
      }
    }),
})
