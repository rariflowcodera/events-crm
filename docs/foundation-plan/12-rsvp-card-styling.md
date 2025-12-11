# 12. RSVP Card Styling (Accent Strip & Section Colors)

## Summary

Add visual styling options for RSVP page cards, including a decorative accent strip (like the gold bar in Asia Cup 2027 branding) and custom section header colors.

**Example**: Gold accent strip at top of cards, teal section headers with white text.

## Requirements

- **Accent Strip**: Decorative bar on cards with configurable color, position, and thickness
- **Section Header Color**: Global background + text color for all form section headers
- **Location**: All settings in Event Branding tab (not RSVP Form settings)
- **Scope**: Applies to RSVP pages

---

## Schema Changes

### Update EventBranding Type
**File: `server/db/schemas/event.ts`**

```typescript
export type EventBranding = {
  // ... existing fields (logo, colors, backgroundImage, backgroundImageMode, fonts)

  // NEW: Card styling
  cardAccent?: {
    enabled: boolean
    color: string              // Hex color (e.g., "#D4A84B" for gold)
    position: "top" | "bottom" | "left" | "right"
    thickness: "thin" | "medium" | "thick"  // 3px, 6px, 10px
  }

  sectionHeader?: {
    backgroundColor: string    // Hex color (e.g., "#006B5A" for teal)
    textColor: string          // Hex color (e.g., "#FFFFFF" for white)
  }
}
```

### Add Validation Schemas
**File: `lib/schemas.ts`**

```typescript
export const cardAccentSchema = z.object({
  enabled: z.boolean(),
  color: hexColorSchema,
  position: z.enum(["top", "bottom", "left", "right"]),
  thickness: z.enum(["thin", "medium", "thick"]),
}).optional()

export const sectionHeaderSchema = z.object({
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
}).optional()

// Add to eventBrandingSchema
export const eventBrandingSchema = baseBrandingSchema.extend({
  // ... existing
  cardAccent: cardAccentSchema,
  sectionHeader: sectionHeaderSchema,
})
```

---

## UI Components

### Card Accent Settings
**File: `components/branding/card-accent-settings.tsx`** (NEW)

```
┌─────────────────────────────────────────────────────┐
│ Card Accent Strip                                   │
├─────────────────────────────────────────────────────┤
│ [✓] Enable accent strip                             │
│                                                     │
│ Color:     [████████] #D4A84B                       │
│                                                     │
│ Position:  ○ Top  ○ Bottom  ○ Left  ○ Right        │
│                                                     │
│ Thickness: ○ Thin (3px)  ● Medium (6px)  ○ Thick   │
│                                                     │
│ Preview:                                            │
│ ┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┐  │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │
│ │                                               │  │
│ │   Sample Card Content                         │  │
│ │                                               │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Section Header Settings
**File: `components/branding/section-header-settings.tsx`** (NEW)

```
┌─────────────────────────────────────────────────────┐
│ Section Headers                                     │
├─────────────────────────────────────────────────────┤
│ Background: [████████] #006B5A                      │
│ Text Color: [████████] #FFFFFF                      │
│                                                     │
│ Preview:                                            │
│ ┌───────────────────────────────────────────────┐  │
│ │ ████████████████████████████████████████████ │  │
│ │ █  TRAVEL & LOGISTICS                       █ │  │
│ │ ████████████████████████████████████████████ │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Update Event Branding Tab
**File: `components/events/event-branding-tab.tsx`**

Add new section after Background Image:

```tsx
<Separator />

{/* Card Styling Section - NEW */}
<div className="space-y-4">
  <div>
    <h3 className="text-sm font-medium">{t("cardStyling")}</h3>
    <p className="text-xs text-muted-foreground">
      {t("cardStylingDescription")}
    </p>
  </div>

  <CardAccentSettings
    value={watchedValues.cardAccent}
    onChange={(accent) => handleCardAccentChange(accent)}
    disabled={isPending}
  />

  <SectionHeaderSettings
    value={watchedValues.sectionHeader}
    onChange={(header) => handleSectionHeaderChange(header)}
    disabled={isPending}
  />
</div>
```

---

## RSVP Page Integration

### Update Card Component
**File: `components/rsvp/rsvp-page.tsx`**

Apply accent strip to the main Card:

