# Stage 41: Copy Forms to Other Events

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Implement a feature to copy individual event forms to other events within the same workspace. This addresses the gap where forms created after event duplication cannot be shared across events.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category Remapping | Match by name | "VIP" in source → "VIP" in target; unmatched categories cleared |
| Form Name | Keep original | No "(Copy)" suffix since it's a different event |
| Published State | Always draft | Safety - user must review before publishing |
| UI Pattern | Checkbox list with Select All | Simple, clear selection of target events |

---

## Current State

- **Form Card** (`components/forms/form-card.tsx`): Has dropdown menu with Edit, View Responses, Publish/Unpublish, Duplicate, Delete
- **Duplicate mutation**: Only copies within same event (in `trpc/routers/event-forms.ts`)
- **MultipleSelector**: Already exists at `components/ui/multiselect.tsx`
- **useEvents hook**: Available to get all events for a workspace

---

## Key Complexity: Category Remapping

Forms reference guest categories in TWO places:
1. **Form level**: `visibleToCategories` array
2. **Field level**: `formConfig.sections[].fields[].visibleToCategories` (nested in JSON)

When copying to a different event, these category IDs need to be remapped since each event has its own categories. The solution uses name-based matching with case-insensitive comparison.

---

## Critical Files to Modify

### Backend

| File | Changes |
|------|---------|
| `lib/event-duplication.ts` | Add `remapCategoryIdsByName` and `remapFormConfigCategories` helpers |
| `trpc/routers/event-forms.ts` | Add `copyToEvents` mutation |
| `trpc/hooks/event-forms-hooks.ts` | Add `useCopyFormToEvents` hook |

### Frontend

| File | Changes |
|------|---------|
| `components/forms/form-card.tsx` | Add "Copy to Events" menu item + dialog state |
| `components/forms/copy-form-to-events-dialog.tsx` | **NEW** - Dialog component |
| `messages/en.json` | Add i18n strings |
| `messages/ar.json` | Add Arabic translations |

---

## API Design

### Input Schema

```typescript
copyToEvents: protectedProcedure
  .input(z.object({
    formId: z.string().uuid(),
    targetEventIds: z.array(z.string().uuid()).min(1),
  }))
```

### Output Schema

```typescript
{
  copiedCount: number,
  results: Array<{
    eventId: string,
    eventName: string,
    formId: string,
    formSlug: string,
  }>
}
```

---

## Implementation Steps

### Step 1: Backend Helpers (`lib/event-duplication.ts`)

Add two new functions:

```typescript
// Remap category IDs by matching names between source and target events
export function remapCategoryIdsByName(
  sourceCategoryIds: string[] | null | undefined,
  sourceCategories: Array<{ id: string; name: string }>,
  targetCategories: Array<{ id: string; name: string }>
): string[] | null

// Remap categories within formConfig.sections[].fields[].visibleToCategories
export function remapFormConfigCategories(
  formConfig: FormConfig,
  sourceCategories: Array<{ id: string; name: string }>,
  targetCategories: Array<{ id: string; name: string }>
): FormConfig
```

### Step 2: Backend Mutation (`trpc/routers/event-forms.ts`)

Add `copyToEvents` mutation:
1. Get source form and verify it exists
2. Verify user has MANAGE_EVENT permission
3. Get source event categories
4. Verify all target events belong to same workspace
5. For each target event:
   - Get target categories
   - Generate unique slug
   - Generate unique short code
   - Remap visibleToCategories by name
   - Remap formConfig categories
   - Insert new form (isPublished: false)
6. Return { copiedCount, results[] }

### Step 3: Frontend Hook (`trpc/hooks/event-forms-hooks.ts`)

Add `useCopyFormToEvents` hook:
- Calls `trpc.eventForms.copyToEvents.useMutation`
- Invalidates `eventForms.getMany` for all target events
- Shows success toast with count

### Step 4: Dialog Component (`components/forms/copy-form-to-events-dialog.tsx`)

Create dialog with:
- Header: "Copy Form to Other Events"
- Description: Copy "{name}" to one or more other events
- Checkbox list of events (excluding current event)
- "Select all events" checkbox at top
- Info box about category remapping behavior
- Cancel and "Copy to X event(s)" buttons

### Step 5: Update FormCard (`components/forms/form-card.tsx`)

1. Add `copyDialogOpen` state
2. Add "Copy to Events" menu item after "Duplicate"
3. Add `CopyFormToEventsDialog` at component end

