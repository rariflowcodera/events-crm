# Stage 21: Automated RSVP Acknowledgement Emails

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Implement automated email sending after RSVP form submission, with auto-creation of default email templates when events are created and an event-level toggle to control auto-acknowledgement emails.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-create templates | Yes, all 5 core types | Ensures automated emails work immediately after event creation |
| Maybe response handling | Separate template type | Provides specific messaging for uncertain responses |
| Event toggle | In event settings | Allows event managers to disable if not needed |
| Default behavior | Enabled by default | Most events want acknowledgement emails |
| Template editability | Fully editable | Users can customize all auto-created templates |

---

## Implementation Summary

### What Was Implemented

1. **New Template Type**: Added `maybe_acknowledgment` to `email_template_type` enum
2. **Default Templates**: 5 bilingual templates auto-created on event creation
3. **RSVP Email Trigger**: Automatic acknowledgement emails after RSVP submission
4. **Event Settings Toggle**: `autoAcknowledgementEmails` setting (default: enabled)
5. **Migration**: `0009_parallel_glorian.sql` applied successfully

### Files Modified/Created

| File | Change |
|------|--------|
| `server/db/schemas/email-template.ts` | Added `maybe_acknowledgment` enum value |
| `lib/schemas.ts` | Updated `emailTemplateTypeValues` |
| `server/db/schemas/event.ts` | Added `autoAcknowledgementEmails` to settings |
| `lib/email/default-templates.ts` | NEW - 5 bilingual default templates |
| `trpc/routers/events.ts` | Auto-create templates on event creation |
| `app/api/rsvp/[token]/route.ts` | Trigger acknowledgement email on RSVP |
| `components/events/event-settings-tab.tsx` | Added toggle UI |
| `components/guests/send-email-dialog.tsx` | Added `maybe_acknowledgment` type label |
| `components/guests/bulk-send-email-dialog.tsx` | Added `maybe_acknowledgment` type label |
| `messages/en.json` | Added i18n strings |
| `messages/ar.json` | Added Arabic translations |

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 21A | Schema Changes (new enum, settings type) | ~3 files | ✓ Complete |
| 21B | Default Templates System | ~2 files | ✓ Complete |
| 21C | Auto-create on Event Creation | ~1 file | ✓ Complete |
| 21D | RSVP Acknowledgement Trigger | ~1 file | ✓ Complete |
| 21E | Settings UI Toggle | ~2 files | ✓ Complete |
| 21F | i18n Updates | ~2 files | ✓ Complete |

---

## 21A: Schema Changes

### Add New Template Type

**File: `server/db/schemas/email-template.ts`**

```typescript
export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "maybe_acknowledgment",  // NEW
  "update",
  "cancellation",
  "custom",
])
```

**File: `lib/schemas.ts`**

```typescript
export const emailTemplateTypeValues = [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "maybe_acknowledgment",  // NEW
  "update",
  "cancellation",
  "custom",
] as const
```

### Add Event Settings Type

**File: `server/db/schemas/event.ts`**

Update the settings type:

```typescript
settings: json("settings").$type<{
  allowPlusOne?: boolean
  maxPlusOnes?: number
  requireApproval?: boolean
  sendReminders?: boolean
  reminderDays?: number[]
  emailSettings?: EventEmailSettings
  autoAcknowledgementEmails?: boolean  // NEW - default: true
}>(),
```

**Migration**: Run `pnpm db:generate` to create migration for enum change.

---

## 21B: Default Templates System

### Create Default Templates File

**New File: `lib/email/default-templates.ts`**

