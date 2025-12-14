# 17: Guest List Excel Export

## Overview

Export functionality for the guest management page, allowing users to download guest data as an Excel file. Exports respect the currently applied filters (search, status, category, country).

## Status: Implemented

---

## Problem

Event organizers need to export guest lists for:
- Sharing with vendors and partners
- Offline review and planning
- Backup and record-keeping
- Analysis in external tools (Excel, Google Sheets)

---

## Solution

Added an "Export" button to the guests toolbar that exports the currently filtered guest list to an Excel file using the existing `xlsx` package.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/export-guests.ts` | Export utility function using xlsx library |

---

## Files Modified

| File | Change |
|------|--------|
| `components/global/icons.tsx` | Added `DownloadIcon` from lucide-react |
| `components/guests/guests-toolbar.tsx` | Added `onExport` prop and Export button |
| `components/events/event-guests-tab.tsx` | Wired up export with filtered guests data |

---

## Implementation Details

### Export Utility (`lib/export-guests.ts`)

```typescript
import * as XLSX from "xlsx"
import { getCountryName } from "@/lib/data/countries"

export function exportGuestsToExcel(guests: Guest[], eventSlug: string): void {
  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Position", "Entity",
    "Country", "Category", "Status", "RSVP Responded", "Notes", "Created",
  ]

  const rows = guests.map((guest) => [
    guest.firstName,
    guest.lastName,
    guest.email || "",
    guest.phone || "",
    guest.position || "",
    guest.entity || "",
    guest.country ? getCountryName(guest.country) || guest.country : "",
    guest.category?.name || "",
    formatStatus(guest.status),
    formatDate(guest.rsvpRespondedAt),
    guest.internalNotes || "",
    formatDate(guest.createdAt),
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  // ... column widths and file generation
  XLSX.writeFile(wb, `${eventSlug}-guests-${today}.xlsx`)
}
```

### Toolbar Integration (`components/guests/guests-toolbar.tsx`)

Added optional `onExport` prop and Export button:

```tsx
interface GuestsToolbarProps {
  // ... existing props
  onExport?: () => void
}

// In the component:
{onExport && (
  <Button variant="outline" onClick={onExport}>
    <Icons.download className="mr-2 h-4 w-4" />
    {t("export")}
  </Button>
)}
```

### Event Guests Tab (`components/events/event-guests-tab.tsx`)

Wired up the export handler with filtered data:

```tsx
import { exportGuestsToExcel } from "@/lib/export-guests"

const handleExport = useCallback(() => {
  exportGuestsToExcel(filteredGuests, event.slug)
}, [filteredGuests, event.slug])

<GuestsToolbar
  // ... other props
  onExport={handleExport}
/>
```

---

## Exported Columns

| Column | Source | Notes |
|--------|--------|-------|
| First Name | `firstName` | |
| Last Name | `lastName` | |
| Email | `email` | |
| Phone | `phone` | |
| Position | `position` | |
| Entity | `entity` | Company/Organization |
| Country | `country` | Converted from ISO code to name |
| Category | `category.name` | Guest category (AAA, VIP, etc.) |
| Status | `status` | Formatted (e.g., "no_show" → "No Show") |
| RSVP Responded | `rsvpRespondedAt` | Formatted date |
| Notes | `internalNotes` | |
| Created | `createdAt` | Formatted date |

---

## Features

| Feature | Description |
|---------|-------------|
| **Filtered Export** | Exports only guests matching current filters (search, status, category, country) |
| **Smart Filename** | `{event-slug}-guests-{YYYY-MM-DD}.xlsx` |
| **Column Widths** | Pre-configured for readability |
| **Country Names** | ISO codes converted to full names |
| **Status Formatting** | Snake_case converted to Title Case |
| **Date Formatting** | Locale-friendly format (e.g., "Dec 14, 2024") |

---

## i18n

Uses existing translations:
- English: `"export": "Export Guests"` (in `messages/en.json`)
- Arabic: `"export": "تصدير الضيوف"` (in `messages/ar.json`)

---

## Dependencies

- `xlsx` (already installed, v0.18.5) - Same package used for guest import

---

## User Flow

1. Navigate to event guests tab (`/[slug]/events/[eventSlug]?tab=guests`)
2. Optionally apply filters (search, status, category, country)
3. Click "Export" button
4. Excel file downloads with filtered guest data

---

## Related Files

### Excel Handling
- `components/guests/import-guests-modal.tsx` - Guest import (uses same xlsx patterns)

### Guest Data
- `server/db/schemas/guest.ts` - Guest database schema
- `trpc/routers/guests.ts` - Guest data fetching
- `trpc/hooks/guests-hooks.ts` - Client hooks for guest data

### Country Utilities
- `lib/data/countries.ts` - Country code to name conversion
