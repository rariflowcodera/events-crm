# 11. Custom Font Branding

## Summary

Add the ability for users to upload custom fonts (.woff2/.woff) separately for English and Arabic, applying them to RSVP pages and email templates.

**Example use case**: Brand guidelines specify "DIN Next" for English and "DIN Next Arabic" for Arabic.

## Requirements

- **Font File Upload** - users upload .woff2/.woff files directly (max 2MB)
- **Separate fonts for English and Arabic** - different font files per language
- **Scope**: RSVP pages + Email templates (guest-facing content)

---

## Implementation Steps

### Phase 1: Backend Infrastructure

#### 1.1 Update EventBranding Type
**File: `server/db/schemas/event.ts`**

```typescript
export type EventBranding = {
  // ... existing fields
  fonts?: {
    english?: {
      name: string           // Display name (e.g., "DIN Next")
      url: string            // Font file URL
      format: "woff2" | "woff"
    }
    arabic?: {
      name: string           // Display name (e.g., "DIN Next Arabic")
      url: string            // Font file URL
      format: "woff2" | "woff"
    }
  }
}
```

#### 1.2 Add Font Validation Schema
**File: `lib/schemas.ts`**

```typescript
export const fontConfigSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().max(2048).optional(),
  format: z.enum(["woff2", "woff"]),
}).optional()

export const fontsConfigSchema = z.object({
  english: fontConfigSchema,
  arabic: fontConfigSchema,
}).optional()
```

#### 1.3 Create Font Upload Route
**File: `app/api/font-upload/route.ts`** (NEW)

- Accept font files: `font/woff2`, `font/woff`, `application/font-woff2`, `application/font-woff`
- Max size: 2MB
- Store in: `uploads/{userId}/fonts/{hash}.{ext}`
- Return URL: `/api/file?user={userId}&name=fonts/{filename}`

#### 1.4 Update File Serving Route
**File: `app/api/file/route.ts`**

Add font MIME types:
```typescript
".woff": "font/woff",
".woff2": "font/woff2",
```

Add CORS header for font files:
```typescript
"Access-Control-Allow-Origin": "*"
```

#### 1.5 Create Font Utility
**File: `lib/fonts.ts`** (NEW)

```typescript
export function generateFontFaceCSS(fonts: EventBranding["fonts"]): string
export function getFontFamilyStack(locale: "en" | "ar", fonts?: EventBranding["fonts"]): string
```

---

### Phase 2: Branding UI

#### 2.1 Create Font Upload Component
**File: `components/branding/font-upload.tsx`** (NEW)

- Dropzone for .woff2/.woff files
- Text input for font display name
- Preview text in uploaded font
- Remove button

#### 2.2 Update Event Branding Tab
**File: `components/events/event-branding-tab.tsx`**

Add fonts section after background image:
```
┌─────────────────────────────────────────────┐
│ Custom Fonts                                │
│ Upload custom fonts for RSVP pages & emails │
├─────────────────────────────────────────────┤
│ English Font          │ Arabic Font         │
│ ┌─────────────────┐   │ ┌─────────────────┐ │
│ │ [Dropzone]      │   │ │ [Dropzone]      │ │
│ └─────────────────┘   │ └─────────────────┘ │
│ Name: [DIN Next    ]  │ Name: [DIN Next AR] │
│ Preview: Sample Text  │ Preview: نص عربي    │
└─────────────────────────────────────────────┘
```

---

### Phase 3: RSVP Page Integration

**File: `components/rsvp/rsvp-page.tsx`**

1. Generate `@font-face` CSS from branding fonts
2. Inject via `<style>` tag
3. Apply `fontFamily` to root container based on `displayLocale`

```tsx
{fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
<div style={{ fontFamily: getFontFamilyStack(displayLocale, fonts) }}>
```

---

### Phase 4: Email Integration

#### 4.1 Update Email Preview
**File: `app/[locale]/(web)/(dashboard)/[slug]/events/[eventSlug]/email-preview/page.tsx`**

Inject font CSS into iframe `srcDoc`:
```html
<style>
  @font-face { ... }
  body { font-family: 'EventFont-EN', system-ui, sans-serif; }
</style>
```

#### 4.2 Update Email Sending (if applicable)
Wrap email HTML with font-face declarations before sending.

---

### Phase 5: i18n Translations

**Files: `messages/en.json`, `messages/ar.json`**

```json
"fonts": "Custom Fonts",
"fontsDescription": "Upload custom fonts for RSVP pages and emails",
"englishFont": "English Font",
"arabicFont": "Arabic Font",
"fontName": "Font Name",
"fontNamePlaceholder": "e.g., DIN Next",
"uploadFont": "Upload Font",
"fontFormats": "Supported: .woff2, .woff (max 2MB)",
"fontUploaded": "Font uploaded successfully",
"fontRemoved": "Font removed"
```

---

## Files Summary

| File | Action |
|------|--------|
| `server/db/schemas/event.ts` | Modify - add `fonts` to EventBranding type |
| `lib/schemas.ts` | Modify - add font validation schemas |
| `lib/fonts.ts` | **NEW** - font CSS generation utilities |
| `app/api/font-upload/route.ts` | **NEW** - font file upload endpoint |
| `app/api/file/route.ts` | Modify - add font MIME types + CORS |
| `components/branding/font-upload.tsx` | **NEW** - font upload component |
| `components/branding/index.ts` | Modify - export FontUpload |
| `components/events/event-branding-tab.tsx` | Modify - add fonts section |
| `components/rsvp/rsvp-page.tsx` | Modify - inject font CSS |
| `app/.../email-preview/page.tsx` | Modify - inject fonts in preview |
| `messages/en.json` | Modify - add font translations |
| `messages/ar.json` | Modify - add Arabic font translations |

---

## Technical Notes

### Font CSS Strategy
- Use unicode-range to separate Latin (English) and Arabic character sets
- Generate unique font-family names: `EventFont-EN`, `EventFont-AR`
- Fallback stack: custom font → system-ui → sans-serif

### Email Client Support
| Client | Web Font Support |
|--------|-----------------|
| Apple Mail, iOS Mail | ✅ Full |
| Outlook (Mac) | ✅ Full |
| Gmail (web) | ⚠️ Limited |
| Outlook (Windows) | ❌ None |

Graceful fallback to system fonts where not supported.

### Performance
- Font files cached with `Cache-Control: public, max-age=31536000, immutable`
- `font-display: swap` prevents invisible text during load

---

## Estimation

- **Backend (Phase 1)**: ~2-3 hours
- **UI Components (Phase 2)**: ~2-3 hours
- **RSVP Integration (Phase 3)**: ~1 hour
- **Email Integration (Phase 4)**: ~1-2 hours
- **i18n + Testing (Phase 5)**: ~1 hour

**Total**: ~7-10 hours