```typescript
import { BilingualEmailContent } from "@/server/db/schemas/email-template"

export type DefaultEmailTemplate = {
  name: string
  type: "invitation" | "reminder" | "confirmation" | "declined_acknowledgment" | "maybe_acknowledgment"
  content: BilingualEmailContent
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    name: "Default Invitation",
    type: "invitation",
    content: {
      en: {
        subject: "You're Invited to {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>You are cordially invited to attend {{event.name}}.</p>
<p><strong>Event Details:</strong></p>
<ul>
  <li>Date: {{event.startDate}}</li>
  <li>Venue: {{event.venue}}</li>
  <li>Address: {{event.venueAddress}}</li>
</ul>
<p>Please confirm your attendance by {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">Respond to Invitation</a></p>`,
      },
      ar: {
        subject: "دعوة لحضور {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>يسعدنا دعوتكم لحضور {{event.name}}.</p>
<p><strong>تفاصيل الفعالية:</strong></p>
<ul>
  <li>التاريخ: {{event.startDate}}</li>
  <li>المكان: {{event.venue}}</li>
  <li>العنوان: {{event.venueAddress}}</li>
</ul>
<p>يرجى تأكيد حضوركم قبل {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">الرد على الدعوة</a></p>`,
      },
    },
  },
  {
    name: "Default Reminder",
    type: "reminder",
    content: {
      en: {
        subject: "Reminder: Please respond to {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>This is a friendly reminder to respond to your invitation for {{event.name}}.</p>
<p>The RSVP deadline is {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">Respond Now</a></p>`,
      },
      ar: {
        subject: "تذكير: يرجى الرد على دعوة {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>هذا تذكير ودي للرد على دعوتكم لحضور {{event.name}}.</p>
<p>آخر موعد للرد هو {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">الرد الآن</a></p>`,
      },
    },
  },
  {
    name: "Confirmation Acknowledgement",
    type: "confirmation",
    content: {
      en: {
        subject: "Thank you for confirming - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>Thank you for confirming your attendance at {{event.name}}.</p>
<p><strong>Event Details:</strong></p>
<ul>
  <li>Date: {{event.startDate}}</li>
  <li>Venue: {{event.venue}}</li>
</ul>
<p>We look forward to seeing you!</p>
<p>If your plans change, you can update your response: <a href="{{rsvp.link}}">Update Response</a></p>`,
      },
      ar: {
        subject: "شكراً لتأكيد حضوركم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>شكراً لتأكيد حضوركم في {{event.name}}.</p>
<p><strong>تفاصيل الفعالية:</strong></p>
<ul>
  <li>التاريخ: {{event.startDate}}</li>
  <li>المكان: {{event.venue}}</li>
</ul>
<p>نتطلع لرؤيتكم!</p>
<p>إذا تغيرت خططكم، يمكنكم تحديث ردكم: <a href="{{rsvp.link}}">تحديث الرد</a></p>`,
      },
    },
  },
  {
    name: "Decline Acknowledgement",
    type: "declined_acknowledgment",
    content: {
      en: {
        subject: "We've received your response - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>We've received your response and understand you won't be able to attend {{event.name}}.</p>
<p>If your plans change, you can update your response:</p>
<p><a href="{{rsvp.link}}">Update My Response</a></p>
<p>Thank you for letting us know.</p>`,
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>تم استلام ردكم ونتفهم عدم قدرتكم على حضور {{event.name}}.</p>
<p>إذا تغيرت خططكم، يمكنكم تحديث ردكم:</p>
<p><a href="{{rsvp.link}}">تحديث الرد</a></p>
<p>شكراً لإعلامنا.</p>`,
      },
    },
  },
  {
    name: "Maybe Acknowledgement",
    type: "maybe_acknowledgment",
    content: {
      en: {
        subject: "We've received your response - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>Thank you for your response regarding {{event.name}}. We understand you're not yet certain about your availability.</p>
<p>Please update your response when you know for sure:</p>
<p><a href="{{rsvp.link}}">Update My Response</a></p>
<p>The RSVP deadline is {{event.rsvpDeadline}}.</p>`,
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>شكراً لردكم بخصوص {{event.name}}. نتفهم أنكم غير متأكدين من توفركم بعد.</p>
<p>يرجى تحديث ردكم عندما تتأكدون:</p>
<p><a href="{{rsvp.link}}">تحديث الرد</a></p>
<p>آخر موعد للرد هو {{event.rsvpDeadline}}.</p>`,
      },
    },
  },
]
```

---

## 21C: Auto-create on Event Creation

**File: `trpc/routers/events.ts`**

Update the `create` mutation to insert default templates after event creation:

```typescript
import { emailTemplates } from "@/server/db/schemas"
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email/default-templates"

// Inside create mutation, after line 230 (after event insert):

// Create default email templates for the new event
const templateInserts = DEFAULT_EMAIL_TEMPLATES.map(template => ({
  eventId: event.id,
  name: template.name,
  type: template.type,
  content: template.content,
  defaultLanguage: "en" as const,
  isDefault: true,
  isActive: true,
  createdBy: ctx.user.id,
}))

await db.insert(emailTemplates).values(templateInserts)
```

---

## 21D: RSVP Acknowledgement Trigger

**File: `app/api/rsvp/[token]/route.ts`**

Add email trigger after RSVP submission (after line 314):

```typescript
import { addSingleEmailJob } from "@/lib/queue/queues"
import { emailTemplates } from "@/server/db/schemas"

// After guest update (line 314), add:

// Send acknowledgement email if enabled
const autoEnabled = event.settings?.autoAcknowledgementEmails !== false

if (autoEnabled && guest.email) {
  // Map response status to template type
  const templateTypeMap: Record<string, string> = {
    confirmed: "confirmation",
    declined: "declined_acknowledgment",
    maybe: "maybe_acknowledgment",
  }
  const templateType = templateTypeMap[responseStatus]

  // Find default template for this type
  const template = await db.query.emailTemplates.findFirst({
    where: and(
      eq(emailTemplates.eventId, event.id),
      eq(emailTemplates.type, templateType),
      eq(emailTemplates.isDefault, true),
      isNull(emailTemplates.categoryId)
    ),
  })

  if (template) {
    // Queue the acknowledgement email (non-blocking)
    await addSingleEmailJob({
      type: "single",
      guestId: guest.id,
      eventId: event.id,
      templateId: template.id,
      emailType: templateType as EmailTemplateType,
      bulkJobId: `rsvp-ack-${response.id}`,
      language: (standardResponses?.preferredLanguage as "en" | "ar") || "en",
    })
  }
}
```

---

## 21E: Settings UI Toggle

**File: `components/events/event-settings-tab.tsx`**

Add toggle in the Email Settings section:

```tsx
<FormField
  control={form.control}
  name="settings.autoAcknowledgementEmails"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">
          {t("autoAcknowledgementEmails")}
        </FormLabel>
        <FormDescription>
          {t("autoAcknowledgementEmailsDescription")}
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value ?? true}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

