import * as crypto from "crypto"
import * as path from "path"
import { NextRequest } from "next/server"
import { S3_UPLOAD_BUCKET_ENV, STORAGE_PROVIDER_ENV } from "@/env"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { eq, and } from "drizzle-orm"

import { getAwsClient } from "@/lib/aws"
import { createRateLimiter } from "@/lib/ratelimit"
import { responses } from "@/lib/responses"
import { db } from "@/server/db/config/database"
import { events, workspaceMembers } from "@/server/db/schemas"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const getFilename = (originalName: string) => {
  const originalExtension = path.extname(originalName)
  const currentTime = new Date().getTime().toString()
  const hash = crypto.createHash("md5").update(currentTime).digest("hex")
  return `${hash}${originalExtension}`
}

// 5 requests per 60 seconds
const ratelimit = createRateLimiter(5, 60)

export async function POST(req: NextRequest) {
  try {
    const { filesize, filename, filetype, eventId } = await req.json()
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    // Validate eventId provided
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

    // Rate limiting
    const identifier = `ratelimit:document-upload:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return responses.tooManyRequestsResponse()
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(filetype)) {
      return responses.badRequestResponse(
        "File type not allowed. Only PDF and images (PNG, JPEG, GIF) accepted."
      )
    }

    // Validate file size
    if (filesize > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds 10MB limit")
    }

    const generatedFilename = getFilename(filename)

    // Local storage mode
    if (STORAGE_PROVIDER_ENV === "local") {
      return responses.successResponse(
        {
          uploadUrl: `/api/local-document-upload`,
          documentUrl: `/api/document-file?event=${eventId}&name=${generatedFilename}`,
          storageProvider: "local",
          eventId,
        },
        "Ready for local upload"
      )
    }

    // S3 storage mode
    const s3Key = `documents/${eventId}/${generatedFilename}`

    const params = {
      Bucket: S3_UPLOAD_BUCKET_ENV,
      Key: s3Key,
      ContentType: filetype,
      CacheControl: "max-age=63072000",
    }

    const preSignedUrl = await getSignedUrl(getAwsClient(), new PutObjectCommand(params), {
      expiresIn: 60 * 60, // 1 hour
    })

    const documentUrl = `https://${S3_UPLOAD_BUCKET_ENV}.s3.amazonaws.com/${s3Key}`

    return responses.successResponse(
      {
        preSignedUrl,
        documentUrl,
        storageProvider: "s3",
        eventId,
      },
      "Document upload URL generated"
    )
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
