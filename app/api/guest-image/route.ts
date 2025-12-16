import * as fs from "fs"
import * as path from "path"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { db } from "@/server/db/config/database"
import { events, workspaceMembers } from "@/server/db/schemas"

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const eventId = searchParams.get("event")
  const filename = searchParams.get("name")

  if (!eventId || !filename) {
    return new NextResponse("Missing event or name parameter", { status: 400 })
  }

  // 1. Authenticate user
  const { user } = await getCurrentUser()
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // 2. Get event and its workspaceId
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true, workspaceId: true },
  })

  if (!event) {
    return new NextResponse("Event not found", { status: 404 })
  }

  // 3. Check workspace membership
  const isMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, event.workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
  })

  if (!isMember) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // 4. Build file path and validate against traversal
  const filePath = path.join(process.cwd(), "uploads", "guests", eventId, filename)
  const normalizedPath = path.normalize(filePath)
  const uploadsDir = path.join(process.cwd(), "uploads", "guests")

  if (!normalizedPath.startsWith(uploadsDir)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // 5. Check file exists
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 })
  }

  // 6. Serve file with private caching (authenticated content)
  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || "application/octet-stream"
  const fileBuffer = fs.readFileSync(filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