---

## 21F: i18n Updates

**File: `messages/en.json`**

Add under `emailTemplate.types`:
```json
"maybe_acknowledgment": "Maybe Acknowledgment"
```

Add under `eventSettings` (or create section):
```json
"autoAcknowledgementEmails": "Auto-send RSVP Acknowledgement Emails",
"autoAcknowledgementEmailsDescription": "Automatically send confirmation emails when guests respond to your RSVP form"
```

**File: `messages/ar.json`**

Add corresponding translations:
```json
"maybe_acknowledgment": "إقرار التردد"
```

```json
"autoAcknowledgementEmails": "إرسال رسائل تأكيد RSVP تلقائياً",
"autoAcknowledgementEmailsDescription": "إرسال رسائل تأكيد تلقائية عند رد الضيوف على نموذج RSVP"
```

---

## Files Summary

| File | Action | Status |
|------|--------|--------|
| `server/db/schemas/email-template.ts` | Add `maybe_acknowledgment` to enum | ✓ Done |
| `lib/schemas.ts` | Update `emailTemplateTypeValues` | ✓ Done |
| `server/db/schemas/event.ts` | Add `autoAcknowledgementEmails` to settings type | ✓ Done |
| `lib/email/default-templates.ts` | NEW - System default template content | ✓ Done |
| `trpc/routers/events.ts` | Add template creation after event insert | ✓ Done |
| `app/api/rsvp/[token]/route.ts` | Add email queue trigger | ✓ Done |
| `components/events/event-settings-tab.tsx` | Add toggle UI | ✓ Done |
| `components/guests/send-email-dialog.tsx` | Add `maybe_acknowledgment` type label | ✓ Done |
| `components/guests/bulk-send-email-dialog.tsx` | Add `maybe_acknowledgment` type label | ✓ Done |
| `messages/en.json` | Add i18n strings | ✓ Done |
| `messages/ar.json` | Add Arabic translations | ✓ Done |

---

## Migration Notes

1. **Enum Migration**: Adding `maybe_acknowledgment` to the `email_template_type` enum requires a database migration. Run `pnpm db:generate` after schema changes.

2. **Existing Events**: Default templates will NOT be auto-created for existing events (only new events). Users can manually create templates for existing events.

3. **Backwards Compatibility**: The `autoAcknowledgementEmails` setting defaults to `true` (enabled) when not set, maintaining expected behavior for new events.

---

## Verification Checklist

### 21A: Schema Changes
- [x] `maybe_acknowledgment` added to email template type enum
- [x] `autoAcknowledgementEmails` added to event settings type
- [x] Migration generated and applied successfully (`0009_parallel_glorian.sql`)

### 21B: Default Templates
- [x] `lib/email/default-templates.ts` created with all 5 templates
- [x] Both English and Arabic content provided
- [x] Template variables use correct syntax (`{{variable}}`)

### 21C: Event Creation
- [x] New events have 5 default templates auto-created
- [x] All templates marked as `isDefault: true`
- [x] Templates properly linked to event

### 21D: RSVP Acknowledgement
- [x] Confirmed RSVP triggers confirmation email
- [x] Declined RSVP triggers declined_acknowledgment email
- [x] Maybe RSVP triggers maybe_acknowledgment email
- [x] No email sent when toggle is disabled
- [x] No email sent when template doesn't exist

### 21E: Settings UI
- [x] Toggle appears in event settings
- [x] Toggle saves correctly
- [x] Default state is enabled

### 21F: i18n
- [x] All English strings added
- [x] All Arabic strings added
- [x] Template type shows in UI correctly

---

## Critical Files Reference

| Pattern | File |
|---------|------|
| Email Template Schema | `server/db/schemas/email-template.ts` |
| Event Schema | `server/db/schemas/event.ts` |
| Template Types | `lib/schemas.ts` |
| RSVP API Route | `app/api/rsvp/[token]/route.ts` |
| Event Creation | `trpc/routers/events.ts` |
| Email Queue | `lib/queue/queues.ts` |
| Settings Tab | `components/events/event-settings-tab.tsx` |
