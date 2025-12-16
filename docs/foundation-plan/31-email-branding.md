# Stage 31: Email Master Template & Branding System

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Complete

## Objective

Implement a master template system that separates email layout (structure) from content (text), with automatic branding injection. This enables consistent email design across all templates while allowing content-only editing.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Master Template Scope | Workspace + Event override | Follows existing branding inheritance pattern |
| Content Model | Structured fields | Easier editing, automatic assembly, less error-prone |
| Email Branding | Extend existing branding | Reuses infrastructure, inherits visual brand by default |
| Template Engine | Handlebars | Lightweight, supports conditionals, widely used |
| Backwards Compatibility | Keep legacy HTML support | Existing templates continue to work |

---

## Implementation Summary

**Completed**: December 2024

### What Was Built

1. **Master Template System** - Separates email layout from content
   - `emailMasterTemplates` table for storing templates
   - Default master template with Handlebars placeholders
   - Structure toggles (logo, accent strip, sections, divider, footer)
   - Language order configuration (EN first or AR first)
   - **Full management UI** in workspace branding settings (list, edit, duplicate, delete, set default)

2. **Structured Content Model** - Form-based email editing
   - `BilingualStructuredContent` type with EN (required) and AR (optional)
   - Fields: subject, greeting, heading, subheading, body paragraphs, CTA, post-CTA text
   - Variable insertion support in all fields
   - **Document insertion** in body paragraphs (integrates with Stage 14 document management)

3. **Email Branding** - Extended workspace/event branding
   - Colors: accent strip, heading, body text, CTA button
   - Typography: English and Arabic font families (including Noto Sans brand fonts)
   - Layout: accent strip height, button style
   - Footer text configuration

4. **Backwards Compatibility** - Existing templates continue to work
   - `renderEmailTemplate()` checks for `structuredContent`
   - Routes to structured renderer or legacy HTML renderer
   - No migration required for existing templates

### Key Files Created

- `server/db/schemas/email-master-template.ts` - Database schema
- `lib/email/master-templates/default.ts` - Default HTML template
- `lib/email/render-structured.ts` - Structured email renderer
- `trpc/routers/email-master-templates.ts` - API endpoints
- `trpc/hooks/master-template-hooks.ts` - React Query hooks
- `components/email-templates/structured-content-editor.tsx` - Content editor
- `components/email-templates/master-template-editor.tsx` - Template editor
- `components/email-templates/master-template-preview.tsx` - Preview component
- `components/branding/email-branding-settings.tsx` - Branding settings

### Key Files Modified

- `lib/queue/email-job.ts` - Added structured template routing
- `lib/branding/utils.ts` - Added `resolveEmailBranding()`
- `trpc/routers/email-templates.ts` - Added structured content endpoints
- `trpc/routers/workspaces.ts` - Seeds default master template on create
- `components/email-templates/email-template-form.tsx` - Mode toggle
- `components/workspace/workspace-branding-form.tsx` - Email branding section

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 31A | Schema & Types | ~4 files | ✅ Complete |
| 31B | Branding & Rendering Utilities | ~4 files | ✅ Complete |
| 31C | API Layer (tRPC) | ~4 files | ✅ Complete |
| 31D | UI Components | ~6 files | ✅ Complete |
| 31E | Pages & Integration | ~3 files | ✅ Complete |
| 31F | Migration & Seed Data | ~2 files | ✅ Complete |

---

## 31A: Schema & Types

### Email Branding Config

Add email-specific styling to workspace/event branding.

**Update `server/db/schemas/workspace.ts`:**

```typescript
export type EmailBrandingConfig = {
  // Colors (defaults from visual branding if not set)
  accentStripColor?: string       // Top accent strip (default: accentColor)
  headingColor?: string           // h1/h2 headings (default: primaryColor)
  bodyTextColor?: string          // Body text (default: #374151)
  ctaButtonColor?: string         // CTA button bg (default: accentColor)
  ctaButtonTextColor?: string     // CTA button text (default: #ffffff)

  // Typography
  fontFamily?: 'inter' | 'arial' | 'georgia' | 'system'
  arabicFontFamily?: 'din-next' | 'geeza' | 'tahoma' | 'system'

  // Layout
  accentStripHeight?: 'thin' | 'medium' | 'thick'  // 3px, 6px, 10px
  ctaButtonStyle?: 'rounded' | 'pill' | 'square'

  // Footer
  footerText?: string
}

export type WorkspaceBranding = {
  logo?: string
  logoDark?: string
  primaryColor?: string
  accentColor?: string
  primaryColorDark?: string
  accentColorDark?: string
  emailBranding?: EmailBrandingConfig  // NEW
}
```

