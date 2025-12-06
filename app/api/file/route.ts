import * as fs from "fs"
import * as path from "path"
import { NextRequest, NextResponse } from "next/server"

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("user")
  const filename = searchParams.get("name")

  if (!userId || !filename) {
    return new NextResponse("Missing user or name parameter", { status: 400 })
  }

  const filePath = path.join(process.cwd(), "uploads", userId, filename)

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filePath)
  const uploadsDir = path.join(process.cwd(), "uploads")
  if (!normalizedPath.startsWith(uploadsDir)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || "application/octet-stream"

  const fileBuffer = fs.readFileSync(filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
