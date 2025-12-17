# Stage 33: Visual RSVP Response Style

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Add an optional visual style for RSVP response options (Yes/No/Maybe) on the first page of the RSVP form. When enabled, display icon boxes instead of plain radio buttons while respecting configured labels.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Icons** | Check, X, Question | Universally understood symbols for Yes/No/Maybe |
| **Layout** | Horizontal with mobile stack | Side by side on desktop, vertical on mobile for better UX |
| **Toggle** | Optional setting (default: off) | Backwards compatible, opt-in enhancement |
| **Auto-advance** | Selection triggers navigation | Streamlined UX when visual style enabled |
| **Button hiding** | Hide Next on step 0 | Selection drives navigation, no redundant button |

---

## Design

### Visual Style Components

When `useVisualResponseStyle` is enabled:
- **Confirm**: Green circle with checkmark icon
- **Decline**: Red circle with X icon
- **Maybe**: Amber circle with question mark icon

### Behavior
1. User sees icon boxes instead of radio buttons
2. Clicking an option selects it AND auto-advances to next step (for multi-step forms)
3. Clicking "Decline" shows Submit button immediately (no next step needed)
4. Next button is hidden on step 0 when visual style is enabled
5. Labels from settings are respected in visual rendering

---

## Schema Changes

### 1. RsvpFormSettings Type
**File**: `server/db/schemas/event.ts`

```typescript
export type RsvpFormSettings = {
  // ... existing fields ...
  useVisualResponseStyle?: boolean // Default: false - show icon boxes instead of radio buttons
}
```

### 2. Zod Validation Schema
**File**: `lib/schemas.ts`

```typescript
export const rsvpFormSettingsSchema = z.object({
  // ... existing fields ...
  useVisualResponseStyle: z.boolean().optional(),
})
```

---

## New Component

### Visual Response Selector
**File**: `components/rsvp/visual-response-selector.tsx`

Props:
- `value`: Current selected value
- `onChange`: Handler called with selected value
- `confirmLabel`, `declineLabel`, `maybeLabel`: Custom labels from settings
- `showMaybeOption`: Whether to show the Maybe option
- `isRtl`: Right-to-left layout support

Features:
- Responsive: horizontal on desktop (`sm:flex-row`), vertical on mobile
- RTL support with `flex-row-reverse`
- Visual feedback: border highlight and background change on selection
- Icon colors: green (confirm), red (decline), amber (maybe)

---

## UI Integration

### Form Builder Settings Tab
**File**: `components/rsvp-form-builder/rsvp-form-builder.tsx`

Add toggle in the "RSVP Question" section after `showMaybeOption`:

```tsx
{/* Visual Response Style Toggle */}
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>{t("useVisualResponseStyle")}</Label>
    <p className="text-xs text-muted-foreground">
      {t("useVisualResponseStyleDescription")}
    </p>
  </div>
  <Switch
    checked={config.settings.useVisualResponseStyle ?? false}
    onCheckedChange={(checked) =>
      handleUpdateSettings({ useVisualResponseStyle: checked })
    }
  />
</div>
```

### RSVP Page Rendering
**File**: `components/rsvp/rsvp-page.tsx`

Conditional rendering at step 0:
- If `useVisualResponseStyle` is true: render `VisualResponseSelector`
- If false: render existing `RadioGroup`

Auto-advance logic:
- When visual style enabled and user selects Confirm/Maybe, advance to step 1
- When Decline selected, show Submit button (existing behavior)

Button visibility:
- Hide navigation buttons on step 0 when visual style is enabled and not showing Submit

---

## Translation Keys

### English (`messages/en.json`)
```json
{
  "rsvpFormBuilder": {
    "useVisualResponseStyle": "Visual Response Style",
    "useVisualResponseStyleDescription": "Display RSVP options as icon boxes instead of radio buttons"
  }
}
```

### Arabic (`messages/ar.json`)
```json
{
  "rsvpFormBuilder": {
    "useVisualResponseStyle": "نمط الاستجابة المرئي",
    "useVisualResponseStyleDescription": "عرض خيارات الحضور كمربعات أيقونات بدلاً من أزرار الراديو"
  }
}
```

---

## Critical Files Summary

| File | Action | Priority |
|------|--------|----------|
| `server/db/schemas/event.ts` | Add `useVisualResponseStyle` to type | P0 |
| `lib/schemas.ts` | Add Zod field | P0 |
| `messages/en.json` | Add translation keys | P0 |
| `messages/ar.json` | Add translation keys | P0 |
| `components/rsvp/visual-response-selector.tsx` | Create new component | P1 |
| `components/rsvp-form-builder/rsvp-form-builder.tsx` | Add toggle UI | P1 |
| `components/rsvp/rsvp-page.tsx` | Integrate visual style + auto-advance | P1 |

---

## Verification Checklist

- [ ] Toggle appears in RSVP form builder Settings tab
- [ ] Toggle saves correctly to event config
- [ ] Visual style renders when enabled
- [ ] Standard radio buttons render when disabled (default)
- [ ] Labels from settings are respected in visual style
- [ ] RTL layout works correctly for Arabic
- [ ] Mobile responsive stacking works
- [ ] Selection state updates form value correctly
- [ ] Maybe option hides when `showMaybeOption` is false
- [ ] Auto-advance: selecting Confirm/Maybe advances to next step (multi-step forms)
- [ ] Auto-advance: selecting Decline shows Submit button immediately
- [ ] Next button hidden on step 0 when visual style enabled
- [ ] Submit button still appears on step 0 when it's a single-step form or user declined
