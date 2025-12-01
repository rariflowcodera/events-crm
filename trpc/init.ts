import { cache } from "react"
import { db } from "@/server/db/config/database"
import { users } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { initTRPC, TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import superjson from "superjson"
import { ZodError } from "zod"

import { ratelimit } from "@/lib/ratelimit"

export const createTRPCContext = cache(async () => {
  const { user, session } = await getCurrentUser()

  return { userId: user?.id, sessionId: session?.id }
})

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts

    // Format ZOD errors in a more readable way
    if (error.cause instanceof ZodError) {
      const formattedErrors = error.cause.errors
        .map((err) => {
          return `${err.message}`
        })
        .join("; ")

      return {
        ...shape,
        message: formattedErrors || "Validation failed",
        data: {
          ...shape.data,
          zodError: error.cause.flatten(),
        },
      }
    }

    return shape
  },
})
// Base router and procedure helpers
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure
export const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts

  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1)

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  const [{ success }, updateUser] = await Promise.all([
    ratelimit.limit(user.id),
    db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id)),
  ])

  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    })
  }

  return opts.next({
    ctx: {
      ...ctx,
      user,
    },
  })
})
