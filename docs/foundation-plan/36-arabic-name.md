# Stage 36: Arabic Name Field for Guests

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Add support for capturing and displaying guest names in Arabic (`displayNameAr`) across the guest management system, enabling proper Arabic name display in RSVP forms and email templates.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Field name | `displayNameAr` | Matches camelCase convention (firstName, lastName, preferredName) |
| Form placement | After lastName | Group with other personal name fields |
| RSVP fallback | Use English name | If no Arabic name provided, fall back to firstName + lastName |

---

## Implementation Scope

### 1. Database Schema

**File**: `server/db/schemas/guest.ts`

Add new field in the personal information section (near `preferredName`):

```typescript
displayNameAr: text("display_name_ar"),  // Arabic display name
```

Then generate and run migration:
```bash
npm run db:generate
npm run db:migrate
```

---

### 2. Add/Edit Guest Forms

**Files to modify**:
- `components/guests/add-guest-form.tsx` - Add guest form
- `components/guests/guest-detail-content.tsx` - Edit guest form

**Changes**:
- Add `displayNameAr` to Zod schemas
- Add form field with Arabic label/placeholder
- Field should have `dir="rtl"` for proper Arabic text entry
- Placement: After lastName (personal info grouping)

---

### 3. Excel Import

**File**: `components/guests/import-guests-modal.tsx`

**Changes**:
- Add `displayNameAr` to `ColumnMapping` interface
- Add auto-detection patterns: "arabicname", "namear", "arabic", "displaynamear"
- Add to column mapping dropdown options
- Pass field through to bulk create mutation
- Template download: Include "Arabic Name" column with sample Arabic text

---

### 4. tRPC Endpoints

**Files to modify**:
- `trpc/routers/guests.ts` - Add field to create/update/bulkCreate schemas

**Changes**:
- Add `displayNameAr` to create schema
- Add `displayNameAr` to update schema
- Add `displayNameAr` to bulkCreate schema

---

### 5. Email Template Variable System

**File**: `trpc/routers/email-templates.ts` (getVariables endpoint)

Add to guest variables section:
```typescript
{ key: "guest.displayNameAr", description: "Guest's Arabic name" }
```

The VariableInserter component will automatically pick this up from the API.

---

### 6. RSVP Form Arabic Section

**File**: `lib/rsvp/variable-utils.ts`

**Changes**:
- Add `displayNameAr` to guest data interface
- Create `{{guest.displayNameAr}}` variable
- In Arabic greeting, use `displayNameAr` if set, fallback to fullName

**Fallback Logic**:
```typescript
const arabicDisplayName = guest.displayNameAr || fullName
// Use arabicDisplayName in Arabic section
```

**File**: `components/rsvp/rsvp-page.tsx`

Pass `displayNameAr` in the variableData object.

---

### 7. i18n Labels

**Files**:
- `messages/en.json`
- `messages/ar.json`

Add translations for form labels:
```json
{
  "guests": {
    "fields": {
      "displayNameAr": "Arabic Name",
      "displayNameArPlaceholder": "Enter name in Arabic"
    }
  }
}
```

---

## Files Summary

| File | Change Type |
|------|-------------|
| `server/db/schemas/guest.ts` | Add field |
| `components/guests/add-guest-form.tsx` | Add form field |
| `components/guests/guest-detail-content.tsx` | Add form field |
| `components/guests/import-guests-modal.tsx` | Add mapping |
| `trpc/routers/guests.ts` | Update schemas |
| `trpc/routers/email-templates.ts` | Add variable |
| `lib/rsvp/variable-utils.ts` | Add variable + fallback |
| `components/rsvp/rsvp-page.tsx` | Pass field in data |
| `messages/en.json` | Add labels |
| `messages/ar.json` | Add labels |

---

## Migration Note

Existing guests will have `displayNameAr` as `null`. This is handled gracefully:
- Forms show empty field
- Email templates show empty string if variable used
- RSVP Arabic section falls back to English name

---

## Verification Checklist

- [x] Database migration runs successfully
- [x] Add guest form shows Arabic name field with RTL input
- [x] Edit guest form shows Arabic name field
- [x] Import wizard detects "Arabic Name" column
- [x] Import template includes Arabic Name column with sample data
- [x] Email template variable `{{guest.displayNameAr}}` appears in Insert Variable dropdown
- [x] RSVP form Arabic section uses Arabic name when set
- [x] RSVP form falls back to English name when Arabic name is empty
- [x] Arabic Name column appears in column selector dropdown
