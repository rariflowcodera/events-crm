# Stage 32: Event Duplication Feature

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Implement a safe and comprehensive event duplication feature that copies all event configuration data while properly handling ID remapping and maintaining referential integrity.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Flow | Dialog with checkboxes (all ticked by default) | Gives users control while defaulting to full duplication |
| Inventory | Copy types only (not specific bookings) | Bookings are date-specific; types define structure |
| Implementation | MVP first, then advanced features | Faster time to value; iterative improvement |
| Transaction Safety | Single database transaction | All-or-nothing prevents orphaned data |
| ID Handling | Mapping strategy | Maintains referential integrity across entities |

---

## Current State

- **UI Element**: "Duplicate Event" menu item exists in `components/events/event-header.tsx` (line 143-146) but has **no implementation**
- **Backend**: No `duplicate` procedure exists in `trpc/routers/events.ts`
- **Existing Patterns**: Email templates and master templates already have duplication procedures that can be referenced

---

## Data to Duplicate

### Entities (in dependency order)

| Order | Entity | Table | ID Remapping Needed | Notes |
|-------|--------|-------|---------------------|-------|
| 1 | Event | `events` | New UUID | Reset status to "draft", generate unique slug |
| 2 | Guest Categories | `guestCategories` | Create mapping | Core dependency for many other entities |
| 3 | Email Templates | `emailTemplates` | Map `categoryId` | Use category mapping from step 2 |
| 4 | Master Templates | `emailMasterTemplates` | Map `eventId` | Only event-level overrides (where `eventId` is set) |
| 5 | Itinerary Templates | `itineraryTemplates` | Map `categoryId` | Optional category reference |
| 6 | Itinerary Items | `itineraryItems` | Map `templateId`, `visibleToCategories` | Child of templates |
| 7 | Event Forms | `eventForms` | Map `visibleToCategories` | Remap category array |
| 8 | Guest List Views | `guestListViews` | Map `config.filters.categoryIds` | Remap filter array |
| 9 | Event Documents | `eventDocuments` | Map `categoryIds` | Remap category array |
| 10 | Inventory Types | `inventoryTypes` | Create mapping | Independent of categories |
| 11 | Workflows | `workflows` | Map `triggerConditions.categoryIds` | Event-level only |
| 12 | Workflow Steps | `workflowSteps` | Map `actionConfig.templateId`, `categoryId` | Child of workflows |

### Entities NOT to Duplicate

- Guests (`guests`)
- RSVP Responses (`rsvpResponses`)
- Email Logs (`emailLogs`)
- Form Responses (`formResponses`)
- Communications (`communications`)
- Bulk Email Jobs (`bulkEmailJobs`)
- Approval Requests (`approvalRequests`)
- Guest Inventory Allocations (`guestInventoryAllocations`)
- Guest Itineraries (`guestItineraries`)
- Inventory Items (`inventoryItems`) - These are specific bookings

---

## Implementation Architecture

### ID Remapping Strategy

```typescript
interface DuplicationMapping {
  categoryIdMap: Map<string, string>      // old -> new
  emailTemplateIdMap: Map<string, string>
  inventoryTypeIdMap: Map<string, string>
  itineraryTemplateIdMap: Map<string, string>
  workflowIdMap: Map<string, string>
}
```

### Transaction Safety

All duplication operations should be wrapped in a single database transaction:

```typescript
const result = await db.transaction(async (tx) => {
  // 1. Create event
  // 2. Create categories (build mapping)
  // 3. Create templates (use mapping)
  // ... etc
  return { event, stats }
})
```

### Slug Uniqueness

Generate unique slug by appending counter:
- Original: `annual-gala-2024`
- First copy: `annual-gala-2024-copy`
- Second copy: `annual-gala-2024-copy-2`

---

## Critical Files to Modify

### Backend

| File | Changes |
|------|---------|
| `trpc/routers/events.ts` | Add `duplicate` procedure with transaction |
| `trpc/hooks/events-hooks.ts` | Add `useDuplicateEvent` mutation hook |

### Frontend

| File | Changes |
|------|---------|
| `components/events/event-header.tsx` | Add dialog state, wire up menu item |
| `messages/en.json` | Add i18n strings for dialog |
| `messages/ar.json` | Add Arabic translations |

### New Files

| File | Purpose |
|------|---------|
| `lib/event-duplication.ts` | ID remapping helpers, slug generation |
| `components/events/duplicate-event-dialog.tsx` | Dialog UI component |

---

## API Design

### Input Schema

```typescript
duplicateEvent: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    name: z.string().min(1).max(100).optional(), // Default: "{original} (Copy)"
    options: z.object({
      includeCategories: z.boolean().default(true),      // Always true if other entities need it
      includeEmailTemplates: z.boolean().default(true),
      includeGuestListViews: z.boolean().default(true),
      includeEventForms: z.boolean().default(true),
      includeDocuments: z.boolean().default(true),
      includeItineraries: z.boolean().default(true),
      includeInventoryTypes: z.boolean().default(true), // Types only, not items
      includeWorkflows: z.boolean().default(true),
    }).default({}),
  }))
```