**Update `server/db/schemas/event.ts`:**

Add same `emailBranding?: EmailBrandingConfig` to `EventBranding` type.

### Master Template Schema

**Create `server/db/schemas/email-master-template.ts`:**

```typescript
import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { workspaces } from "./workspace"
import { events } from "./event"
import { users } from "./user"

export type MasterTemplateStructure = {
  showLogo: boolean
  showAccentStrip: boolean
  showEnglishSection: boolean
  showArabicSection: boolean
  showDivider: boolean
  showFooter: boolean
  sectionOrder: ('en' | 'ar')[]
}

export const emailMasterTemplates = pgTable(
  "email_master_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    eventId: text("event_id")
      .references(() => events.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),
    htmlTemplate: text("html_template").notNull(),
    structure: json("structure").$type<MasterTemplateStructure>(),

    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("email_master_template_workspace_idx").on(table.workspaceId),
    index("email_master_template_event_idx").on(table.eventId),
  ]
)
```

### Structured Content for Email Templates

**Update `server/db/schemas/email-template.ts`:**

```typescript
// New structured content type
export type StructuredEmailContent = {
  subject: string
  greeting?: string              // "Dear {{guest.fullName}},"
  heading: string                // "You Are Cordially Invited"
  subheading?: string            // Event name or tagline
  bodyParagraphs: string[]       // Array of paragraphs
  cta?: {
    text: string                 // "Confirm Your Attendance"
    url: string                  // "{{rsvp.link}}"
  }
  postCtaText?: string
  htmlOverride?: string          // Legacy: full HTML for backwards compat
}

export type BilingualStructuredContent = {
  en: StructuredEmailContent
  ar?: Partial<StructuredEmailContent>
}

// Add new columns to emailTemplates table:
// - structuredContent: jsonb("structured_content").$type<BilingualStructuredContent>()
// - masterTemplateId: text("master_template_id").references(() => emailMasterTemplates.id)
```

### Zod Validation Schemas

**Update `lib/schemas.ts`:**

```typescript
export const emailBrandingConfigSchema = z.object({
  accentStripColor: hexColorSchema.optional(),
  headingColor: hexColorSchema.optional(),
  bodyTextColor: hexColorSchema.optional(),
  ctaButtonColor: hexColorSchema.optional(),
  ctaButtonTextColor: hexColorSchema.optional(),
  fontFamily: z.enum(['inter', 'arial', 'georgia', 'system']).optional(),
  arabicFontFamily: z.enum(['din-next', 'geeza', 'tahoma', 'system']).optional(),
  accentStripHeight: z.enum(['thin', 'medium', 'thick']).optional(),
  ctaButtonStyle: z.enum(['rounded', 'pill', 'square']).optional(),
  footerText: z.string().max(500).optional(),
})

export const structuredEmailContentSchema = z.object({
  subject: z.string().min(1).max(200),
  greeting: z.string().max(200).optional(),
  heading: z.string().min(1).max(200),
  subheading: z.string().max(300).optional(),
  bodyParagraphs: z.array(z.string().max(2000)).min(1).max(10),
  cta: z.object({
    text: z.string().min(1).max(100),
    url: z.string().min(1).max(500),
  }).optional(),
  postCtaText: z.string().max(500).optional(),
  htmlOverride: z.string().max(100000).optional(),
})

export const bilingualStructuredContentSchema = z.object({
  en: structuredEmailContentSchema,
  ar: structuredEmailContentSchema.partial().optional(),
})

export const masterTemplateStructureSchema = z.object({
  showLogo: z.boolean().default(true),
  showAccentStrip: z.boolean().default(true),
  showEnglishSection: z.boolean().default(true),
  showArabicSection: z.boolean().default(true),
  showDivider: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  sectionOrder: z.array(z.enum(['en', 'ar'])).default(['en', 'ar']),
})
```

---

## 31B: Branding & Rendering Utilities

### Email Branding Resolution

**Update `lib/branding/utils.ts`:**