```tsx
// Helper for accent strip styles
function getAccentStyles(accent: EventBranding["cardAccent"]) {
  if (!accent?.enabled) return {}

  const thickness = { thin: "3px", medium: "6px", thick: "10px" }[accent.thickness]
  const color = accent.color

  switch (accent.position) {
    case "top":
      return { borderTop: `${thickness} solid ${color}` }
    case "bottom":
      return { borderBottom: `${thickness} solid ${color}` }
    case "left":
      return { borderLeft: `${thickness} solid ${color}` }
    case "right":
      return { borderRight: `${thickness} solid ${color}` }
  }
}

// In render:
<Card
  className="..."
  style={{
    ...getAccentStyles(event.branding?.cardAccent),
  }}
>
```

### Update Section Headers
**File: `components/rsvp/dynamic-form-renderer.tsx`**

Apply section header colors:

```tsx
// Section header with custom colors
<div
  className="px-4 py-2 rounded-t-lg"
  style={{
    backgroundColor: sectionHeader?.backgroundColor || undefined,
    color: sectionHeader?.textColor || undefined,
  }}
>
  <h3 className="font-semibold">{sectionTitle}</h3>
</div>
```

---

## Branding Preview Update

**File: `components/branding/branding-preview.tsx`**

Add accent strip and section header preview:

```tsx
<Card style={getAccentStyles(cardAccent)}>
  {/* Logo */}
  {/* Mock section header with sectionHeader colors */}
  <div style={{
    backgroundColor: sectionHeader?.backgroundColor,
    color: sectionHeader?.textColor
  }}>
    Travel & Logistics
  </div>
  {/* Rest of preview */}
</Card>
```

---

## i18n Translations

**Files: `messages/en.json`, `messages/ar.json`**

```json
{
  "branding": {
    "cardStyling": "Card Styling",
    "cardStylingDescription": "Customize the appearance of RSVP page cards",
    "cardAccent": "Accent Strip",
    "enableAccentStrip": "Enable accent strip",
    "accentColor": "Accent Color",
    "accentPosition": "Position",
    "accentPositionTop": "Top",
    "accentPositionBottom": "Bottom",
    "accentPositionLeft": "Left",
    "accentPositionRight": "Right",
    "accentThickness": "Thickness",
    "accentThicknessThin": "Thin",
    "accentThicknessMedium": "Medium",
    "accentThicknessThick": "Thick",
    "sectionHeaders": "Section Headers",
    "sectionBackgroundColor": "Background Color",
    "sectionTextColor": "Text Color"
  }
}
```

Arabic:
```json
{
  "branding": {
    "cardStyling": "تنسيق البطاقات",
    "cardStylingDescription": "تخصيص مظهر بطاقات صفحة التأكيد",
    "cardAccent": "شريط التمييز",
    "enableAccentStrip": "تفعيل شريط التمييز",
    "accentColor": "لون الشريط",
    "accentPosition": "الموضع",
    "accentPositionTop": "أعلى",
    "accentPositionBottom": "أسفل",
    "accentPositionLeft": "يسار",
    "accentPositionRight": "يمين",
    "accentThickness": "السُمك",
    "accentThicknessThin": "رفيع",
    "accentThicknessMedium": "متوسط",
    "accentThicknessThick": "سميك",
    "sectionHeaders": "عناوين الأقسام",
    "sectionBackgroundColor": "لون الخلفية",
    "sectionTextColor": "لون النص"
  }
}
```

---

## Files Summary

| File | Action |
|------|--------|
| `server/db/schemas/event.ts` | Modify - add `cardAccent` and `sectionHeader` to EventBranding |
| `lib/schemas.ts` | Modify - add validation schemas |
| `components/branding/card-accent-settings.tsx` | **NEW** - accent strip config UI |
| `components/branding/section-header-settings.tsx` | **NEW** - section header config UI |
| `components/branding/index.ts` | Modify - export new components |
| `components/events/event-branding-tab.tsx` | Modify - add card styling section |
| `components/branding/branding-preview.tsx` | Modify - show accent + section preview |
| `components/rsvp/rsvp-page.tsx` | Modify - apply accent strip to cards |
| `components/rsvp/dynamic-form-renderer.tsx` | Modify - apply section header colors |
| `messages/en.json` | Modify - add translations |
| `messages/ar.json` | Modify - add Arabic translations |

---

## Naming Suggestion

For the accent strip feature, consider these names:
- **"Card Accent Strip"** or **"Accent Strip"** - descriptive
- **"Decorative Border"** - more generic
- **"Brand Bar"** - emphasizes branding purpose

Recommended: **"Accent Strip"** - clear, concise, matches the visual element.

---

## Estimation

- **Schema + Validation**: ~30 min
- **UI Components**: ~2 hours
- **Branding Tab Integration**: ~1 hour
- **RSVP Page Integration**: ~1 hour
- **Preview Updates**: ~30 min
- **i18n**: ~30 min

**Total**: ~5-6 hours
