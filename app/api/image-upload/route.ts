import * as crypto from "crypto"
import * as path from "path"
import { NextRequest } from "next/server"
import { S3_UPLOAD_BUCKET_ENV, STORAGE_PROVIDER_ENV } from "@/env"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { awsClient } from "@/lib/aws"
import { createRateLimiter } from "@/lib/ratelimit"
import { responses } from "@/lib/responses"

const getFilename = (originalName: string) => {
  const originalExtension = path.extname(originalName)
  const currentTime = new Date().getTime().toString()
  const hash = crypto.createHash("md5").update(currentTime).digest("hex")
  const filename = `${hash}${originalExtension}`
  return filename
}

// 5 requests per 60 seconds
const ratelimit = createRateLimiter(5, 60)

export async function POST(req: NextRequest) {
  try {
    const { filesize, filename, filetype } = await req.json()
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    const identifier = `ratelimit:image-upload:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    const MAX_FILE_SIZE = 1048576 // 1MB in bytes

    // Check file size
    if (filesize > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds the maximum limit of 1MB")
    }

    if (!success) {
      return responses.tooManyRequestsResponse()
    }

    // Local storage mode - return URL to local upload endpoint
    if (STORAGE_PROVIDER_ENV === "local") {
      const generatedFilename = getFilename(filename)
      return responses.successResponse(
        {
          uploadUrl: `/api/local-upload`,
          imageUrl: `/api/file?user=${user.id}&name=${generatedFilename}`,
          storageProvider: "local",
        },
        "Ready for local upload"
      )
    }

    // S3 storage mode - return pre-signed URL
    const generatedFilename = getFilename(filename)

    const params = {
      Bucket: S3_UPLOAD_BUCKET_ENV,
      Key: `${user.id}/${generatedFilename}`,
      ContentType: filetype,
      CacheControl: "max-age=63072000",
    }

    const preSignedUrl = await getSignedUrl(awsClient, new PutObjectCommand(params), {
      expiresIn: 60 * 60,
    })

    const imageUrl = `https://${S3_UPLOAD_BUCKET_ENV}.s3.amazonaws.com/${user.id}/${generatedFilename}`
    const uploadResult = {
      preSignedUrl,
      imageUrl,
      storageProvider: "s3",
    }

    return responses.successResponse(uploadResult, "Image uploaded successfully")
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
