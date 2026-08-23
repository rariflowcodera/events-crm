# Stage 46: Guest Reference Number & QR Code

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Generate a unique reference number (PNR-style, e.g. `EVT-7K3F9Q`) for each guest once they **confirm attendance** via RSVP, and produce a QR code encoding that reference so it can be:

- Displayed on the guest's RSVP confirmation / VAPP-style pages
- Embedded as an `<img>` in email templates (confirmation emails, reminders), personalized per guest — same insertion pattern as the existing RSVP link / VAPP link variables
- Scanned later (future stage) for on-site check-in, reusing the [Stage 28 attendance fields](./28-guest-check-in.md) (`attendedAt`, `attendedBy`)

This does **not** implement scanning/check-in-by-QR in this stage — it only generates the reference + QR image and makes them available in the UI and email templates. Wiring the check-in flow to accept scanned QR input is a follow-up stage once this lands.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When generated | On RSVP confirm (`status → "confirmed"`) | Matches requirement: "once the guest has confirmed" — no reference issued to declined/pending guests |
| Storage | `referenceNumber` column on `guest` | Same pattern as VAPP's `serialNumber`; direct, no join |
| Format | `{eventRefPrefix}-{6-char base32 code}` e.g. `GALA-7K3F9Q` | PNR-style, short, unambiguous charset (no 0/O/1/I) |
| Prefix source | New `event.settings.referencePrefix` (falls back to first 4 letters of event name, uppercased) | Consistent with VAPP's `matchCode`/`venueCode` pattern of event-level config |
| Uniqueness | Unique per event via retry-on-collision insert (same approach as `rsvpShortCode`) | Simple, no separate counter table needed |
| QR encoding | The **raw reference number** (e.g. `GALA-7K3F9Q`), not a URL | Keeps the printed/scanned payload short and human-typeable as a fallback; a future check-in stage will add a `referenceNumber → guest` lookup (indexed already via the unique `(event_id, reference_number)` index) rather than relying on the RSVP token |
| QR image delivery | Server-rendered PNG via new API route `/api/qr/[token].png` using the `qrcode` npm package | Emails need a real image URL (SMTP has no client-side JS); mirrors the Puppeteer PDF route pattern in Stage 38 |
| QR image caching | None — generated on request, cheap (~ms), no S3 storage needed | Avoids extra storage/cleanup; QR content (URL) never changes for a guest |
| Email variable | `{{guest.qrCode}}` → renders `<img src="{baseUrl}/api/qr/{token}.png" ...>` | Same variable-processing pattern as `{{image.UUID}}` / `{{vapp.link}}` |
| Regeneration | Reference number is immutable once set; if RSVP status is later changed away from confirmed and back, the existing reference is reused (not regenerated) | Avoids invalidating already-sent QR codes/emails |

---

## Data Model Changes

### 1. Guest Schema (new field)

**File**: `server/db/schemas/guest.ts`

```sql
ALTER TABLE guest ADD COLUMN reference_number TEXT;
CREATE UNIQUE INDEX guest_reference_number_event_idx ON guest(event_id, reference_number);
```

```typescript
// Reference Number / QR (generated on RSVP confirm)
referenceNumber: text("reference_number"), // e.g., "GALA-7K3F9Q"
```

### 2. Event Schema - Settings (new field)

**File**: `server/db/schemas/event.ts`

```typescript
export type EventSettings = {
  // ... existing fields ...
  referencePrefix?: string // e.g., "GALA" — used to build guest reference numbers
}
```

---

## Implementation Phases

### Phase 46A: Database Schema Updates

| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Add `referenceNumber` column + unique index on `(event_id, reference_number)` |
| `server/db/schemas/event.ts` | Add `referencePrefix` to `EventSettings` type |
| `lib/schemas.ts` | Add Zod validation for `referencePrefix` |

**Run:** `npm run db:generate` then `npm run db:migrate`

---

### Phase 46B: Reference Number Generation

**File**: `lib/guest-reference.ts` (new)

