# Stage 6: Email Template Builder

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Build a bilingual (EN/AR) email template builder UI integrated into the event admin dashboard. This feature enables event managers to create, edit, and preview email templates for invitations, reminders, confirmations, and other guest communications.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Editor Type | CodeMirror 6 code editor | Syntax highlighting, line numbers, cursor-aware variable insertion, RTL support |
| Bilingual Storage | JSON structure | Flexible, no schema migration, stores `{ en: {...}, ar: {...} }` |
| Bilingual UX | Tab switching (EN/AR) | Cleaner UI, less screen space, RTL auto-applied for AR tab |
| Scope | Templates only | No email sending in this phase |
| Integration Point | New "Emails" tab in Event Detail | Follows existing tab pattern |
| Modal Pattern | Sheet (slide-in) | Matches existing workspace modals |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 6A | Schema & Router Updates | ~4 files |
| 6B | Template List UI | ~6 files |
| 6C | Template Editor with CodeMirror | ~8 files |
| 6D | Preview & Variable Insertion | ~4 files |

---

## 6A: Schema & Router Updates

### Schema Changes

**Update `server/db/schemas/email-template.ts`:**

Change content fields to JSON structure for bilingual support:

```typescript
import { jsonb } from "drizzle-orm/pg-core"

// Define content structure type
export type BilingualContent = {
  en: {
    subject: string
    htmlContent: string
    textContent?: string
  }
  ar?: {
    subject?: string
    htmlContent?: string
    textContent?: string
  }
}

export const emailTemplates = pgTable("email_template", {
  // ... existing fields (id, eventId, name, type, categoryId, etc.)

  // Replace single content fields with JSON
  content: jsonb("content").$type<BilingualContent>().notNull(),

  // Keep sender fields as-is
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),

  // Default language for this template
  defaultLanguage: text("default_language").notNull().default("en"),

  // ... rest of existing fields
})
```

**Migration Strategy:**
1. Add new `content` jsonb column
2. Migrate existing data: `{ en: { subject, htmlContent, textContent } }`
3. Drop old `subject`, `htmlContent`, `textContent` columns
4. Add `defaultLanguage` column

### tRPC Router Updates

**Update `trpc/routers/email-templates.ts`:**

Update input/output schemas for bilingual content:

```typescript
const bilingualContentSchema = z.object({
  en: z.object({
    subject: z.string().min(1, "Subject is required"),
    htmlContent: z.string().min(1, "HTML content is required"),
    textContent: z.string().optional(),
  }),
  ar: z.object({
    subject: z.string().optional(),
    htmlContent: z.string().optional(),
    textContent: z.string().optional(),
  }).optional(),
})

// Update create input
create: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    name: z.string().min(1).max(100),
    type: z.enum(emailTemplateTypeValues),
    categoryId: z.string().uuid().optional(),
    content: bilingualContentSchema,
    defaultLanguage: z.enum(["en", "ar"]).default("en"),
    fromName: z.string().max(100).optional(),
    fromEmail: z.string().email().optional(),
    replyTo: z.string().email().optional(),
    isDefault: z.boolean().optional(),
  }))
```

### Zod Validation Schemas

**Create `lib/schemas/email-template-schemas.ts`:**

```typescript
import { z } from "zod"

export const emailTemplateTypeValues = [
  "invitation",
  "reminder",
  "confirmation",
  "declined_acknowledgment",
  "update",
  "cancellation",
  "custom",
] as const

export const bilingualContentSchema = z.object({
  en: z.object({
    subject: z.string().min(1, "Subject is required").max(200),
    htmlContent: z.string().min(1, "HTML content is required").max(100000),
    textContent: z.string().max(50000).optional(),
  }),
  ar: z.object({
    subject: z.string().max(200).optional(),
    htmlContent: z.string().max(100000).optional(),
    textContent: z.string().max(50000).optional(),
  }).optional(),
})

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  type: z.enum(emailTemplateTypeValues),
  categoryId: z.string().uuid().optional().nullable(),
  content: bilingualContentSchema,
  defaultLanguage: z.enum(["en", "ar"]).default("en"),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  replyTo: z.string().email().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
})

export type CreateEmailTemplateValues = z.infer<typeof createEmailTemplateSchema>
```

---

## 6B: Template List UI