### Step 6: i18n Translations

Add translations to both `messages/en.json` and `messages/ar.json`.

---

## UI/UX Design

### Dialog Design

```
┌─────────────────────────────────────────────┐
│ Copy Form to Other Events              [X]  │
├─────────────────────────────────────────────┤
│ Copy "Survey" to one or more other events   │
│ in this workspace.                          │
│                                             │
│ [✓] Select all events (3 events)            │
│ ─────────────────────────────────────────── │
│ [✓] Annual Gala 2025                        │
│     Mar 15, 2025                            │
│ [✓] Tech Summit 2025                        │
│     Apr 20, 2025                            │
│ [✓] Product Launch                          │
│     May 1, 2025                             │
│                                             │
│ ℹ️ Category-based visibility will be        │
│   matched by name. If a category doesn't    │
│   exist in the target event, that filter    │
│   will be cleared.                          │
│                                             │
│              [Cancel] [Copy to 3 event(s)]  │
└─────────────────────────────────────────────┘
```

### User Flow

1. User clicks ellipsis (⋮) on a form card
2. Dropdown shows: Edit, View Responses, Publish/Unpublish, Duplicate, **Copy to Events**, Delete
3. Clicking "Copy to Events" opens dialog
4. Dialog shows checkbox list of all other events in workspace
5. User can:
   - Check individual events
   - Use "Select all events" to select/deselect all
6. User clicks "Copy to X event(s)" button
7. Loading state shows on button
8. On success:
   - Toast: "Form copied to X events"
   - Dialog closes
9. On failure:
   - Toast with error message
   - Dialog remains open for retry

---

## i18n Additions

### English (`messages/en.json`)

```json
{
  "forms": {
    "copyToEvents": "Copy to Events",
    "copyToEventsDialog": {
      "title": "Copy Form to Other Events",
      "description": "Copy \"{name}\" to one or more other events in this workspace.",
      "selectAll": "Select all events",
      "events": "events",
      "noOtherEvents": "No other events available in this workspace.",
      "categoryInfo": "Category-based visibility will be matched by name. If a category doesn't exist in the target event, that visibility filter will be cleared.",
      "copying": "Copying...",
      "submit": "Copy to {count} event(s)"
    }
  }
}
```

### Arabic (`messages/ar.json`)

```json
{
  "forms": {
    "copyToEvents": "نسخ إلى الفعاليات",
    "copyToEventsDialog": {
      "title": "نسخ النموذج إلى فعاليات أخرى",
      "description": "نسخ \"{name}\" إلى فعالية واحدة أو أكثر في هذه المساحة.",
      "selectAll": "تحديد جميع الفعاليات",
      "events": "فعاليات",
      "noOtherEvents": "لا توجد فعاليات أخرى متاحة في هذه المساحة.",
      "categoryInfo": "سيتم مطابقة الرؤية المستندة إلى الفئة حسب الاسم. إذا لم تكن الفئة موجودة في الفعالية المستهدفة، سيتم مسح فلتر الرؤية.",
      "copying": "جاري النسخ...",
      "submit": "نسخ إلى {count} فعالية"
    }
  }
}
```

---

## Edge Cases

1. **No other events**: Display "No other events available" message
2. **Category matching**: Use case-insensitive name matching
3. **Missing categories**: Clear `visibleToCategories` (make visible to all)
4. **Slug conflicts**: Append `-1`, `-2`, etc. or UUID fragment
5. **Short code uniqueness**: Generate unique short codes for each copy
6. **Same event blocked**: Cannot copy to source event (use Duplicate instead)
7. **Permission check**: Verify user has MANAGE_EVENT permission

---

## Verification Checklist

- [ ] `remapCategoryIdsByName` helper added to `lib/event-duplication.ts`
- [ ] `remapFormConfigCategories` helper added to `lib/event-duplication.ts`
- [ ] `copyToEvents` mutation added to event-forms router
- [ ] `useCopyFormToEvents` hook created
- [ ] `CopyFormToEventsDialog` component created
- [ ] FormCard updated with menu item and dialog
- [ ] i18n strings added (EN/AR)
- [ ] Category remapping working correctly
- [ ] Unique slugs generated per target event
- [ ] Copied forms created as unpublished

---

## Related Documents

- [Stage 32: Event Duplication](./32-duplicate-event.md) - Event-level duplication reference