### Output Schema

```typescript
{
  event: Event,
  stats: {
    categoriesCopied: number,
    emailTemplatesCopied: number,
    guestListViewsCopied: number,
    eventFormsCopied: number,
    documentsCopied: number,
    itineraryTemplatesCopied: number,
    itineraryItemsCopied: number,
    inventoryTypesCopied: number,
    workflowsCopied: number,
    workflowStepsCopied: number,
  }
}
```

---

## Implementation Phases

### Phase 32A: Core Duplication (MVP)

**Backend:**
1. Create `lib/event-duplication.ts` with helper functions for ID remapping
2. Add `duplicate` procedure to `trpc/routers/events.ts`:
   - Event (with slug generation, status reset)
   - Guest Categories (with ID mapping)
   - Email Templates (with category remapping)
   - Guest List Views (with filter remapping)
3. Wrap all operations in database transaction
4. Add `useDuplicateEvent` hook to `trpc/hooks/events-hooks.ts`

**Frontend:**
5. Create `components/events/duplicate-event-dialog.tsx`:
   - Event name input (pre-filled with "{original} (Copy)")
   - Checkboxes for optional entities (all checked by default)
   - Loading state during duplication
6. Wire up dialog to "Duplicate Event" menu item in `event-header.tsx`
7. Redirect to new event on success

### Phase 32B: Extended Duplication

8. Add Event Documents copying (with category remapping)
9. Add Event Forms copying (with category remapping)
10. Add Itinerary Templates + Items copying
11. Add Email Master Templates (event-level overrides only)
12. Update dialog with additional checkboxes

### Phase 32C: Advanced Duplication

13. Add Inventory Types copying (types only, not items)
14. Add Workflows + Steps copying (with template/category remapping)
15. Update dialog with advanced options section

---

## Field Reset Rules

### Event Fields to Reset

| Field | New Value |
|-------|-----------|
| `id` | New UUID |
| `status` | `"draft"` |
| `slug` | Generate unique |
| `customDomain` | `null` |
| `customDomainVerified` | `false` |
| `customDomainVerifiedAt` | `null` |
| `customDomainVerificationToken` | `null` |
| `createdBy` | Current user |
| `createdAt` | Now |
| `updatedAt` | Now |

### Event Fields to Copy

- `name` (with suffix like " (Copy)")
- `nameAr`
- `description`
- `eventType`, `venue`, `venueAddress`
- `latitude`, `longitude`, `placeId`
- `city`, `country`
- `startDate`, `endDate`, `timezone`
- `startTime`, `endTime`, `isSingleDay`
- `rsvpDeadline`
- `rsvpFormConfig`
- `maxGuests`
- `branding`
- `settings`

---

## Error Handling

1. **Slug collision**: Auto-increment suffix until unique
2. **Missing source event**: Return NOT_FOUND error
3. **Permission denied**: Return FORBIDDEN error
4. **Transaction failure**: Automatic rollback, return INTERNAL_SERVER_ERROR
5. **Partial data**: Transaction ensures all-or-nothing

---

## i18n Additions

### English (`messages/en.json`)

```json
{
  "events": {
    "duplicate": {
      "title": "Duplicate Event",
      "description": "Create a copy of this event with all its configuration",
      "name": "Event Name",
      "namePlaceholder": "Enter event name",
      "includeLabel": "Include in duplication:",
      "options": {
        "categories": "Guest Categories",
        "categoriesDesc": "Category definitions and service allocations",
        "emailTemplates": "Email Templates",
        "emailTemplatesDesc": "All event email templates",
        "guestListViews": "Guest List Views",
        "guestListViewsDesc": "Saved view configurations",
        "eventForms": "Event Forms",
        "eventFormsDesc": "Custom registration and feedback forms",
        "documents": "Documents",
        "documentsDesc": "Event documents for email templates",
        "itineraries": "Itineraries",
        "itinerariesDesc": "Itinerary templates and schedule items",
        "inventoryTypes": "Inventory Types",
        "inventoryTypesDesc": "Hotel, transport, and other inventory structure",
        "workflows": "Workflows",
        "workflowsDesc": "Automated email and status change workflows"
      },
      "submit": "Duplicate Event",
      "submitting": "Duplicating...",
      "success": "Event duplicated successfully",
      "error": "Failed to duplicate event"
    }
  }
}
```

### Arabic (`messages/ar.json`)