### Add Emails Tab

**Update `components/events/event-tabs.tsx`:**

Add "Emails" tab between Categories and Settings:

```typescript
const tabs = [
  { value: "overview" as const, label: "Overview", icon: Icons.dashboard },
  { value: "guests" as const, label: t("guest.guests"), icon: Icons.users },
  { value: "categories" as const, label: t("guest.categories"), icon: Icons.layers },
  { value: "emails" as const, label: t("email.templates"), icon: Icons.mail },
  { value: "settings" as const, label: t("common.settings"), icon: Icons.settings },
]
```

### Files to Create

```
components/email-templates/
├── event-emails-tab.tsx              # Main tab content
├── email-template-list.tsx           # Template list with filters
├── email-template-card.tsx           # Individual template row
├── email-template-toolbar.tsx        # Search + filter bar
├── email-template-type-badge.tsx     # Type badge component
└── email-template-empty.tsx          # Empty state
```

### Template List Design

```
+------------------------------------------------------------------+
| EMAIL TEMPLATES                              [+ Create Template]  |
| Manage email templates for guest communications                   |
+------------------------------------------------------------------+
| [All Types ▼]  [All Categories ▼]  [Search templates...        ] |
+------------------------------------------------------------------+
| ☐ | TYPE        | NAME                  | CATEGORY | UPDATED    |
+------------------------------------------------------------------+
| ☐ | Invitation  | VIP Guest Invitation  | AAA      | 2 days ago |
|   |             | Subject: You're Invited to {{event.name}}      |
|   |             | [Default] [EN] [AR]                      [⋮]  |
+------------------------------------------------------------------+
| ☐ | Reminder    | RSVP Reminder         | All      | 5 days ago |
|   |             | Subject: Please confirm your attendance        |
|   |             | [EN]                                     [⋮]  |
+------------------------------------------------------------------+
```

### Event Emails Tab Component

**`components/email-templates/event-emails-tab.tsx`:**

```typescript
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useEmailTemplates } from "@/trpc/hooks/email-hooks"
import { EmailTemplateList } from "./email-template-list"
import { EmailTemplateModal } from "./email-template-modal"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

interface EventEmailsTabProps {
  eventId: string
  workspaceSlug: string
}

export function EventEmailsTab({ eventId, workspaceSlug }: EventEmailsTabProps) {
  const t = useTranslations("emailTemplate")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const { data: templates, isLoading } = useEmailTemplates({ eventId })

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplateId(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleCreate}>
          <Icons.plus className="mr-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      <EmailTemplateList
        templates={templates?.templates ?? []}
        isLoading={isLoading}
        onEdit={handleEdit}
        eventId={eventId}
      />

      <EmailTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        eventId={eventId}
        templateId={editingTemplateId}
        workspaceSlug={workspaceSlug}
      />
    </div>
  )
}
```

### Row Actions Menu

- Edit Template
- Duplicate Template
- Set as Default (for type/category combo)
- Delete (with confirmation)

---

## 6C: Template Editor with CodeMirror

### Dependencies

```bash
pnpm add @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css
```

### Files to Create

```
components/email-templates/
├── email-template-modal.tsx          # Sheet wrapper
├── email-template-form.tsx           # Full form with tabs
├── email-template-metadata.tsx       # Name, type, category fields
├── email-template-content.tsx        # Language tabs + editors
├── email-template-editor.tsx         # CodeMirror wrapper
├── email-template-language-tabs.tsx  # EN/AR switcher
├── email-template-form-skeleton.tsx  # Loading state
└── index.ts                          # Barrel exports

hooks/
└── use-email-template-modal.ts       # Modal state (nuqs)
```

### Template Editor Modal Design

