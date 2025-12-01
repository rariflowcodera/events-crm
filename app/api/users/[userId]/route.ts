/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db/config/database"
import { users } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { createRateLimiter } from "@/lib/ratelimit"
import { userSchema } from "@/lib/schemas"
import { clearAuthCookies } from "@/lib/utils"

type routeParams = {
  params: Promise<{ userId: string }>
}

// 10 requests per 60 seconds
const ratelimit = createRateLimiter(10, 60)

export async function PATCH(req: NextRequest, { params }: routeParams) {
  try {
    const { userId } = await params

    console.log(`Incoming PATCH request /api/users/${userId}`)

    const body = await req.json()

    const validateUserId = userSchema.pick({ id: true }).parse({ id: userId })

    const { id } = validateUserId

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const validateBody = userSchema.pick({ name: true, email: true, image: true }).parse(body)

    const { name, email, image } = validateBody

    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.id !== id || user.email !== email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const identifier = `ratelimit:update-user:${user.id}`
    const { success: rateLimitSuccess } = await ratelimit.limit(identifier)

    if (!rateLimitSuccess) {
      return NextResponse.json(
        {
          error: "Rate Limit Exceeded",
        },
        { status: 429 }
      )
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1)

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const [updatedUser] = await db
      .update(users)
      .set({ name, image, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        image: users.image,
        updatedAt: users.updatedAt,
      })

    return NextResponse.json({ message: "User updated successfully", updatedUser }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: routeParams) {
  try {
    const { userId } = await params

    console.log(`Incoming DELETE request /api/users/${userId}`)

    const validateUserId = userSchema.pick({ id: true }).parse({ id: userId })

    const { id } = validateUserId

    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const identifier = `ratelimit:delete-user:${user.id}`
    const { success: rateLimitSuccess } = await ratelimit.limit(identifier)

    if (!rateLimitSuccess) {
      return NextResponse.json({ error: "Rate Limit Exceeded" }, { status: 429 })
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1)

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await db.delete(users).where(eq(users.id, id))

    const response = NextResponse.json(
      {
        message: "User deleted successfully",
        description: "You will be redirected to the homepage",
      },
      { status: 200 }
    )

    return clearAuthCookies(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    )
  }
}
