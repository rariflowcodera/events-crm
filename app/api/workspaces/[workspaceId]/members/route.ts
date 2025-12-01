/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db/config/database"
import { workspaceMembers } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { createRateLimiter } from "@/lib/ratelimit"
import { workspaceSchema } from "@/lib/schemas"

type routeParams = {
  params: Promise<{ workspaceId: string }>
}

// 10 requests per 60 seconds
const ratelimit = createRateLimiter(10, 60)

export async function GET(req: NextRequest, { params }: routeParams) {
  try {
    const { workspaceId } = await params

    console.log(`Incoming GET request /api/workspaces/${workspaceId}/members`)

    const validateId = workspaceSchema.pick({ id: true }).parse({ id: workspaceId })

    const { id } = validateId

    if (!id) {
      return NextResponse.json(
        {
          error: "Invalid workspace id",
        },
        {
          status: 400,
        }
      )
    }

    const { user } = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const identifier = `ratelimit:get-workspace-members:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      console.log("Rate limit exceeded")
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
      columns: {
        status: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: "Ok",
        members,
      },
      {
        status: 200,
      }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    )
  }
}

// Create a new member and sends invitation
export async function POST(req: NextRequest, { params }: routeParams) {
  try {
    const { workspaceId } = await params

    return NextResponse.json(
      {
        message: "Member invited successfully",
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
        error: "Internal server error",
      },
      {
        status: 500,
      }
    )
  }
}