```
+------------------------------------------------------------------+
| X                                                                 |
| Create Email Template                                             |
| Configure your email template with bilingual support              |
+------------------------------------------------------------------+
|                                                                   |
| TEMPLATE DETAILS                                                  |
| +---------------------------+  +---------------------------+      |
| | Template Name *           |  | Type *                    |      |
| | [VIP Guest Invitation   ] |  | [Invitation          ▼]  |      |
| +---------------------------+  +---------------------------+      |
|                                                                   |
| +---------------------------+  +---------------------------+      |
| | Category (Optional)       |  | Default Language          |      |
| | [AAA - VIP Guests     ▼]  |  | [English             ▼]  |      |
| +---------------------------+  +---------------------------+      |
|                                                                   |
| [ ] Mark as default template for this type                        |
|                                                                   |
+------------------------------------------------------------------+
| EMAIL CONTENT                                    [EN] [AR]        |
+------------------------------------------------------------------+
|                                                                   |
| Subject Line *                                [Insert Variable ▼] |
| +---------------------------------------------------------------+ |
| | You're Invited to {{event.name}}                              | |
| +---------------------------------------------------------------+ |
|                                                                   |
| HTML Content *                                [Insert Variable ▼] |
| +---------------------------------------------------------------+ |
| | 1  <!DOCTYPE html>                                    [lines] | |
| | 2  <html>                                                     | |
| | 3  <body>                                                     | |
| | 4    <h1>Dear {{guest.fullName}},</h1>                        | |
| | 5    <p>You are invited to {{event.name}}...</p>              | |
| | 6  </body>                                                    | |
| | 7  </html>                                                    | |
| +---------------------------------------------------------------+ |
|                                                                   |
| Plain Text (Optional)                         [Insert Variable ▼] |
| +---------------------------------------------------------------+ |
| | Dear {{guest.fullName}},                                      | |
| |                                                               | |
| | You are invited to {{event.name}}...                          | |
| +---------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
| AVAILABLE VARIABLES                                          [▼] |
| Guest: firstName, lastName, fullName, title, email, category     |
| Event: name, venue, venueAddress, startDate, endDate             |
| Links: rsvp.link, rsvp.confirmLink, rsvp.declineLink             |
+------------------------------------------------------------------+
|                                                                   |
| [Preview]                           [Cancel]  [Save Template]     |
+------------------------------------------------------------------+
```

### CodeMirror Editor Component

**`components/email-templates/email-template-editor.tsx`:**

```typescript
"use client"

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { html } from "@codemirror/lang-html"
import { EditorView } from "@codemirror/view"

export interface EditorHandle {
  insertAtCursor: (text: string) => void
}

interface EmailTemplateEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  direction?: "ltr" | "rtl"
}

export const EmailTemplateEditor = forwardRef<EditorHandle, EmailTemplateEditorProps>(
  ({ value, onChange, placeholder, minHeight = "200px", direction = "ltr" }, ref) => {
    const editorRef = useRef<ReactCodeMirrorRef>(null)

    const insertAtCursor = useCallback((text: string) => {
      const view = editorRef.current?.view
      if (!view) return

      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      })
      view.focus()
    }, [])

    useImperativeHandle(ref, () => ({ insertAtCursor }), [insertAtCursor])

    return (
      <div className="rounded-md border" dir={direction}>
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          extensions={[
            html(),
            EditorView.lineWrapping,
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          style={{ minHeight }}
          className="text-sm"
        />
      </div>
    )
  }
)

EmailTemplateEditor.displayName = "EmailTemplateEditor"
```

### Language Tabs Component

**`components/email-templates/email-template-language-tabs.tsx`:**

```typescript
"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

interface LanguageTabsProps {
  value: "en" | "ar"
  onChange: (value: "en" | "ar") => void
  hasEnContent: boolean
  hasArContent: boolean
}

export function LanguageTabs({ value, onChange, hasEnContent, hasArContent }: LanguageTabsProps) {
  const t = useTranslations("emailTemplate")

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "en" | "ar")}>
      <TabsList>
        <TabsTrigger value="en" className="gap-2">
          {t("languages.en")}
          {hasEnContent && <Badge variant="secondary" className="h-5 px-1.5 text-xs">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="ar" className="gap-2">
          {t("languages.ar")}
          {hasArContent && <Badge variant="secondary" className="h-5 px-1.5 text-xs">✓</Badge>}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
```

---

## 6D: Preview & Variable Insertion

### Files to Create

```
components/email-templates/
├── email-template-preview.tsx        # Preview dialog
├── variable-inserter.tsx             # Variable dropdown
└── variable-reference.tsx            # Collapsible reference panel
```

### Variable Inserter Component

**`components/email-templates/variable-inserter.tsx`:**

