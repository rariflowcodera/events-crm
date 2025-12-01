/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server"
import { db, dbClient } from "@/server/db/config/database"
import { roles, workspaceMembers, workspaces } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { createRateLimiter } from "@/lib/ratelimit"
import { workspaceSchema } from "@/lib/schemas"
import { slugify } from "@/lib/utils"

// 10 requests per 60 seconds
const ratelimit = createRateLimiter(10, 60)

export async function GET(req: NextRequest) {
  try {
    console.log("Incoming GET request /api/workspaces")

    const identifier = "ratelimit:get-workspaces"
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        {
          error: "Rate Limit Exceeded",
        },
        {
          status: 429,
        }
      )
    }

    const dbWorkspaces = await db.select().from(workspaces)

    return NextResponse.json(
      {
        data: dbWorkspaces,
      },
      {
        status: 200,
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error.message,
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Incoming POST request /api/workspaces")

    const body = await req.json()

    // 1. Validate request body
    const validateValues = workspaceSchema.pick({ name: true, logo: true, slug: true }).parse(body.values)

    const { name, logo, slug } = validateValues
    const slugName = slugify(slug)

    // 2. Get auth
    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    // 3. Ratelimit
    const identifier = `ratelimit:create-workspace:${user.id}`
    const { success: rateLimitSuccess } = await ratelimit.limit(identifier)

    if (!rateLimitSuccess) {
      return NextResponse.json(
        {
          error: "Rate Limit Exceeded",
        },
        { status: 429 }
      )
    }

    // 4. Get required data
    const [workspaceWithSlug, ownerRole] = await Promise.all([
      // Check if slug exists
      db.select().from(workspaces).where(eq(workspaces.slug, slugName)).limit(1),
      // Get owner role
      db.select().from(roles).where(eq(roles.name, "owner")).limit(1),
    ])

    if (workspaceWithSlug.length) {
      return NextResponse.json(
        {
          error: "Workspace with slug already exists",
        },
        { status: 400 }
      )
    }

    if (!ownerRole.length) {
      return NextResponse.json(
        {
          error: "Owner role not found",
        },
        { status: 404 }
      )
    }

    const newWorkspace = await dbClient.transaction(async (tx) => {
      // Create workspace
      const [newWorkspace] = await tx
        .insert(workspaces)
        .values({
          ownerId: user.id,
          slug: slugName,
          logo: logo ? (logo as string) : null,
          name,
        })
        .returning({
          id: workspaces.id,
          slug: workspaces.slug,
          name: workspaces.name,
          logo: workspaces.logo,
          createdAt: workspaces.createdAt,
        })

      // Create workspace member with owner role
      await tx.insert(workspaceMembers).values({
        roleId: ownerRole[0].id,
        userId: user.id,
        workspaceId: newWorkspace.id,
      })

      return newWorkspace
    })

    return NextResponse.json(
      {
        slug: newWorkspace.slug,
        message: "Workspace created successfully",
        workspace: newWorkspace,
      },
      {
        status: 200,
      }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: error.errors,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error.message,
      },
      {
        status: 500,
      }
    )
  }
}
