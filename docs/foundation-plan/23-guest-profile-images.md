# Stage 23: Guest Profile Images

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: ✅ Complete

## Objective

Add profile image upload capability for guests to help identify attendees at events. Images are stored locally with **secure authenticated access** - only workspace members can view guest images.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage Location | Local disk (`uploads/guests/`) | KSA data residency compliance, no external dependencies |
| Access Control | Authenticated + workspace membership | Unlike public file endpoints, guest images require workspace access |
| File Serving | Dedicated secure endpoint | Cannot use existing public `/api/file` endpoint |
| Image Size | 10MB max | Allows for high-resolution guest photos |
| Namespace | Per-event directories | `uploads/guests/{eventId}/{hash}.ext` for organization |

---

## Implementation Stages

Work is organized into 3 sub-phases for incremental delivery:

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 23A | Database Schema | ~2 files | ✅ Complete |
| 23B | API Endpoints (Upload + Serve) | ~2 files | ✅ Complete |
| 23C | UI Components & Integration | ~4 files | ✅ Complete |

---

## 23A: Database Schema

### Schema Changes

**Update `server/db/schemas/guest.ts`:**

Add `profileImage` field after the existing metadata fields:

```typescript
// After internalNotes (around line 93)
profileImage: text("profile_image"),
```

### Migration

```bash
npm run db:generate
npm run db:migrate
```

### Files to Modify

```
server/db/schemas/
└── guest.ts                    # Add profileImage column
```

---

## 23B: API Endpoints

### Guest Image Upload Endpoint

**Create `app/api/guest-image-upload/route.ts`:**

Handles secure file uploads with workspace authorization.

```typescript
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

const ALLOWED_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser()

    if (!user) {
      return responses.notAuthenticatedResponse()
    }

    const identifier = `ratelimit:guest-image-upload:${user.id}`
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
        "Invalid file type. Allowed types: PNG, JPEG, GIF, WebP"
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return responses.badRequestResponse("File size exceeds 10MB limit")
    }

    const generatedFilename = getFilename(file.name)

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "uploads", "guests", eventId)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Write file to disk
    const filePath = path.join(uploadDir, generatedFilename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Return the secure API URL path
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const imageUrl = `${baseUrl}/api/guest-image?event=${eventId}&name=${generatedFilename}`

    return responses.successResponse({ imageUrl }, "Image uploaded successfully")
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message)
  }
}
```

### Secure Image Serving Endpoint

**Create `app/api/guest-image/route.ts`:**

**Critical:** Unlike existing public file endpoints, this requires authentication.

```typescript
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
```

### Files to Create

```
app/api/
├── guest-image-upload/
│   └── route.ts              # Upload endpoint with workspace auth
└── guest-image/
    └── route.ts              # Secure serving endpoint with workspace auth
```

---

## 23C: UI Components & Integration

### Client Upload Hook

**Create `hooks/use-guest-image-upload.ts`:**

```typescript
import { useState } from "react"
import { toast } from "sonner"

const ALLOWED_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useGuestImageUpload() {
  const [isUploading, setIsUploading] = useState(false)

  const uploadGuestImage = async (
    file: File,
    eventId: string
  ): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please select an image file (PNG, JPEG, GIF, WebP).")
      return null
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds the maximum limit of 10MB")
      return null
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("eventId", eventId)

      const res = await fetch("/api/guest-image-upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || "Upload failed")
      }

      const json = await res.json()
      toast.success("Image uploaded successfully")
      return json.data?.imageUrl || null
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image")
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadGuestImage, isUploading }
}
```

### Guest Profile Image Component

**Create `components/guests/guest-profile-image.tsx`:**

```typescript
"use client"

import Dropzone from "react-dropzone"
import { cn } from "@/lib/utils"
import { useGuestImageUpload } from "@/hooks/use-guest-image-upload"
import { Icons } from "@/components/global/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface GuestProfileImageProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  eventId: string
  disabled?: boolean
  guestName?: string
  size?: "sm" | "md" | "lg"
}

export function GuestProfileImage({
  value,
  onChange,
  eventId,
  disabled = false,
  guestName,
  size = "md",
}: GuestProfileImageProps) {
  const { uploadGuestImage, isUploading } = useGuestImageUpload()

  const sizeClasses = {
    sm: "size-10",
    md: "size-16",
    lg: "size-24",
  }

  const handleFileDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const imageUrl = await uploadGuestImage(file, eventId)
    if (imageUrl) {
      onChange(imageUrl)
    }
  }

  const initials = guestName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Dropzone
      multiple={false}
      disabled={disabled || isUploading}
      accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] }}
      onDrop={handleFileDrop}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer group",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
            {value ? <AvatarImage src={value} alt="Guest profile" /> : null}
            <AvatarFallback className="text-sm">
              {isUploading ? (
                <Icons.loader className="size-4 animate-spin" />
              ) : (
                initials || <Icons.user className="size-4" />
              )}
            </AvatarFallback>
          </Avatar>

          {!disabled && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icons.camera className="size-4 text-white" />
            </div>
          )}

          <input {...getInputProps()} />
        </div>
      )}
    </Dropzone>
  )
}
```

### tRPC Router Updates

**Update `trpc/routers/guests.ts`:**

Add `profileImage` to input schemas:

```typescript
// In create mutation input (around line 159)
profileImage: z.string().url().optional(),

// In update mutation input (around line 237)
profileImage: z.string().url().nullable().optional(),
```

### Form Integration

**Update `components/guests/add-guest-form.tsx`:**