```typescript
export type ResolvedEmailBranding = {
  accentStripColor: string
  accentStripHeight: 'thin' | 'medium' | 'thick'
  headingColor: string
  bodyTextColor: string
  ctaButtonColor: string
  ctaButtonTextColor: string
  ctaButtonStyle: 'rounded' | 'pill' | 'square'
  fontFamily: string
  arabicFontFamily: string
  footerText?: string
}

export function resolveEmailBranding(
  workspaceEmailBranding?: EmailBrandingConfig,
  eventEmailBranding?: EmailBrandingConfig,
  resolvedVisualBranding?: ResolvedBranding
): ResolvedEmailBranding {
  const ws = workspaceEmailBranding ?? {}
  const ev = eventEmailBranding ?? {}

  return {
    accentStripColor: ev.accentStripColor || ws.accentStripColor || resolvedVisualBranding?.accentColor || '#A67C52',
    accentStripHeight: ev.accentStripHeight || ws.accentStripHeight || 'medium',
    headingColor: ev.headingColor || ws.headingColor || resolvedVisualBranding?.primaryColor || '#1B5E5E',
    bodyTextColor: ev.bodyTextColor || ws.bodyTextColor || '#374151',
    ctaButtonColor: ev.ctaButtonColor || ws.ctaButtonColor || resolvedVisualBranding?.accentColor || '#A67C52',
    ctaButtonTextColor: ev.ctaButtonTextColor || ws.ctaButtonTextColor || '#ffffff',
    ctaButtonStyle: ev.ctaButtonStyle || ws.ctaButtonStyle || 'rounded',
    fontFamily: ev.fontFamily || ws.fontFamily || 'inter',
    arabicFontFamily: ev.arabicFontFamily || ws.arabicFontFamily || 'din-next',
    footerText: ev.footerText || ws.footerText,
  }
}

// Font stack helpers
export function getFontStack(family: string): string {
  const stacks: Record<string, string> = {
    'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'arial': "Arial, Helvetica, sans-serif",
    'georgia': "Georgia, 'Times New Roman', serif",
    'system': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  }
  return stacks[family] || stacks['inter']
}

export function getArabicFontStack(family: string): string {
  const stacks: Record<string, string> = {
    'din-next': "'DIN Next Arabic', 'Geeza Pro', Tahoma, sans-serif",
    'geeza': "'Geeza Pro', 'Arabic Typesetting', Tahoma, sans-serif",
    'tahoma': "Tahoma, 'Arabic Typesetting', sans-serif",
    'system': "'Geeza Pro', Tahoma, sans-serif",
  }
  return stacks[family] || stacks['din-next']
}

export function getAccentStripHeight(height: string): string {
  return { thin: '3px', medium: '6px', thick: '10px' }[height] || '6px'
}

export function getCtaBorderRadius(style: string): string {
  return { rounded: '6px', pill: '9999px', square: '0px' }[style] || '6px'
}
```

### Default Master Template

**Create `lib/email/master-templates/default.ts`:**

Store the default master template HTML based on `docs/email-sample.html`:
- Handlebars placeholders for branding values
- Conditional sections for structure toggles
- EN and AR content insertion points

### Structured Email Renderer

**Create `lib/email/render-structured.ts`:**

```typescript
import Handlebars from 'handlebars'
import { resolveEmailBranding, resolveBranding } from '@/lib/branding/utils'
import { defaultMasterTemplate } from './master-templates/default'

export function renderStructuredEmail(options: {
  template: TemplateWithStructuredContent
  masterTemplate?: MasterTemplate
  guest: Guest
  event: Event
  workspaceBranding: WorkspaceBranding
  eventBranding?: EventBranding
  documents?: EventDocument[]
}): RenderResult {
  const {
    template,
    masterTemplate,
    guest,
    event,
    workspaceBranding,
    eventBranding,
    documents = [],
  } = options

  // 1. Resolve branding
  const resolvedBranding = resolveBranding(workspaceBranding, eventBranding)
  const emailBranding = resolveEmailBranding(
    workspaceBranding?.emailBranding,
    eventBranding?.emailBranding,
    resolvedBranding
  )

  // 2. Build variable context
  const variables = buildVariables(guest, event, documents)

  // 3. Process structured content with variable replacement
  const enContent = processStructuredContent(template.structuredContent.en, variables)
  const arContent = template.structuredContent.ar
    ? processStructuredContent(template.structuredContent.ar, variables)
    : null

  // 4. Render content sections
  const enHtml = renderContentSection(enContent, emailBranding, 'ltr')
  const arHtml = arContent ? renderContentSection(arContent, emailBranding, 'rtl') : ''

  // 5. Assemble with master template
  const masterHtml = masterTemplate?.htmlTemplate || defaultMasterTemplate
  const structure = masterTemplate?.structure || defaultStructure
  const compiled = Handlebars.compile(masterHtml)

  const finalHtml = compiled({
    // Branding values
    logoUrl: resolvedBranding.logo,
    accentStripColor: emailBranding.accentStripColor,
    accentStripHeight: getAccentStripHeight(emailBranding.accentStripHeight),
    headingColor: emailBranding.headingColor,
    // ... other branding values

    // Structure flags
    showLogo: structure.showLogo,
    showAccentStrip: structure.showAccentStrip,
    showEnglishSection: structure.showEnglishSection,
    showArabicSection: structure.showArabicSection,
    showDivider: structure.showDivider,
    showFooter: structure.showFooter,

    // Content
    emailSubject: enContent.subject,
    enContent: enHtml,
    arContent: arHtml,
    footerText: emailBranding.footerText || `© ${new Date().getFullYear()} ${event.name}`,
  })

  return {
    subject: enContent.subject,
    html: finalHtml,
    text: generatePlainText(enContent, arContent),
  }
}
```

