import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import { NextRequest } from "next/server"
import { getCurrentUser } from "@/server/queries/auth-queries"

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

const ALLOWED_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 1048576 // 1MB in bytes

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    const identifier = `ratelimit:local-upload:${user.id}`
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return responses.tooManyRequestsResponse()
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return responses.badRequestResponse("No file provided")
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return responses.badRequestResponse(
        "Invalid file type. Allowed types: gif, jpeg, png, webp"
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds the maximum limit of 1MB")
    }

    const generatedFilename = getFilename(file.name)

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "uploads", user.id)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Write file to disk
    const filePath = path.join(uploadDir, generatedFilename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Return the API URL path to serve the file
    const imageUrl = `/api/uploads/${user.id}/${generatedFilename}`

    return responses.successResponse({ imageUrl }, "Image uploaded successfully")
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
