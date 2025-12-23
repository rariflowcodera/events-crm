# Stage 37: Gender-Aware Arabic Greetings

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: In Progress

## Objective

Add support for gender-aware Arabic greetings in email templates. This includes:
1. Adding a `gender` field to guests for proper Arabic addressing
2. Exposing `title` and `salutation` fields in guest forms (already in DB, missing from UI)
3. Creating computed greeting variables (`{{greeting.ar}}`) that respect gender

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Arabic greeting pattern | عزيزي/عزيزتي (Azizi/Azizati) | "Dear" (masc/fem) - common for formal invitations |
| Unknown gender fallback | عزيزي/عزيزتي (show both) | Standard Arabic formal letter convention |
| Gender enum values | `male`, `female`, `unspecified` | Clear values with neutral default |
| Field grouping | Gender with Title/Salutation | Related addressing fields grouped together |

---

## Background: Arabic Greetings

Arabic greetings are gendered. Unlike English "Dear" which is neutral:

| Gender | Arabic | Transliteration | Meaning |
|--------|--------|-----------------|---------|
| Male | عزيزي | Azizi | Dear (masculine) |
| Female | عزيزتي | Azizati | Dear (feminine) |
| Unknown | عزيزي/عزيزتي | Azizi/Azizati | Dear (both forms) |

For VIP events in KSA, proper guest addressing is critical for formal communications.

---

## Implementation Scope

### 1. Database Schema

**File**: `server/db/schemas/guest.ts`

Add gender enum and field:

```typescript
export const genderEnum = pgEnum("guest_gender", ["male", "female", "unspecified"])

// In guests table:
gender: genderEnum("gender").default("unspecified"),
```

Note: `title` and `salutation` fields already exist in the schema but are not exposed in forms.

Then generate and run migration:
```bash
npm run db:generate
npm run db:migrate
```

---

### 2. Zod Schemas

**File**: `lib/schemas.ts`

Add gender schema exports:

```typescript
export const genderValues = ["male", "female", "unspecified"] as const
export type Gender = (typeof genderValues)[number]
export const genderSchema = z.enum(genderValues)
```

---

### 3. tRPC Router

**File**: `trpc/routers/guests.ts`

Add `gender` to create/update input schemas. Fields `title` and `salutation` should already be present.

---

### 4. Add Guest Form

**File**: `components/guests/add-guest-form.tsx`

Add three fields in a "Guest Addressing" section:

1. **Gender** - Select dropdown (Male/Female/Unspecified)
2. **Title** - Text input placeholder examples: Mr., Mrs., Dr., Sheikh
3. **Salutation** - Text input for optional custom formal greeting

Schema additions:
```typescript
gender: z.enum(["male", "female", "unspecified"]).optional(),
title: z.string().max(50).optional(),
salutation: z.string().max(100).optional(),
```

---

### 5. Edit Guest Form

**File**: `components/guests/guest-detail-content.tsx`

Mirror the same three fields from the Add form:
- Gender select dropdown
- Title text input
- Salutation text input

---

### 6. Excel Import

**File**: `components/guests/import-guests-modal.tsx`

Add to `ColumnMapping` interface:
```typescript
gender: string
title: string
salutation: string
```

Add auto-detection patterns:
- gender: `"gender"`, `"sex"`
- title: `"title"`, `"honorific"`
- salutation: `"salutation"`, `"greeting"`

Handle gender value normalization:
- `"male"`, `"m"`, `"ذكر"` → `"male"`
- `"female"`, `"f"`, `"أنثى"` → `"female"`
- Others → `"unspecified"`

---

### 7. Guest Columns

**File**: `lib/guest-columns.ts`

Add `gender` column definition:
```typescript
{
  key: "gender",
  label: "Gender",
  sortable: true,
  filterable: true,
  defaultVisible: false,
}
```

Verify `title` and `salutation` columns exist with appropriate visibility.

---

### 8. Email Template Variables

**File**: `lib/email/render-structured.ts`

Add computed Arabic greeting variable:

```typescript
function getArabicGreeting(gender?: string | null): string {
  if (gender === "male") return "عزيزي"
  if (gender === "female") return "عزيزتي"
  return "عزيزي/عزيزتي" // fallback for unspecified
}

// In buildVariableContext():
"greeting.ar": getArabicGreeting(guest.gender),
"greeting.en": "Dear",
```

Update Guest interface to include `gender`.

---

### 9. RSVP Variables

**File**: `lib/rsvp/variable-utils.ts`

Add to variable reference:
```typescript
{ key: "greeting.ar", label: { en: "Arabic Greeting", ar: "التحية بالعربية" }, example: "عزيزي" },
{ key: "guest.salutation", label: { en: "Salutation", ar: "التحية الرسمية" }, example: "Dr." },
```

Add `gender` to `WelcomeMessageData` interface.

---

### 10. i18n Messages

**Files**: `messages/en.json`, `messages/ar.json`

English:
```json
{
  "guest": {
    "fields": {
      "gender": "Gender",
      "title": "Title",
      "salutation": "Salutation"
    },
    "gender": {
      "male": "Male",
      "female": "Female",
      "unspecified": "Unspecified"
    }
  }
}
```

Arabic:
```json
{
  "guest": {
    "fields": {
      "gender": "الجنس",
      "title": "اللقب",
      "salutation": "التحية"
    },
    "gender": {
      "male": "ذكر",
      "female": "أنثى",
      "unspecified": "غير محدد"
    }
  }
}
```

---

## Files Summary

| File | Change Type |
|------|-------------|
| `server/db/schemas/guest.ts` | Add gender enum + field |
| `lib/schemas.ts` | Add gender Zod schema |
| `trpc/routers/guests.ts` | Add gender to inputs |
| `components/guests/add-guest-form.tsx` | Add gender/title/salutation fields |
| `components/guests/guest-detail-content.tsx` | Add gender/title/salutation fields |
| `components/guests/import-guests-modal.tsx` | Add column mapping |
| `lib/guest-columns.ts` | Add gender column |
| `lib/email/render-structured.ts` | Add greeting.ar variable |
| `lib/rsvp/variable-utils.ts` | Add greeting variables |
| `messages/en.json` | Add labels |
| `messages/ar.json` | Add labels |

---

## Email Template Usage

After implementation, email templates can use:

**English:**
```
Dear {{guest.salutation}} {{guest.fullName}},
```

**Arabic:**
```
{{greeting.ar}} {{guest.displayNameAr}}،
```

This renders as:
- Male: `عزيزي أحمد الراشد،`
- Female: `عزيزتي فاطمة الأحمد،`
- Unspecified: `عزيزي/عزيزتي محمد علي،`

---

## Migration Note

Existing guests will have `gender` as `"unspecified"` (the default). This is handled gracefully:
- Forms show "Unspecified" selected
- Arabic greetings show both forms: عزيزي/عزيزتي
- Title and salutation remain as they were (null if never set)

---

## Verification Checklist

- [ ] Database migration runs successfully
- [ ] Add guest form shows Gender dropdown
- [ ] Add guest form shows Title and Salutation fields
- [ ] Edit guest form shows all three fields
- [ ] Import wizard detects Gender column
- [ ] Import normalizes gender values (m/f/male/female)
- [ ] Email template variable `{{greeting.ar}}` appears in Insert Variable dropdown
- [ ] Arabic greeting respects gender (عزيزي for male, عزيزتي for female)
- [ ] Unknown gender shows both forms (عزيزي/عزيزتي)
- [ ] Gender column appears in column selector dropdown