### Update Email Job Rendering

**Update `lib/queue/email-job.ts`:**

```typescript
export function renderEmailTemplate(/* existing params */): RenderResult {
  // Check if template has structured content
  if (template.structuredContent) {
    return renderStructuredEmail({
      template,
      masterTemplate: template.masterTemplate,
      guest,
      event,
      workspaceBranding,
      eventBranding,
      documents,
    })
  }

  // Fall back to legacy HTML rendering
  // ... existing code ...
}
```

---

## 31C: API Layer (tRPC)

### Master Template Router

**Create `trpc/routers/email-master-templates.ts`:**

```typescript
export const emailMasterTemplatesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      eventId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  getOne: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  create: protectedProcedure
    .input(createMasterTemplateSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  update: protectedProcedure
    .input(updateMasterTemplateSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  setDefault: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      eventId: z.string().uuid().optional(),
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  getResolved: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Returns event-level if exists, else workspace default
    }),
})
```

### Hooks

**Create `trpc/hooks/master-template-hooks.ts`:**

Query hooks and mutation hooks for master templates.

### Update Email Templates Router

**Update `trpc/routers/email-templates.ts`:**

Add procedures for structured content:
- `createStructured` - Create with structured content
- `updateStructuredContent` - Update structured fields
- `previewRendered` - Full rendered preview with branding

### Update Branding Routes

**Update `trpc/routers/workspaces.ts`** and **`trpc/routers/events.ts`:**

Include `emailBranding` in `getBranding` and `updateBranding` procedures.

---

## 31D: UI Components

### Structured Content Editor

**Create `components/email-templates/structured-content-editor.tsx`:**

Form-based editor replacing raw HTML with:
- Subject field with variable inserter
- Greeting field (optional)
- Heading field (required)
- Subheading field (optional)
- Body paragraphs array (dynamic add/remove)
  - Variable inserter for each paragraph
  - **Document inserter** for each paragraph (links to event documents from Stage 14)
- CTA editor (text + URL)
- Post-CTA text (optional)

Document insertion uses the `DocumentInserter` component which allows:
- Selecting from event documents
- Custom display text for links
- URL-only insertion option
- Generates Handlebars syntax: `{{document.UUID}}` or `{{document.UUID|Custom Text}}`

### Master Template Editor

**Create `components/email-templates/master-template-editor.tsx`:**

- Structure toggles (checkboxes for show/hide sections)
- Language order selector
- Collapsible advanced HTML editor
- Live preview panel

### Master Template Preview

**Create `components/email-templates/master-template-preview.tsx`:**

- Light/dark mode toggle
- Sample content with branding applied
- Responsive preview

### Email Branding Settings

**Create `components/branding/email-branding-settings.tsx`:**

- Color pickers for email colors
- Font family selectors (EN/AR)
- Button style radio group
- Footer text input

### Update Template Form

**Update `components/email-templates/email-template-form.tsx`:**

- Toggle between "Structured content" and "Raw HTML" modes
- Master template selector dropdown
- Use `StructuredContentEditor` for new mode

---

## 31E: Pages & Integration

### Workspace Email Settings Page

Add email branding section to workspace branding settings.

### Event Email Branding

Add email branding section to event branding tab.

### Master Template Management

**Integrated in `components/workspace/workspace-branding-form.tsx`:**