```json
{
  "events": {
    "duplicate": {
      "title": "تكرار الفعالية",
      "description": "إنشاء نسخة من هذه الفعالية مع جميع إعداداتها",
      "name": "اسم الفعالية",
      "namePlaceholder": "أدخل اسم الفعالية",
      "includeLabel": "تضمين في التكرار:",
      "options": {
        "categories": "فئات الضيوف",
        "categoriesDesc": "تعريفات الفئات وتخصيصات الخدمات",
        "emailTemplates": "قوالب البريد الإلكتروني",
        "emailTemplatesDesc": "جميع قوالب البريد الإلكتروني للفعالية",
        "guestListViews": "عروض قائمة الضيوف",
        "guestListViewsDesc": "إعدادات العرض المحفوظة",
        "eventForms": "نماذج الفعالية",
        "eventFormsDesc": "نماذج التسجيل والتعليقات المخصصة",
        "documents": "المستندات",
        "documentsDesc": "مستندات الفعالية لقوالب البريد الإلكتروني",
        "itineraries": "جداول الأعمال",
        "itinerariesDesc": "قوالب جدول الأعمال وعناصر الجدول الزمني",
        "inventoryTypes": "أنواع المخزون",
        "inventoryTypesDesc": "هيكل الفنادق والنقل والمخزون الآخر",
        "workflows": "سير العمل",
        "workflowsDesc": "سير عمل البريد الإلكتروني الآلي وتغيير الحالة"
      },
      "submit": "تكرار الفعالية",
      "submitting": "جاري التكرار...",
      "success": "تم تكرار الفعالية بنجاح",
      "error": "فشل تكرار الفعالية"
    }
  }
}
```

---

## Dependency Constraints

**Important**: Categories must be duplicated if any of these entities are included:
- Email Templates (reference `categoryId`)
- Guest List Views (reference `categoryIds` in filters)
- Event Forms (reference `visibleToCategories`)
- Documents (reference `categoryIds`)
- Itinerary Items (reference `visibleToCategories`)
- Workflows (reference `categoryIds` in trigger conditions)

The dialog should show a warning or auto-enable categories when any dependent entity is checked.

---

## UI/UX Design

### Dialog Design

```
+----------------------------------------------------------+
| Duplicate Event                                      [X] |
+----------------------------------------------------------+
|                                                          |
| Event Name *                                             |
| [Annual Gala 2024 (Copy)_____________________________]   |
|                                                          |
| Include in duplication:                                  |
|                                                          |
| [x] Guest Categories                                     |
|     Category definitions and service allocations         |
|                                                          |
| [x] Email Templates                                      |
|     All event email templates                            |
|                                                          |
| [x] Guest List Views                                     |
|     Saved view configurations                            |
|                                                          |
| [x] Event Forms                                          |
|     Custom registration and feedback forms               |
|                                                          |
| [x] Documents                                            |
|     Event documents for email templates                  |
|                                                          |
| [x] Itineraries                                          |
|     Itinerary templates and schedule items               |
|                                                          |
| [x] Inventory Types                                      |
|     Hotel, transport, and other inventory structure      |
|                                                          |
| [x] Workflows                                            |
|     Automated email and status change workflows          |
|                                                          |
|                              [Cancel]  [Duplicate Event] |
+----------------------------------------------------------+
```

### User Flow

1. User clicks "Duplicate Event" from dropdown menu
2. Dialog opens with:
   - Event name input (pre-filled with "{name} (Copy)")
   - All checkboxes ticked by default
3. User can optionally:
   - Rename the event
   - Uncheck entities they don't want to copy
4. User clicks "Duplicate Event" button
5. Loading state shows on button
6. On success:
   - Toast: "Event duplicated successfully"
   - Redirect to new event's overview page
7. On failure:
   - Toast with error message
   - Dialog remains open for retry

---

## Verification Checklist

### Phase 32A (MVP)
- [ ] `lib/event-duplication.ts` created with helper functions
- [ ] `duplicate` procedure added to events router
- [ ] Transaction wraps all operations
- [ ] Event created with unique slug and draft status
- [ ] Categories duplicated with ID mapping
- [ ] Email templates duplicated with category remapping
- [ ] Guest list views duplicated with filter remapping
- [ ] `useDuplicateEvent` hook created
- [ ] `duplicate-event-dialog.tsx` component created
- [ ] Dialog wired to menu item in event-header
- [ ] Success redirects to new event
- [ ] i18n strings added (EN/AR)

### Phase 32B (Extended)
- [ ] Event documents duplicated
- [ ] Event forms duplicated
- [ ] Itinerary templates + items duplicated
- [ ] Email master templates (event-level) duplicated
- [ ] Dialog checkboxes expanded

### Phase 32C (Advanced)
- [ ] Inventory types duplicated
- [ ] Workflows + steps duplicated
- [ ] All ID remapping verified
- [ ] Transaction rollback tested

---

## Related Documents

- [Stage 5: Admin Dashboard](./05-admin-dashboard.md) - Event CRUD patterns
- [Stage 6: Email Template Builder](./06-email-template-builder.md) - Template duplication reference
- [Stage 14: Document Management](./14-document-management.md) - Document schema
- [Stage 24: Custom Views](./24-custom-views.md) - Guest list views schema
- [Stage 31: Email Branding](./31-email-branding.md) - Master template duplication