```typescript
const REFERENCE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // no 0/O/1/I

function randomReferenceCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += REFERENCE_CHARSET[Math.floor(Math.random() * REFERENCE_CHARSET.length)]
  }
  return code
}

export function buildReferencePrefix(event: { name: string; settings?: { referencePrefix?: string } | null }): string {
  if (event.settings?.referencePrefix) return event.settings.referencePrefix.toUpperCase()
  return event.name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "EVT"
}

/**
 * Generates and persists a unique referenceNumber for a guest, retrying on
 * unique-index collision (same approach as rsvpShortCode generation).
 * Returns the existing referenceNumber if the guest already has one.
 */
export async function ensureGuestReferenceNumber(
  db: DB,
  guest: { id: string; eventId: string; referenceNumber: string | null },
  event: { name: string; settings?: { referencePrefix?: string } | null }
): Promise<string> {
  if (guest.referenceNumber) return guest.referenceNumber

  const prefix = buildReferencePrefix(event)

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${randomReferenceCode()}`
    try {
      await db
        .update(guests)
        .set({ referenceNumber: candidate })
        .where(and(eq(guests.id, guest.id), isNull(guests.referenceNumber)))
      return candidate
    } catch (err) {
      if (isUniqueViolation(err)) continue
      throw err
    }
  }
  throw new Error("Failed to generate unique reference number")
}
```

**Trigger point** — `app/api/rsvp/[token]/route.ts`, in the existing confirm-response handler (same place `status: responseStatus` is set, around line 285-307):

```typescript
if (responseStatus === "confirmed") {
  await ensureGuestReferenceNumber(db, guest, event)
}
```

**Backfill mutation** (for guests already confirmed before this stage shipped), mirroring Stage 38E's `generateSerialNumbers`:

```typescript
// trpc/routers/guests.ts
generateReferenceNumbers: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Get confirmed guests without referenceNumber, generate for each
  })
