/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db/config/database"
import { workspaces } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { createRateLimiter } from "@/lib/ratelimit"
import { updateWorkspaceSchema, workspaceSchema } from "@/lib/schemas"

type routeParams = {
  params: Promise<{ workspaceId: string }>
}

// 10 requests per 60 seconds
const ratelimit = createRateLimiter(10, 60)

export async function PATCH(req: NextRequest, { params }: routeParams) {
  try {
    const { workspaceId } = await params

    console.log(`Incoming PATCH request /api/workspaces/${workspaceId}`)

    const body = await req.json()

    console.log("Body", body)

    const validateBody = updateWorkspaceSchema.parse(body)

    const validateWorkspaceId = workspaceSchema.pick({ id: true }).parse({ id: workspaceId })

    const { id } = validateWorkspaceId

    if (!id) {
      console.log("Invalid workspace id")
      return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 })
    }

    const { name, slug: newSlug } = validateBody

    const { user } = await getCurrentUser()

    if (!user) {
      console.log("User not found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const identifier = `ratelimit:update-workspace:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      console.log("Rate limit exceeded")
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

    if (!workspace) {
      console.log("Workspace not found")
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const canUpdate = await hasPermission({
      userId: user.id,
      workspaceId: workspace.id,
      permissionName: PERMISSIONS.MANAGE_WORKSPACE,
    })

    if (!canUpdate) {
      console.log("User does not have permission to update workspace")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        name,
        slug: newSlug,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning({
        id: workspaces.id,
        slug: workspaces.slug,
        name: workspaces.name,
        logo: workspaces.logo,
        updatedAt: workspaces.updatedAt,
      })

    return NextResponse.json(
      {
        message: "Workspace updated successfully",
        newSlug: newSlug ?? null,
        updatedWorkspace,
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

export async function DELETE(req: NextRequest, { params }: routeParams) {
  try {
    const { workspaceId } = await params

    console.log(`Incoming DELETE request /api/workspaces/${workspaceId}`)

    const validateWorkspaceId = workspaceSchema.pick({ id: true }).parse({ id: workspaceId })

    const { id } = validateWorkspaceId

    if (!id) {
      console.log("Invalid workspace id")
      return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 })
    }

    const { user } = await getCurrentUser()

    if (!user) {
      console.log("User not found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const identifier = `ratelimit:delete-workspace:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      console.log("Rate limit exceeded")
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      with: {
        creator: {
          columns: {
            id: true,
          },
        },
      },
    })

    if (!workspace) {
      console.log("Workspace not found")
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Only owner can delete workspace
    if (workspace.creator.id !== user.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }

    // Additionally you can check for permission to see if user has permission to delete workspace
    // 3. Check if user is admin or owner
    const canDelete = await hasPermission({
      userId: user.id,
      workspaceId: workspace.id,
      permissionName: PERMISSIONS.DELETE_WORKSPACE,
    })

    if (!canDelete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await db.delete(workspaces).where(eq(workspaces.id, id))

    return NextResponse.json(
      {
        message: "Workspace deleted successfully",
        description: "You will be redirected to the home page",
        redirectUrl: "/callback",
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
