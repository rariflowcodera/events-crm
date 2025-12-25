# Stage 39: Short RSVP URLs & Enhanced Link Previews

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Improve RSVP link sharing on WhatsApp and social media by:
1. Adding short 8-character URL aliases alongside existing UUIDs
2. Generating event-branded Open Graph previews
3. Creating dynamic OG images with event branding

---

## Problem Statement

When sharing RSVP links on WhatsApp/social media:
- **Long URLs**: UUID tokens are 36 characters (e.g., `c0c6e789-33b8-48cc-ad8a-dc99cb980da8`)
- **Generic previews**: Shows "Events CRM - Manage your events" instead of event-specific content

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Short code format | 8-char alphanumeric (a-z, 0-9) | URL-friendly, 2.8 trillion combinations |
| Storage approach | Add `rsvpShortCode` alongside `rsvpToken` | Backward compatible, no migration of existing data |
| Collision handling | Retry up to 5 times, fallback to 12 chars | Extremely low probability with 8 chars |
| OG image generation | `satori` + `sharp` | Self-hosted compatible (no Vercel Edge required) |
| Font support | Inter + Noto Sans Arabic | Full bilingual support |
| Image caching | 1 hour + stale-while-revalidate | Balance freshness vs performance |

---

## Data Model Changes

### Guest Schema

**File**: `server/db/schemas/guest.ts`

```typescript
// Add new field after rsvpToken (line 84)
rsvpShortCode: text("rsvp_short_code").unique(),

// Add index (line 140)
index("guest_rsvp_short_code_idx").on(table.rsvpShortCode),
```

---

## Implementation

### Phase 1: Short URL Alias

#### 1.1 Short Code Generator
**New file**: `lib/rsvp-short-code.ts`

```typescript
export function generateRsvpShortCode(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function generateUniqueRsvpShortCode(
  db: typeof import("@/server/db/config/database").db,
  maxAttempts = 5
): Promise<string>
```

#### 1.2 Guest Router Updates
**File**: `trpc/routers/guests.ts`

Update mutations to generate short codes:
- `create` - Generate short code on guest creation
- `bulkCreate` - Generate short codes for all guests in batch
- `regenerateRsvpToken` - Optionally regenerate short code

#### 1.3 URL Utility Update
**File**: `lib/rsvp-url.ts`

```typescript
// Support both string (legacy) and object (new) formats
export function getRsvpUrl(
  event: EventWithCustomDomain,
  guest: { rsvpToken: string; rsvpShortCode?: string | null } | string
): string
```

#### 1.4 Token Lookup Update
**Files**:
- `app/[locale]/rsvp/[token]/page.tsx`
- `app/api/rsvp/[token]/route.ts`

```typescript
// Check both token fields
where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token))
```

#### 1.5 Context Menu
**File**: `components/guests/guest-row-actions.tsx`

Add "Copy Short RSVP Link" option to guest row actions dropdown.

---

### Phase 2: Enhanced Open Graph Metadata

**File**: `app/[locale]/rsvp/[token]/page.tsx`

Update `generateMetadata` to return:
- `og:title` - Event name (bilingual)
- `og:description` - Event date, time, venue
- `og:image` - Dynamic OG image URL
- `og:url` - Canonical URL
- Twitter card tags
- Alternate language URLs

---

### Phase 3: Dynamic OG Image Generation

#### 3.1 Dependencies
```bash
pnpm add satori
```

#### 3.2 OG Image API Route
**New file**: `app/api/og/rsvp/[token]/route.tsx`

Generate 1200x630 PNG images with:
- Event logo (from branding)
- Event name (English + Arabic)
- Date and time
- Venue
- Brand colors as background/gradient
- "Confirm Your Attendance" CTA

**Caching**: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`

#### 3.3 Font Caching
**New file**: `lib/og-fonts.ts`

Cache Inter and Noto Sans Arabic fonts in memory for performance.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `lib/rsvp-short-code.ts` | Short code generation with collision handling |
| `lib/og-fonts.ts` | Font caching for OG images |
| `app/api/og/rsvp/[token]/route.tsx` | Dynamic OG image generation API |

### Files to Modify
| File | Changes |
|------|---------|
| `server/db/schemas/guest.ts` | Add `rsvpShortCode` field + index |
| `trpc/routers/guests.ts` | Generate short codes in create/bulk/regenerate |
| `lib/rsvp-url.ts` | Update to prefer short codes |
| `app/[locale]/rsvp/[token]/page.tsx` | Dual lookup + enhanced metadata |
| `app/api/rsvp/[token]/route.ts` | Dual token lookup |
| `components/guests/guest-row-actions.tsx` | Add "Copy Short RSVP Link" menu item |
| `components/guests/guests-data-table.tsx` | Include `rsvpShortCode` in guest data |

---

## Expected Results

**Before:**
- URL: `https://events.guest-afcu23.com/rsvp/c0c6e789-33b8-48cc-ad8a-dc99cb980da8`
- Preview: "Events CRM - Manage your events with ease"

**After:**
- URL: `https://events.guest-afcu23.com/rsvp/abc12xyz`
- Preview: Event-branded card with logo, name, date, venue, and custom OG image

---

## Related Documents

- [04-routers-rsvp.md](./04-routers-rsvp.md) - RSVP system foundation
- [09-branding-system.md](./09-branding-system.md) - Event branding
- [10-custom-domains.md](./10-custom-domains.md) - Custom domain support