Full management UI for workspace-level master templates:
- **Template list** showing all templates with name, description, and default badge
- **Actions dropdown** per template:
  - Edit (opens Sheet with `MasterTemplateEditor`)
  - Duplicate (creates copy)
  - Set as Default
  - Delete (with confirmation dialog)
- **Empty state** with options to seed default or create custom template
- **Add Template** button when templates exist

Uses hooks from `trpc/hooks/master-template-hooks.ts`:
- `useMasterTemplates()` - List templates
- `useCreateMasterTemplate()` - Create new
- `useUpdateMasterTemplate()` - Edit existing
- `useDeleteMasterTemplate()` - Delete with confirmation
- `useDuplicateMasterTemplate()` - Create copy
- `useSetDefaultMasterTemplate()` - Set as default
- `useSeedDefaultMasterTemplate()` - Create built-in default

---

## 31F: Migration & Seed Data

### Database Migration

```sql
-- Create master templates table
CREATE TABLE email_master_template (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES event(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL,
  structure JSONB,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX email_master_template_workspace_idx ON email_master_template(workspace_id);
CREATE INDEX email_master_template_event_idx ON email_master_template(event_id);

-- Add columns to email_template
ALTER TABLE email_template
ADD COLUMN structured_content JSONB,
ADD COLUMN master_template_id TEXT REFERENCES email_master_template(id) ON DELETE SET NULL;
```

### Seed Default Template

On workspace creation, optionally seed a default master template.

---

## Dependencies

```bash
pnpm add handlebars
```

---

## Verification Checklist

### 31A: Schema & Types
- [x] `EmailBrandingConfig` type added to workspace schema
- [x] `EmailBrandingConfig` type added to event schema
- [x] `emailMasterTemplates` table created
- [x] `structuredContent` and `masterTemplateId` columns added to email_template
- [x] Zod schemas created
- [x] Database migration runs successfully

### 31B: Branding & Rendering
- [x] `resolveEmailBranding()` function works with inheritance
- [x] Font stack helpers return correct values
- [x] Default master template HTML created
- [x] `renderStructuredEmail()` assembles emails correctly
- [x] Legacy `renderEmailTemplate()` still works

### 31C: API Layer
- [x] Master template CRUD endpoints work
- [x] `getResolved` returns correct template with inheritance
- [x] Email template endpoints support structured content
- [x] Branding endpoints include email branding

### 31D: UI Components
- [x] Structured content editor works
- [x] Variable insertion works in all fields
- [x] Document insertion works in body paragraphs
- [x] Master template editor shows live preview
- [x] Email branding settings save correctly
- [x] Template form toggle between modes works

### 31E: Integration
- [x] Email branding visible in workspace settings
- [x] Master template management UI in workspace branding
- [ ] Email branding visible in event settings (future enhancement)
- [x] Rendered emails show correct branding

### 31F: Migration
- [x] Migration runs without errors
- [x] Existing templates continue to work
- [x] New templates can use structured content
- [x] Default master template seeded on workspace creation

---

## File Structure Summary

**New files to create:**

```
server/db/schemas/
└── email-master-template.ts

lib/email/
├── master-templates/
│   └── default.ts
└── render-structured.ts

trpc/routers/
└── email-master-templates.ts

trpc/hooks/
└── master-template-hooks.ts

components/email-templates/
├── structured-content-editor.tsx
├── master-template-editor.tsx
└── master-template-preview.tsx

components/branding/
└── email-branding-settings.tsx
```

**Files to modify:**

```
server/db/schemas/workspace.ts          # Add EmailBrandingConfig
server/db/schemas/event.ts              # Add EmailBrandingConfig
server/db/schemas/email-template.ts     # Add structured content columns
server/db/schemas/index.ts              # Export new schema
lib/branding/utils.ts                   # Add resolveEmailBranding
lib/queue/email-job.ts                  # Support structured rendering
lib/schemas.ts                          # Add Zod schemas
trpc/routers/index.ts                   # Add master template router
trpc/routers/email-templates.ts         # Add structured endpoints
trpc/routers/workspaces.ts              # Include email branding
trpc/routers/events.ts                  # Include email branding
components/email-templates/email-template-form.tsx  # Add structured mode
messages/en.json                        # Add translations
messages/ar.json                        # Add Arabic translations
```

---

## Related Documents

- [Stage 6: Email Template Builder](./06-email-template-builder.md)
- [Stage 9: Branding System](./09-branding-system.md)
- [Stage 14: Document Management](./14-document-management.md) - Document insertion in structured emails
- Reference: `docs/email-sample.html`