```

---

### Phase 46C: QR Image API Route

**Dependency:**

```bash
npm install qrcode
npm install -D @types/qrcode
```

**New file**: `app/api/qr/[token]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { db } from "@/server/db"
import { guests } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Looked up by the guest's RSVP token (existing public-access pattern), but
  // the QR payload itself is the reference number, not this token or a URL.
  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
  })

  if (!guest || !guest.referenceNumber) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const png = await QRCode.toBuffer(guest.referenceNumber, {
    type: "png",
    width: 400,
    margin: 1,
  })

  return new NextResponse(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  })
}
```

Note: token-keyed like existing RSVP/VAPP public lookups — no auth required (same trust model as the RSVP link itself: possession of the token is the access control).

---

### Phase 46D: Email Template Integration

**File**: `lib/email/render-structured.ts`

Add to `buildVariableContext()` (alongside the existing `vapp.serialNumber` block, ~line 184):

```typescript
"guest.referenceNumber": guest.referenceNumber || "",
```

Add QR image processing, following the existing `processImageVariables` pattern (new function `processQrCodeVariable`, called from the same pipeline spot as `processVappLinkVariables`):

```typescript
function processQrCodeVariable(html: string, guest: Guest): string {
  if (!guest.referenceNumber) {
    return html.replace(/\{\{guest\.qrCode\}\}/g, "")
  }
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/qr/${guest.rsvpToken}`
  const imgTag = `<img src="${qrUrl}" alt="QR Code" width="160" height="160" style="display:block;margin:0 auto;" />`
  return html.replace(/\{\{guest\.qrCode\}\}/g, imgTag)
}
```

Wire into the pipeline in `renderStructuredEmail` (near the existing `processVappLinkVariables` call):

```typescript
html = processQrCodeVariable(html, guest)
```

**File**: `components/email-templates/qr-code-inserter.tsx` (new, mirrors `vapp-inserter.tsx`)

Inserts `{{guest.qrCode}}` and `{{guest.referenceNumber}}` into the structured content editor.

**File**: `components/email-templates/structured-content-editor.tsx`

Add `QrCodeInserter` to the toolbar alongside `VappInserter`.

---

### Phase 46E: Guest List / Detail Display

| File | Changes |
|------|---------|
| `lib/guest-columns.ts` | Add `referenceNumber` column (group: `rsvp`, similar placement to `serialNumber`) |
| `components/guests/guest-details-sheet.tsx` (or equivalent detail view) | Show reference number + rendered QR (`<img src="/api/qr/{token}" />`) when present |
| `components/guests/guests-toolbar.tsx` | Optional: reuse the VAPP-link-dialog pattern for a "Reference & QR" quick-view dialog on single selection |

---

### Phase 46F: Translations

**Files:** `messages/en.json`, `messages/ar.json`

```json
{
  "reference": {
    "title": "Reference Number",
    "qrCode": "QR Code",
    "insertQrCode": "Insert QR Code",
    "insertReferenceNumber": "Insert Reference Number",
    "noReference": "Reference number not yet assigned — guest has not confirmed attendance",
    "copyReference": "Copy reference number"
  }
}
```

(Arabic translations added alongside, following the existing `vapp` key structure.)

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `lib/guest-reference.ts` | Reference number generation + collision retry |
| `app/api/qr/[token]/route.ts` | Server-rendered PNG QR code, keyed by guest RSVP token |
| `components/email-templates/qr-code-inserter.tsx` | Toolbar inserter for `{{guest.qrCode}}` / `{{guest.referenceNumber}}` |

### Modified Files

| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Add `referenceNumber` column + unique index |
| `server/db/schemas/event.ts` | Add `referencePrefix` to `EventSettings` |
| `lib/schemas.ts` | Zod validation for `referencePrefix` |
| `app/api/rsvp/[token]/route.ts` | Call `ensureGuestReferenceNumber` on confirm |
| `trpc/routers/guests.ts` | `generateReferenceNumbers` backfill mutation |
| `lib/email/render-structured.ts` | `guest.referenceNumber` variable + `processQrCodeVariable` |
| `components/email-templates/structured-content-editor.tsx` | Add QR inserter to toolbar |
| `lib/guest-columns.ts` | Add `referenceNumber` column definition |
| Guest detail view component | Display reference number + QR image |
| `messages/en.json`, `messages/ar.json` | Translations |

---

## Dependencies

```bash
npm install qrcode
npm install -D @types/qrcode
```

(`qrcode.react` is already installed and used client-side in `components/forms/form-links-panel.tsx` for form-link QR previews — unrelated to this stage's server-rendered email QR, which needs a static image URL rather than a React component.)

---

## Verification Checklist

### Phase 46A: Schema
- [ ] Guest has `referenceNumber` column with unique index on `(event_id, reference_number)`
- [ ] Event settings type includes `referencePrefix`
- [ ] Migration applied

### Phase 46B: Generation
- [ ] Confirming RSVP assigns a `referenceNumber` when one doesn't exist
- [ ] Declining/maybe does NOT assign a reference number
- [ ] Re-confirming an already-confirmed guest does not change their reference number
- [ ] Backfill mutation assigns references to previously-confirmed guests without one
- [ ] No collisions across guests in the same event

### Phase 46C: QR Route
- [ ] `/api/qr/{token}` returns a valid PNG for a confirmed guest
- [ ] Returns 404 for a guest with no reference number
- [ ] QR decodes to the guest's correct reference number

### Phase 46D: Email
- [ ] `{{guest.qrCode}}` renders as an `<img>` pointing at the QR route
- [ ] `{{guest.referenceNumber}}` renders the human-readable code
- [ ] Both variables appear in the structured content editor's insert toolbar
- [ ] Unconfirmed guest's email renders the QR variable as empty (no broken image)

### Phase 46E: UI
- [ ] Guest detail view shows reference number + QR when present
- [ ] Guest list column optionally shows reference number

### Phase 46F: i18n
- [ ] EN/AR translations present

---

## Related Documents

- [Stage 28: Guest Check-In](./28-guest-check-in.md) — attendance fields this stage's QR will eventually feed into
- [Stage 38: VAPP Feature](./38-vapp-feature.md) — direct precedent for token-keyed public asset generation, email variable wiring, and PDF/image API routes
- [Stage 35: Token-Based Form Access](./35-token-based-form-access.md) — guest toolbar action + link dialog pattern
