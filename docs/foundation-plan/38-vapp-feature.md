# Stage 38: VAPP (Vehicle Access Parking Permit) Feature

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Implement a Vehicle Access Parking Permit (VAPP) system that generates unique vouchers for guests. The voucher displays:
- Serial Number (auto-generated per guest)
- Venue Code (event-level)
- Match Code (event-level)
- Access Code + Category Name (category-level)

Guests receive a unique link to view/print/download their VAPP voucher as PDF.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Serial number storage | `serialNumber` field on guest | Direct, simple, no join needed |
| Serial format | `{matchCode}-{6-digit sequence}` | e.g., "M21-000001" |
| Sequence tracking | Counter in event settings JSON | Atomic increment on guest creation |
| VAPP token | Reuse existing `rsvpToken` | Guest already has unique public token |
| URL pattern | `/vapp/[token]` | Consistent with RSVP pattern |
| PDF generation | Server-side with Puppeteer | Pixel-perfect rendering, native PDF quality |
| Category label | Use category name | Display category name below access code |
| Voucher background | `vappBackgroundImage` in event branding | Follows existing branding pattern |

---

## Data Model Changes

### 1. Event Schema - Settings (new fields)

**File**: `server/db/schemas/event.ts`

```typescript
// Extend EventSettings type
export type EventSettings = {
  // ... existing fields ...
  vapp?: {
    enabled?: boolean         // Toggle VAPP feature for this event
    venueCode?: string        // e.g., "KAS"
    matchCode?: string        // e.g., "M21"
    nextSequence?: number     // Auto-increment counter, starts at 1
  }
}
```

### 2. Event Schema - Branding (new field)

**File**: `server/db/schemas/event.ts`

```typescript
// Extend EventBranding type
export type EventBranding = {
  // ... existing fields ...
  vappBackgroundImage?: string  // URL for custom voucher background
}
```

This follows the existing branding pattern where `backgroundImage` is already stored in branding.

### 3. Guest Category Schema (new field)

**File**: `server/db/schemas/guest-category.ts`

```sql
ALTER TABLE guest_categories ADD COLUMN vapp_access_code TEXT;
```

```typescript
vappAccessCode: text("vapp_access_code")  // e.g., "P1" for VVIP
```

### 4. Guest Schema (new field)

**File**: `server/db/schemas/guest.ts`

```sql
ALTER TABLE guests ADD COLUMN serial_number TEXT;
CREATE UNIQUE INDEX guest_serial_number_event_idx ON guests(event_id, serial_number);
```

```typescript
serialNumber: text("serial_number")  // e.g., "M21-000001"
```

---

## Implementation Phases

### Phase 38A: Database Schema Updates

**Files to modify:**

| File | Changes |
|------|---------|
| `server/db/schemas/event.ts` | Add vapp to settings type, vappBackgroundImage to branding type |
| `server/db/schemas/guest-category.ts` | Add `vappAccessCode` column |
| `server/db/schemas/guest.ts` | Add `serialNumber` column with unique index |
| `lib/schemas.ts` | Add Zod schemas for VAPP settings |

**Run:** `pnpm db:push` or generate migration

---

### Phase 38B: Event Settings UI

**Files to modify:**

| File | Changes |
|------|---------|
| `components/events/event-settings-tab.tsx` | Add VAPP Settings card |
| `trpc/routers/events.ts` | Update validation for vapp settings |

**UI: New "VAPP Settings" Card in Settings Tab**

```
+------------------------------------------+
| VAPP SETTINGS                            |
+------------------------------------------+
| [x] Enable VAPP for this event           |
+------------------------------------------+
| Venue Code: [KAS    ]                    |
| Match Code: [M21    ]                    |
+------------------------------------------+
```

Note: The VAPP background image is configured in the **Branding Tab** (not Settings), following the existing pattern for `backgroundImage`.

---

### Phase 38C: Event Branding Tab Update

**Files to modify:**

| File | Changes |
|------|---------|
| `components/events/event-branding-tab.tsx` | Add VAPP Background Image upload section |
| `trpc/routers/events.ts` | Update branding validation to include vappBackgroundImage |

**UI: Add section to Branding Tab**

```
+------------------------------------------+
| VAPP VOUCHER BACKGROUND                  |
+------------------------------------------+
| Upload a custom background image for     |
| parking permit vouchers                  |
|                                          |
| [Upload Image] or [Current: vapp-bg.png] |
|                                          |
| Recommended size: 800x1200px             |
+------------------------------------------+
```

The image upload uses the existing S3 upload pattern (same as event logo/backgroundImage).

