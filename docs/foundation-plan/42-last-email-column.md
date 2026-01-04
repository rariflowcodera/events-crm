# 42. Last Email Name Column

## Summary
Add a new column to the guest list view that displays the **template name** of the last email sent to each guest (e.g., "Final Confirmation VIP", "Invitation Email VIP").

## Approach: Denormalized Field
Following the existing pattern of `lastEmailSentAt`, we'll add a `lastEmailTemplateName` field to the guest schema. This is updated when emails are sent, providing fast query performance without complex joins.

---

## Files to Modify

### 1. `server/db/schemas/guest.ts` (line ~118)
Add new field after `lastEmailSentAt`:
```typescript
lastEmailSentAt: timestamp("last_email_sent_at", { mode: "date" }),
lastEmailTemplateName: text("last_email_template_name"), // NEW
lastEmailOpenedAt: timestamp("last_email_opened_at", { mode: "date" }),
```

### 2. `server/workers/email-processor.ts` (line ~341-344)
Update guest record to include template name:
```typescript
.set({
  lastEmailSentAt: new Date(),
  lastEmailTemplateName: template.name, // NEW
  ...(newStatus && { status: newStatus }),
})
```

### 3. `lib/guest-columns.ts`
Add to `GuestColumnId` type (line ~45):
```typescript
| "lastEmailSentAt"
| "lastEmailTemplateName" // NEW
| "lastEmailOpenedAt"
```

Add column definition (after line ~380):
```typescript
{
  id: "lastEmailTemplateName",
  label: "Last Email Name",
  labelAr: "اسم آخر بريد",
  defaultVisible: false,
  defaultWidth: 180,
  sortable: true,
  filterable: true,
  group: "activity",
},
```

### 4. `components/guests/guests-data-table.tsx`
Add to `Guest` interface (line ~95):
```typescript
lastEmailSentAt: Date | null
lastEmailTemplateName: string | null // NEW
lastEmailOpenedAt: Date | null
```

Add column definition (after line ~642):
```typescript
{
  id: "lastEmailTemplateName",
  accessorKey: "lastEmailTemplateName",
  header: ({ column }) => (
    <FilterableHeader column={column} title="Last Email Name" />
  ),
  cell: ({ getValue }) => {
    const value = getValue() as string | null
    return (
      <span className="truncate" title={value ?? undefined}>
        {value || ""}
      </span>
    )
  },
  size: getColumnWidth("lastEmailTemplateName"),
},
```

### 5. `trpc/routers/guests.ts` (line ~168)
Add sorting support:
```typescript
case "lastEmailSentAt":
  return sortFn(guests.lastEmailSentAt)
case "lastEmailTemplateName":
  return sortFn(guests.lastEmailTemplateName) // NEW
case "lastEmailOpenedAt":
```

---

## Post-Implementation Steps

1. **Generate migration**: `npm run db:generate`
2. **Run migration**: `npm run db:migrate`
3. **Optional backfill** for existing guests (SQL):
```sql
UPDATE guest g
SET last_email_template_name = (
  SELECT et.name
  FROM email_log el
  JOIN email_template et ON el.template_id = et.id
  WHERE el.guest_id = g.id AND el.status = 'sent'
  ORDER BY el.sent_at DESC
  LIMIT 1
)
WHERE g.last_email_sent_at IS NOT NULL
AND g.last_email_template_name IS NULL;
```

---

## Filter Support

Added filter capability for the "Last Email Name" column, allowing users to filter guests by which email template they last received.

### Additional Files Modified for Filter:

1. **`server/db/schemas/guest-list-view.ts`** - Added `lastEmailTemplateNames?: string[]` to `GuestListViewFilterConfig`
2. **`trpc/routers/guests.ts`** - Added `lastEmailTemplateNames` to filter input schema and query condition
3. **`components/guests/guests-toolbar.tsx`** - Added `MultiSelectFilter` for Last Email Name
4. **`components/events/event-guests-tab.tsx`** - Added `availableEmailTemplateNames` computed from guest data and filter handlers

---

## Testing Checklist
- [x] New column appears in column selector under "Activity" group
- [x] Column displays template name correctly
- [x] Empty for guests who haven't received emails
- [x] Sorting works (A-Z, Z-A)
- [x] Truncation with tooltip for long names
- [x] New emails populate the field correctly
- [x] Filter appears in toolbar when guests have email template names
- [x] Filter shows only templates that have been sent (from guest data)
- [x] Selecting templates filters the guest list correctly
- [x] Multiple templates can be selected
- [x] Filter can be cleared
- [x] Filter works with other filters (status, category, country)