```typescript
"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { useTemplateVariables } from "@/trpc/hooks/email-hooks"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

interface VariableInserterProps {
  eventId: string
  onInsert: (variable: string) => void
}

const variableDescriptions: Record<string, string> = {
  "guest.firstName": "Guest's first name",
  "guest.lastName": "Guest's last name",
  "guest.fullName": "Guest's full name",
  "guest.title": "Guest's title (Mr., Mrs., Dr.)",
  "guest.email": "Guest's email address",
  "guest.position": "Guest's job position",
  "guest.entity": "Guest's company/organization",
  "guest.category": "Guest's category name",
  "event.name": "Event name",
  "event.venue": "Event venue",
  "event.venueAddress": "Full venue address",
  "event.startDate": "Event start date",
  "event.endDate": "Event end date",
  "event.rsvpDeadline": "RSVP deadline",
  "rsvp.link": "Personalized RSVP page link",
  "rsvp.confirmLink": "Direct confirmation link",
  "rsvp.declineLink": "Direct decline link",
  "category.name": "Category name",
  "category.services": "Category service summary",
}

export function VariableInserter({ eventId, onInsert }: VariableInserterProps) {
  const t = useTranslations("emailTemplate")
  const { data: variables } = useTemplateVariables(eventId)

  const groups = useMemo(() => {
    if (!variables) return []
    return Object.entries(variables).map(([key, vars]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      variables: (vars as string[]).map((v: string) => ({
        key: `{{${key}.${v}}}`,
        name: v,
        description: variableDescriptions[`${key}.${v}`] || v,
      })),
    }))
  }, [variables])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Icons.braces className="mr-2 h-3.5 w-3.5" />
          {t("insertVariable")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.variables.map((v) => (
                  <CommandItem
                    key={v.key}
                    onSelect={() => onInsert(v.key)}
                    className="flex flex-col items-start gap-1"
                  >
                    <code className="text-xs font-mono">{v.key}</code>
                    <span className="text-xs text-muted-foreground">
                      {v.description}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### Preview Component

**`components/email-templates/email-template-preview.tsx`:**

```typescript
"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: string
  htmlContent: string
  textContent?: string
  language: "en" | "ar"
}

// Sample data for preview
const sampleData = {
  guest: {
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    fullName: "Ahmed Al-Rashid",
    title: "Mr.",
    email: "ahmed@example.com",
    position: "Director",
    entity: "ACME Corporation",
    category: "VIP",
  },
  event: {
    name: "Annual Gala 2025",
    venue: "The Grand Ballroom",
    venueAddress: "King Fahd Road, Riyadh",
    startDate: "December 15, 2025",
    endDate: "December 15, 2025",
    rsvpDeadline: "December 1, 2025",
  },
  rsvp: {
    link: "https://example.com/rsvp/abc123",
    confirmLink: "https://example.com/rsvp/abc123?action=confirm",
    declineLink: "https://example.com/rsvp/abc123?action=decline",
  },
  category: {
    name: "VIP",
    services: "5-star hotel, business class flight",
  },
}

function replaceVariables(content: string): string {
  return content.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => {
    const groupData = sampleData[group as keyof typeof sampleData]
    if (groupData && key in groupData) {
      return groupData[key as keyof typeof groupData] as string
    }
    return match
  })
}