---

### Phase 38D: Category Access Code

**Files to modify:**

| File | Changes |
|------|---------|
| `components/guests/category-form.tsx` | Add vappAccessCode field |
| `trpc/routers/guest-categories.ts` | Include in create/update |

**UI: Add field to category form**

```
+------------------------------------------+
| VAPP Access Code: [P1    ]               |
| (Shows on parking permit voucher)        |
+------------------------------------------+
```

---

### Phase 38E: Serial Number Generation

**Files to modify:**

| File | Changes |
|------|---------|
| `trpc/routers/guests.ts` | Auto-generate serial on create |
| `trpc/routers/guests.ts` | Add `generateSerialNumbers` mutation for backfill |

**Logic:**

```typescript
// On guest create (if VAPP enabled and matchCode configured)
async function generateSerialNumber(eventId: string, db: DB): Promise<string | null> {
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  const vapp = event?.settings?.vapp
  if (!vapp?.enabled || !vapp?.matchCode) return null

  // Atomic increment using database transaction
  const matchCode = vapp.matchCode
  const sequence = (vapp.nextSequence ?? 1).toString().padStart(6, '0')

  // Update counter atomically
  await db.update(events)
    .set({
      settings: {
        ...event.settings,
        vapp: { ...vapp, nextSequence: (vapp.nextSequence ?? 1) + 1 }
      }
    })
    .where(eq(events.id, eventId))

  return `${matchCode}-${sequence}`  // e.g., "M21-000001"
}
```

**Backfill endpoint:**

```typescript
generateSerialNumbers: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Get guests without serial numbers, ordered by createdAt
    // Generate for each in sequence
    // Return count updated
  })
```

**UI: Button in Event Settings or Guests Tab**

```
+------------------------------------------+
| SERIAL NUMBER MANAGEMENT                 |
+------------------------------------------+
| 150 guests without serial numbers        |
|                                          |
| [Generate Serial Numbers]                |
+------------------------------------------+
```

---

### Phase 38F: Public VAPP Voucher Page

**New files:**

| File | Purpose |
|------|---------|
| `app/[locale]/vapp/[token]/page.tsx` | Server component - prefetch |
| `app/[locale]/vapp/[token]/client.tsx` | Voucher display component |
| `components/vapp/vapp-voucher.tsx` | Voucher visual component |
| `components/vapp/vapp-download-button.tsx` | PDF download button |
| `trpc/routers/public-vapp.ts` | Public tRPC router for VAPP |