1. Add to schema:
```typescript
profileImage: z.string().optional(),
```

2. Add to defaultValues:
```typescript
profileImage: "",
```

3. Add component at top of form:
```tsx
<div className="flex justify-center pb-4">
  <FormField
    control={form.control}
    name="profileImage"
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <GuestProfileImage
            value={field.value}
            onChange={field.onChange}
            eventId={eventId}
            disabled={isPending}
            guestName={`${form.watch("firstName")} ${form.watch("lastName")}`}
            size="lg"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

**Update `components/guests/guest-detail-content.tsx`:**

1. Add to Guest interface:
```typescript
profileImage: string | null
```

2. Add to editGuestSchema:
```typescript
profileImage: z.string().nullable().optional(),
```

3. Add to form defaultValues:
```typescript
profileImage: guest.profileImage || "",
```

4. Add image upload to edit mode form
5. Display avatar in view mode header

### Files to Create/Modify

```
hooks/
└── use-guest-image-upload.ts        # Create: client upload hook

components/guests/
├── guest-profile-image.tsx          # Create: image upload component
├── add-guest-form.tsx               # Modify: add image field
└── guest-detail-content.tsx         # Modify: add image display/edit

trpc/routers/
└── guests.ts                        # Modify: add profileImage to schemas
```

---

## Storage Structure

```
uploads/
├── {userId}/           # Existing user profile images (public)
├── documents/          # Existing event documents (public)
│   └── {eventId}/
└── guests/             # NEW: Guest profile images (secure)
    └── {eventId}/
        └── {md5hash}.{ext}
```

---

## Security Implementation

| Aspect | Implementation |
|--------|----------------|
| Upload Auth | `getCurrentUser()` required |
| Upload Authz | Workspace membership required |
| Serve Auth | `getCurrentUser()` required |
| Serve Authz | Workspace membership required |
| Access Scope | Any workspace member can view guest images |
| Rate Limiting | 5 requests per 60 seconds per user |
| File Validation | Type whitelist + 10MB size limit |
| Path Security | Directory traversal prevention |
| Cache Headers | `Cache-Control: private, max-age=3600` |

---

## i18n Additions

**Update `messages/en.json`:**

```json
{
  "guest": {
    "profileImage": "Profile Image",
    "uploadImage": "Upload Image",
    "removeImage": "Remove Image",
    "imageUploadError": "Failed to upload image",
    "imageUploadSuccess": "Image uploaded successfully"
  }
}
```

**Update `messages/ar.json`:**

```json
{
  "guest": {
    "profileImage": "صورة الملف الشخصي",
    "uploadImage": "رفع صورة",
    "removeImage": "إزالة الصورة",
    "imageUploadError": "فشل في رفع الصورة",
    "imageUploadSuccess": "تم رفع الصورة بنجاح"
  }
}
```

---

## Verification Checklist

After completing Stage 23:

### 23A: Database Schema
- [x] `profileImage` column added to guests table
- [x] Migration runs successfully (`0010_calm_blacklash.sql`)

### 23B: API Endpoints
- [x] Upload endpoint requires authentication
- [x] Upload endpoint verifies workspace membership
- [x] Upload endpoint validates file type and size (10MB max)
- [x] Serving endpoint requires authentication
- [x] Serving endpoint verifies workspace membership
- [x] Directory traversal attacks are blocked
- [x] Rate limiting works on upload (5 req/60s)

### 23C: UI Components
- [x] Add guest form shows image upload
- [x] Guest detail edit mode allows image upload
- [x] Guest detail view mode displays image
- [x] Avatar shows initials when no image
- [x] Loading state shows spinner during upload
- [x] Error messages display via toast

---

## Related Documents

- [Stage 5: Admin Dashboard](./05-admin-dashboard.md) - Guest forms pattern
- [Stage 9: Branding System](./09-branding-system.md) - Image upload pattern

---

## Critical Files Reference

| Pattern | Reference File |
|---------|----------------|
| Upload endpoint | `app/api/local-document-upload/route.ts` |
| File serving | `app/api/document-file/route.ts` |
| Guest schema | `server/db/schemas/guest.ts` |
| Guest form (edit) | `components/guests/guest-detail-content.tsx` |
| Guest form (create) | `components/guests/add-guest-form.tsx` |
| tRPC router | `trpc/routers/guests.ts` |
| Image upload UI | `components/global/image-upload.tsx` |

---

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `app/api/guest-image-upload/route.ts` | Secure upload endpoint with workspace auth |
| `app/api/guest-image/route.ts` | Secure serving endpoint with workspace auth |
| `hooks/use-guest-image-upload.ts` | Client-side upload hook with validation |
| `components/guests/guest-profile-image.tsx` | Dropzone-based avatar upload component |
| `server/db/migrations/0010_calm_blacklash.sql` | Database migration for profileImage column |

### Files Modified

| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Added `profileImage` text column |
| `trpc/routers/guests.ts` | Added `profileImage` to create/update input schemas |
| `components/guests/add-guest-form.tsx` | Integrated profile image upload at top of form |
| `components/guests/guest-detail-content.tsx` | Added image display in view mode, upload in edit mode |

### Key Features Implemented

- **Secure local storage**: Files stored in `uploads/guests/{eventId}/`
- **Authenticated access**: Both upload and serving require user auth + workspace membership
- **10MB limit**: Supports high-resolution guest photos
- **Avatar-style UI**: Drag-and-drop with camera icon hover overlay
- **View mode display**: Shows profile image when viewing guest details
- **Fallback initials**: Displays guest initials when no image uploaded
