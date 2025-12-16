import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import { NextRequest } from "next/server"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq, and } from "drizzle-orm"

import { createRateLimiter } from "@/lib/ratelimit"
import { responses } from "@/lib/responses"
import { db } from "@/server/db/config/database"
import { events, workspaceMembers } from "@/server/db/schemas"

const getFilename = (originalName: string) => {
  const originalExtension = path.extname(originalName)
  const currentTime = new Date().getTime().toString()
  const hash = crypto.createHash("md5").update(currentTime).digest("hex")
  return `${hash}${originalExtension}`
}

// 5 requests per 60 seconds
const ratelimit = createRateLimiter(5, 60)

const ALLOWED_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    const identifier = `ratelimit:local-document-upload:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return responses.tooManyRequestsResponse()
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const eventId = formData.get("eventId") as string | null

    if (!file) {
      return responses.badRequestResponse("No file provided")
    }

    if (!eventId) {
      return responses.badRequestResponse("Event ID is required")
    }

    // Verify event exists and user has access
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    })

    if (!event) {
      return responses.badRequestResponse("Event not found")
    }

    // Check workspace membership
    const isMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, event.workspaceId),
        eq(workspaceMembers.userId, user.id)
      ),
    })

    if (!isMember) {
      return responses.unauthorizedResponse()
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return responses.badRequestResponse(
        "Invalid file type. Allowed types: PDF, PNG, JPEG, GIF"
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds 10MB limit")
    }

    const generatedFilename = getFilename(file.name)

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "uploads", "documents", eventId)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Write file to disk
    const filePath = path.join(uploadDir, generatedFilename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Return the API URL path to serve the file (must be absolute URL for validation)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const documentUrl = `${baseUrl}/api/document-file?event=${eventId}&name=${generatedFilename}`

    return responses.successResponse({ documentUrl }, "Document uploaded successfully")
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