**URL Pattern:** `/vapp/[token]` (reuses guest's rsvpToken)

**Voucher Design (matching provided image):**

```
+------------------------------------------------+
| [Custom Background Image from branding]        |
|                                                |
|                       Serial No. M21-000001    |
|                       +--------------------+   |
|  [EVENT LOGO]         | Venue code         |   |
|                       |      KAS           |   |
|  EVENT NAME           +--------------------+   |
+------------------------------------------------+
| +------------------+ +--------------------+    |
| | Match code       | | Access code        |    |
| |      M21         | |       P1           |    |
| |                  | |      VVIP          |    |
| |                  | | (category name)    |    |
| +------------------+ +--------------------+    |
+------------------------------------------------+
| [Print] [Download PDF]                         |
+------------------------------------------------+
```

**Data displayed:**
- Serial No: Guest's `serialNumber` field
- Venue Code: From `event.settings.vapp.venueCode`
- Match Code: From `event.settings.vapp.matchCode`
- Access Code: From `category.vappAccessCode`
- Category Label: From `category.name`
- Event Logo: From `event.branding.logo` (resolved via branding system)
- Background: From `event.branding.vappBackgroundImage`

**tRPC endpoint (public):**

```typescript
// trpc/routers/public-vapp.ts
export const publicVappRouter = createTRPCRouter({
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      // Look up guest by rsvpToken
      const guest = await db.query.guests.findFirst({
        where: eq(guests.rsvpToken, input.token),
        with: {
          event: {
            with: { workspace: true }
          },
          category: true
        }
      })

      if (!guest) throw new TRPCError({ code: "NOT_FOUND" })
      if (!guest.serialNumber) throw new TRPCError({ code: "NOT_FOUND", message: "No VAPP assigned" })

      const vapp = guest.event.settings?.vapp
      if (!vapp?.enabled) throw new TRPCError({ code: "NOT_FOUND", message: "VAPP not enabled" })

      // Resolve branding (inherits from workspace)
      const resolvedBranding = resolveBranding(
        guest.event.workspace.branding,
        guest.event.branding
      )

      return {
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          serialNumber: guest.serialNumber,
        },
        event: {
          id: guest.event.id,
          name: guest.event.name,
          nameAr: guest.event.nameAr,
        },
        category: {
          name: guest.category?.name,
          vappAccessCode: guest.category?.vappAccessCode,
        },
        vapp: {
          venueCode: vapp.venueCode,
          matchCode: vapp.matchCode,
        },
        branding: {
          logo: resolvedBranding.logo,
          vappBackgroundImage: guest.event.branding?.vappBackgroundImage,
        }
      }
    })
})
```

---

### Phase 38G: PDF Generation

**Dependencies:**

```bash
pnpm add puppeteer
```

**Why Puppeteer over html2canvas:**
- Uses actual Chrome rendering engine (pixel-perfect output)
- Native PDF generation (not image-to-PDF conversion)
- Full CSS support including `lab()` colors
- Consistent output regardless of user's browser
- Better resolution for print-quality documents

**Implementation:**

**API Route - `app/api/vapp/pdf/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token")
  const locale = searchParams.get("locale") || "en"

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  let browser = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 3 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    await page.goto(`${baseUrl}/${locale}/vapp/${token}?print=true`, {
      waitUntil: "networkidle0",
    })

    await page.waitForSelector("#vapp-voucher", { timeout: 10000 })

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    })

    await browser.close()

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vapp-${token}.pdf"`,
      },
    })
  } catch (error) {
    if (browser) await browser.close()
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
```

**Download Button - `components/vapp/vapp-download-button.tsx`:**

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

interface VappDownloadButtonProps {
  elementId: string
  filename: string
  locale: string
  token: string
}

export function VappDownloadButton({ elementId, filename, locale, token }: VappDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/vapp/pdf?token=${token}&locale=${locale}`)
      if (!response.ok) throw new Error("Failed to generate PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button onClick={() => window.print()} variant="outline">
        Print
      </Button>
      <Button onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? "Generating..." : "Download PDF"}
      </Button>
    </div>
  )
}
```

**Print Mode Support:**

The VAPP page (`components/vapp/vapp-page.tsx`) supports a `?print=true` query parameter that hides buttons and renders only the voucher for PDF capture.

---

### Phase 38H: Guest List Integration

**Files to modify:**

| File | Changes |
|------|---------|
| `components/guests/guests-toolbar.tsx` | Add "VAPP" button for single selection |
| `components/guests/vapp-link-dialog.tsx` | New dialog to show/copy VAPP link |
| `components/events/event-guests-tab.tsx` | Handle "get_vapp_link" action |

**UI Pattern (following get_form_link pattern from Stage 35):**

```tsx
// In guests-toolbar.tsx, add to BulkAction type
type BulkAction = "delete" | "send_invitation" | "send_email" | "get_form_link" | "get_vapp_link"

// In toolbar, when selectedCount === 1 and VAPP is configured
{selectedCount === 1 && hasVappConfig && (
  <Button variant="ghost" size="sm" onClick={() => onBulkAction("get_vapp_link")}>
    <Car className="mr-1 h-4 w-4" />
    VAPP
  </Button>
)}
```

**Dialog Component:**

```typescript
// components/guests/vapp-link-dialog.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface VappLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guest: {
    firstName: string
    lastName: string
    serialNumber: string | null
    rsvpToken: string
  }
}