export function EmailTemplatePreview({
  open,
  onOpenChange,
  subject,
  htmlContent,
  textContent,
  language,
}: PreviewProps) {
  const renderedSubject = useMemo(() => replaceVariables(subject), [subject])
  const renderedHtml = useMemo(() => replaceVariables(htmlContent), [htmlContent])
  const renderedText = useMemo(
    () => (textContent ? replaceVariables(textContent) : ""),
    [textContent]
  )

  const direction = language === "ar" ? "rtl" : "ltr"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/50">
            <span className="text-sm font-medium">Subject: </span>
            <span className="text-sm">{renderedSubject}</span>
          </div>

          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="text">Plain Text</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="mt-4">
              <div className="rounded-md border bg-white">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html dir="${direction}">
                    <head>
                      <meta charset="utf-8">
                      <style>body { font-family: system-ui, sans-serif; margin: 16px; }</style>
                    </head>
                    <body>${renderedHtml}</body>
                    </html>
                  `}
                  sandbox="allow-same-origin"
                  className="w-full h-[400px] border-0"
                  title="Email Preview"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <pre
                  className="whitespace-pre-wrap font-mono text-sm"
                  dir={direction}
                >
                  {renderedText || "No plain text content"}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## i18n Additions

**Add to `messages/en.json`:**

```json
{
  "emailTemplate": {
    "title": "Email Templates",
    "description": "Manage email templates for guest communications",
    "create": "Create Template",
    "edit": "Edit Template",
    "duplicate": "Duplicate",
    "delete": "Delete",
    "preview": "Preview",
    "save": "Save Template",
    "noTemplates": "No email templates yet",
    "noTemplatesDescription": "Create templates for invitations, reminders, and more",
    "createFirst": "Create First Template",
    "setAsDefault": "Set as Default",
    "isDefault": "Default",
    "insertVariable": "Insert Variable",
    "availableVariables": "Available Variables",
    "lastUpdated": "Last updated",
    "fields": {
      "name": "Template Name",
      "type": "Template Type",
      "category": "Category",
      "categoryOptional": "Category (Optional)",
      "defaultLanguage": "Default Language",
      "markAsDefault": "Mark as default template for this type",
      "subject": "Subject Line",
      "htmlContent": "HTML Content",
      "textContent": "Plain Text (Optional)"
    },
    "languages": {
      "en": "English",
      "ar": "Arabic"
    },
    "types": {
      "invitation": "Invitation",
      "reminder": "Reminder",
      "confirmation": "Confirmation",
      "declined_acknowledgment": "Declined Acknowledgment",
      "update": "Update",
      "cancellation": "Cancellation",
      "custom": "Custom"
    },
    "confirmDelete": "Are you sure you want to delete this template?",
    "confirmDeleteDescription": "This action cannot be undone.",
    "templateDetails": "Template Details",
    "emailContent": "Email Content"
  }
}
```

**Add to `messages/ar.json`:**

```json
{
  "emailTemplate": {
    "title": "قوالب البريد الإلكتروني",
    "description": "إدارة قوالب البريد للتواصل مع الضيوف",
    "create": "إنشاء قالب",
    "edit": "تعديل القالب",
    "duplicate": "تكرار",
    "delete": "حذف",
    "preview": "معاينة",
    "save": "حفظ القالب",
    "noTemplates": "لا توجد قوالب بريد بعد",
    "noTemplatesDescription": "أنشئ قوالب للدعوات والتذكيرات والمزيد",
    "createFirst": "إنشاء القالب الأول",
    "setAsDefault": "تعيين كافتراضي",
    "isDefault": "افتراضي",
    "insertVariable": "إدراج متغير",
    "availableVariables": "المتغيرات المتاحة",
    "lastUpdated": "آخر تحديث",
    "fields": {
      "name": "اسم القالب",
      "type": "نوع القالب",
      "category": "الفئة",
      "categoryOptional": "الفئة (اختياري)",
      "defaultLanguage": "اللغة الافتراضية",
      "markAsDefault": "تعيين كقالب افتراضي لهذا النوع",
      "subject": "عنوان البريد",
      "htmlContent": "محتوى HTML",
      "textContent": "نص عادي (اختياري)"
    },
    "languages": {
      "en": "الإنجليزية",
      "ar": "العربية"
    },
    "types": {
      "invitation": "دعوة",
      "reminder": "تذكير",
      "confirmation": "تأكيد",
      "declined_acknowledgment": "إقرار الاعتذار",
      "update": "تحديث",
      "cancellation": "إلغاء",
      "custom": "مخصص"
    },
    "confirmDelete": "هل أنت متأكد من حذف هذا القالب؟",
    "confirmDeleteDescription": "لا يمكن التراجع عن هذا الإجراء.",
    "templateDetails": "تفاصيل القالب",
    "emailContent": "محتوى البريد"
  }
}
```

---

## Dependencies

```bash
pnpm add @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css
```

---

## Verification Checklist

### 6A: Schema & Router
- [x] Schema updated with JSON content field
- [x] Migration created and tested
- [x] tRPC router updated with bilingual input
- [x] Zod schemas created

### 6B: Template List UI
- [x] Emails tab added to event detail
- [x] Template list displays correctly
- [x] Filter by type works
- [x] Filter by category works
- [x] Search works
- [x] Empty state displays

### 6C: Template Editor
- [x] Create template modal opens
- [x] Form validation works
- [x] CodeMirror editor renders
- [x] EN/AR tab switching works
- [x] RTL applies for Arabic tab
- [x] Save creates template
- [x] Edit loads existing template
- [x] Duplicate works

### 6D: Preview & Variables
- [x] Variable inserter dropdown works
- [x] Variables insert at cursor position
- [x] Preview dialog opens
- [x] Variables replaced with sample data
- [x] HTML renders in iframe
- [x] Plain text displays correctly
- [x] RTL applies for Arabic preview

---

## Implementation Summary

**Completed:** November 2024

### Files Created

```
components/email-templates/
├── event-emails-tab.tsx          # Main tab with template list, filters, actions
├── email-template-modal.tsx       # Sheet wrapper for create/edit
├── email-template-form.tsx        # Full form with EN/AR tabs, validation
├── email-template-editor.tsx      # CodeMirror wrapper with cursor insertion
├── email-template-preview.tsx     # Preview modal with iframe rendering
├── variable-inserter.tsx          # Command-based variable dropdown
└── index.ts                       # Barrel exports
```

### Files Modified

- `server/db/schemas/email-template.ts` - Added `BilingualEmailContent` type, changed to JSON `content` field
- `trpc/routers/email-templates.ts` - Updated create/update/duplicate for bilingual content
- `lib/schemas.ts` - Added `bilingualEmailContentSchema` and related types
- `components/events/event-tabs.tsx` - Added "Emails" tab
- `messages/en.json` - Added `emailTemplate` namespace
- `messages/ar.json` - Added Arabic translations

### Dependencies Added

```bash
pnpm add @uiw/react-codemirror @codemirror/lang-html @codemirror/lang-css @codemirror/view @codemirror/state
```

### Implementation Notes

1. **Simplified Component Structure**: Combined template list, card, toolbar into single `event-emails-tab.tsx` for faster implementation
2. **Variable Insertion**: Uses cursor-aware insertion for CodeMirror editors; subject fields append to end
3. **Preview**: Sandboxed iframe with sample data substitution for both EN and AR content
4. **Form State**: React Hook Form with Zod validation, language tabs manage content switching

### Migration Note

If existing email templates exist in the database with the old schema (separate `subject`, `htmlContent`, `textContent` columns), a data migration will be needed to convert to the new JSON `content` structure.

---

## Critical Files Reference

| Pattern | File |
|---------|------|
| Tab component | `components/events/event-tabs.tsx` |
| Tab content pattern | `components/events/event-categories-tab.tsx` |
| Sheet modal | `components/guests/category-modal.tsx` |
| Form pattern | `components/forms/create-event-form.tsx` |
| tRPC router | `trpc/routers/email-templates.ts` |
| React Query hooks | `trpc/hooks/email-hooks.ts` |
| Schema | `server/db/schemas/email-template.ts` |
| Modal hook | `hooks/use-create-event-modal.ts` |
| Command component | `components/ui/command.tsx` |

---

## File Structure Summary

**New files to create:**

```
components/email-templates/
├── event-emails-tab.tsx
├── email-template-list.tsx
├── email-template-card.tsx
├── email-template-toolbar.tsx
├── email-template-type-badge.tsx
├── email-template-empty.tsx
├── email-template-modal.tsx
├── email-template-form.tsx
├── email-template-metadata.tsx
├── email-template-content.tsx
├── email-template-editor.tsx
├── email-template-language-tabs.tsx
├── email-template-preview.tsx
├── variable-inserter.tsx
├── variable-reference.tsx
├── email-template-form-skeleton.tsx
└── index.ts

hooks/
└── use-email-template-modal.ts

lib/schemas/
└── email-template-schemas.ts
```

**Files to modify:**

```
server/db/schemas/email-template.ts   # Add JSON content structure
trpc/routers/email-templates.ts       # Update input schemas
components/events/event-tabs.tsx      # Add Emails tab
messages/en.json                      # Add translations
messages/ar.json                      # Add Arabic translations
package.json                          # Add CodeMirror dependencies
```

---

## Future Enhancements (Not in Scope)

- Email sending UI and bulk campaigns
- Template versioning/history
- A/B testing for templates
- Template analytics (open rates, click rates)
- AI-powered template suggestions
- Import/export templates
- Template sharing across events