export function VappLinkDialog({ open, onOpenChange, guest }: VappLinkDialogProps) {
  const vappUrl = `${window.location.origin}/vapp/${guest.rsvpToken}`

  const copyLink = () => {
    navigator.clipboard.writeText(vappUrl)
    toast.success("VAPP link copied")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            VAPP Link for {guest.firstName} {guest.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {guest.serialNumber ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-mono text-lg">{guest.serialNumber}</p>
              </div>

              <div className="flex gap-2">
                <Input value={vappUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <Button asChild className="w-full">
                <a href={vappUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              This guest does not have a serial number assigned yet.
              Generate serial numbers from event settings.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Phase 38I: Email Template Integration

**Files to modify:**

| File | Changes |
|------|---------|
| `lib/email/render-structured.ts` | Add {{vapp.link}} and {{vapp.serialNumber}} variables |
| `components/email-templates/variable-inserter.tsx` | Add VAPP section |

**New Template Variables:**

```typescript
// In lib/email/render-structured.ts - buildVariableContext()

// Add VAPP variables when available
if (guest.serialNumber && event.settings?.vapp?.enabled) {
  const baseUrl = getRsvpBaseUrl(event) // Reuse existing URL logic
  variables['vapp.link'] = `${baseUrl.replace('/rsvp/', '/vapp/')}/${guest.rsvpToken}`
  variables['vapp.serialNumber'] = guest.serialNumber
  variables['vapp.venueCode'] = event.settings.vapp.venueCode ?? ''
  variables['vapp.matchCode'] = event.settings.vapp.matchCode ?? ''
  variables['vapp.accessCode'] = category?.vappAccessCode ?? ''
}
```

**Variable Inserter UI Update:**

Add "VAPP" section to variable dropdown in `components/email-templates/variable-inserter.tsx`:

```typescript
// Add to VARIABLE_GROUPS
{
  label: "VAPP",
  variables: [
    { key: "vapp.link", label: "VAPP Link", description: "Link to guest's parking permit" },
    { key: "vapp.serialNumber", label: "Serial Number", description: "Guest's VAPP serial number" },
  ]
}
```

---

### Phase 38J: Translations

**Files to modify:**

| File | Changes |
|------|---------|
| `messages/en.json` | Add VAPP translations |
| `messages/ar.json` | Add Arabic translations |

**English Keys:**

```json
{
  "vapp": {
    "title": "Vehicle Access Parking Permit",
    "settings": "VAPP Settings",
    "enable": "Enable VAPP",
    "enableDescription": "Enable vehicle access parking permits for this event",
    "venueCode": "Venue Code",
    "venueCodeDescription": "3-letter code for the venue (e.g., KAS)",
    "matchCode": "Match Code",
    "matchCodeDescription": "Code for this match/session (e.g., M21)",
    "accessCode": "Access Code",
    "accessCodeDescription": "Access level code shown on permit (e.g., P1)",
    "serialNumber": "Serial Number",
    "backgroundImage": "VAPP Background Image",
    "backgroundImageDescription": "Custom background for parking permit vouchers",
    "downloadPdf": "Download PDF",
    "print": "Print",
    "copyLink": "Copy VAPP Link",
    "linkCopied": "VAPP link copied",
    "openInNewTab": "Open in New Tab",
    "generateSerials": "Generate Serial Numbers",
    "generateSerialsDescription": "Generate serial numbers for {count} guests",
    "generateSerialsSuccess": "Generated serial numbers for {count} guests",
    "noSerialNumber": "No serial number assigned",
    "noVappConfig": "VAPP not configured for this event",
    "voucher": {
      "serialNo": "Serial No.",
      "venueCode": "Venue code",
      "matchCode": "Match code",
      "accessCode": "Access code"
    }
  }
}
```

**Arabic Keys:**

```json
{
  "vapp": {
    "title": "تصريح دخول المركبات لمواقف السيارات",
    "settings": "إعدادات VAPP",
    "enable": "تفعيل VAPP",
    "enableDescription": "تفعيل تصاريح دخول المركبات لهذا الحدث",
    "venueCode": "رمز الموقع",
    "venueCodeDescription": "رمز مكون من 3 أحرف للموقع",
    "matchCode": "رمز المباراة",
    "matchCodeDescription": "رمز هذه المباراة/الجلسة",
    "accessCode": "رمز الدخول",
    "accessCodeDescription": "رمز مستوى الدخول المعروض على التصريح",
    "serialNumber": "الرقم التسلسلي",
    "backgroundImage": "صورة خلفية VAPP",
    "backgroundImageDescription": "خلفية مخصصة لقسائم تصريح وقوف السيارات",
    "downloadPdf": "تحميل PDF",
    "print": "طباعة",
    "copyLink": "نسخ رابط VAPP",
    "linkCopied": "تم نسخ رابط VAPP",
    "openInNewTab": "فتح في تبويب جديد",
    "generateSerials": "إنشاء الأرقام التسلسلية",
    "generateSerialsDescription": "إنشاء أرقام تسلسلية لـ {count} ضيف",
    "generateSerialsSuccess": "تم إنشاء أرقام تسلسلية لـ {count} ضيف",
    "noSerialNumber": "لم يتم تعيين رقم تسلسلي",
    "noVappConfig": "لم يتم تكوين VAPP لهذا الحدث",
    "voucher": {
      "serialNo": "الرقم التسلسلي",
      "venueCode": "رمز الموقع",
      "matchCode": "رمز المباراة",
      "accessCode": "رمز الدخول"
    }
  }
}
```

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `app/[locale]/vapp/[token]/page.tsx` | Public VAPP page (server) |
| `components/vapp/vapp-page.tsx` | Public VAPP client component |
| `components/vapp/vapp-voucher.tsx` | Voucher display component |
| `components/vapp/vapp-download-button.tsx` | PDF download functionality |
| `app/api/vapp/pdf/route.ts` | Puppeteer-based PDF generation API |
| `components/guests/vapp-link-dialog.tsx` | Dialog for copying VAPP link |
| `trpc/routers/public-vapp.ts` | Public tRPC router for VAPP |

### Modified Files

| File | Changes |
|------|---------|
| `server/db/schemas/event.ts` | Add vapp to settings type, vappBackgroundImage to branding |
| `server/db/schemas/guest-category.ts` | Add vappAccessCode column |
| `server/db/schemas/guest.ts` | Add serialNumber column |
| `components/events/event-settings-tab.tsx` | Add VAPP Settings card |
| `components/events/event-branding-tab.tsx` | Add VAPP Background Image section |
| `components/guests/category-form.tsx` | Add vappAccessCode field |
| `trpc/routers/events.ts` | Update settings/branding validation |
| `trpc/routers/guests.ts` | Serial number generation |
| `trpc/routers/guest-categories.ts` | Include vappAccessCode |
| `trpc/routers/_app.ts` | Register publicVappRouter |
| `components/guests/guests-toolbar.tsx` | Add VAPP button |
| `components/events/event-guests-tab.tsx` | Handle get_vapp_link action |
| `lib/email/render-structured.ts` | Add VAPP variables |
| `components/email-templates/variable-inserter.tsx` | Add VAPP section |
| `messages/en.json` | Add translations |
| `messages/ar.json` | Add Arabic translations |

---

## Dependencies

```bash
pnpm add puppeteer
```

Note: `html2canvas` and `jspdf` were previously used but replaced with Puppeteer for better quality and reliability.

---

## Verification Checklist

### Phase 38A: Schema
- [ ] Event settings type includes vapp object
- [ ] Event branding type includes vappBackgroundImage
- [ ] Guest category has vappAccessCode column
- [ ] Guest has serialNumber column with index
- [ ] Database migration applied

### Phase 38B: Event Settings
- [ ] VAPP Settings card appears in event settings tab
- [ ] Enable toggle works
- [ ] Venue code, match code saved correctly

### Phase 38C: Event Branding
- [ ] VAPP Background Image section appears in branding tab
- [ ] Image upload works (S3)
- [ ] Image displays in preview

### Phase 38D: Category
- [ ] Access code field appears in category form
- [ ] Value saved and retrieved correctly

### Phase 38E: Serial Numbers
- [ ] Serial auto-generated on guest creation (when VAPP enabled)
- [ ] Backfill mutation works for existing guests
- [ ] Sequence increments correctly
- [ ] No duplicate serial numbers

### Phase 38F: Public Page
- [ ] /vapp/[token] route works
- [ ] Voucher displays correctly with all fields
- [ ] Event branding (logo, background) applied
- [ ] RTL layout works for Arabic

### Phase 38G: PDF
- [ ] Download button generates PDF
- [ ] Print button opens print dialog
- [ ] PDF quality is acceptable
- [ ] Background image included in PDF

### Phase 38H: Guest List
- [ ] VAPP button appears for single guest selection
- [ ] Button only shows when VAPP is enabled
- [ ] Dialog shows serial number and link
- [ ] Copy link works

### Phase 38I: Email
- [ ] {{vapp.link}} variable available in inserter
- [ ] {{vapp.serialNumber}} variable available
- [ ] Variables render correctly in sent emails
- [ ] Variables only show when VAPP is enabled

### Phase 38J: i18n
- [ ] All EN translations present
- [ ] All AR translations present
- [ ] RTL layout works on voucher page

---

## Implementation Order

**Recommended sequence:**

1. **Phase 38A**: Database schema updates (run migrations)
2. **Phase 38B**: Event Settings UI (venueCode, matchCode, enable toggle)
3. **Phase 38C**: Event Branding Tab (vappBackgroundImage upload)
4. **Phase 38D**: Category access code field
5. **Phase 38E**: Serial number generation (auto on create + backfill)
6. **Phase 38F**: Public VAPP voucher page
7. **Phase 38G**: PDF download functionality
8. **Phase 38H**: Guest list VAPP button integration
9. **Phase 38I**: Email template variables
10. **Phase 38J**: Translations

Each phase can be completed and tested independently.

---

## Related Documents

- [Stage 5: Admin Dashboard](./05-admin-dashboard.md) - Event tabs, guest list patterns
- [Stage 9: Branding System](./09-branding-system.md) - Branding inheritance, image upload
- [Stage 35: Token-Based Form Access](./35-token-based-form-access.md) - Guest toolbar action pattern, email template integration
