# Stage 9: Branding System for Workspaces & Events

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: ✅ Complete

## Objective

Implement a comprehensive branding system that allows organizations to customize their workspace appearance and event RSVP pages. Workspaces define default brand settings (logo, colors), and events inherit these defaults but can override with custom branding.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workspace UI Theming | Full dashboard theme | Brand colors applied to sidebar, buttons, links, accents |
| Event Inheritance | Inherit with override | Events use workspace defaults, can override individual fields |
| Dark Mode Support | Full support | Separate logo and color variants for light/dark modes |
| Color Picker | Custom with presets | Preset swatches, recent colors, hex input for polished UX |
| Schema Pattern | JSON column | Consistent with existing event.branding pattern |
| CSS Strategy | CSS Variables | Runtime theming without rebuild, SSR-compatible |

---

## Implementation Stages

Work is organized into 6 sub-phases for incremental delivery:

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 9A | Database Schema & Validation | ~4 files | ✅ Complete |
| 9B | tRPC Routers & Hooks | ~4 files | ✅ Complete |
| 9C | CSS Variables & Theming | ~3 files | ✅ Complete |
| 9D | UI Components (Color Picker, Preview) | ~5 files | ✅ Complete |
| 9E | Settings Pages & Forms | ~6 files | ✅ Complete |
| 9F | RSVP Integration & i18n | ~4 files | ✅ Complete |

---

## 9A: Database Schema & Validation

### Schema Changes

**Update `server/db/schemas/workspace.ts`:**

```typescript
// Add type definition
export type WorkspaceBranding = {
  logo?: string           // Light mode logo URL
  logoDark?: string       // Dark mode logo URL
  primaryColor?: string   // Primary brand color (hex)
  accentColor?: string    // Accent color (hex)
  primaryColorDark?: string   // Dark mode primary
  accentColorDark?: string    // Dark mode accent
}

// Add to workspaces table definition
branding: json("branding").$type<WorkspaceBranding>(),
```

**Update `server/db/schemas/event.ts`:**

Extend existing branding type with dark mode variants:

```typescript
export type EventBranding = {
  logo?: string
  logoDark?: string
  primaryColor?: string
  secondaryColor?: string
  primaryColorDark?: string
  secondaryColorDark?: string
  backgroundImage?: string
}
```

### Validation Schemas

**Update `lib/schemas.ts`:**

```typescript
// Hex color validation
const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
  .optional()

// Base branding schema
export const brandingSchema = z.object({
  logo: s3ImageSchema.optional(),
  logoDark: s3ImageSchema.optional(),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  primaryColorDark: hexColorSchema,
  accentColorDark: hexColorSchema,
})

// Workspace branding
export const workspaceBrandingSchema = brandingSchema

// Event branding (extends base with background)
export const eventBrandingSchema = brandingSchema.extend({
  secondaryColor: hexColorSchema,
  secondaryColorDark: hexColorSchema,
  backgroundImage: s3ImageSchema.optional(),
})

// Update schemas
export const updateWorkspaceBrandingSchema = z.object({
  workspaceId: z.string().uuid(),
  branding: workspaceBrandingSchema,
})

export const updateEventBrandingSchema = z.object({
  eventId: z.string().uuid(),
  branding: eventBrandingSchema.nullable(), // null = reset to workspace defaults
})
```

### Files to Create/Modify

```
lib/branding/
├── types.ts                    # TypeScript types for branding
└── utils.ts                    # Color conversion, inheritance resolution

server/db/schemas/
├── workspace.ts                # Add branding column (modify)
└── event.ts                    # Extend branding type (modify)

lib/
└── schemas.ts                  # Add branding Zod schemas (modify)
```

---

## 9B: tRPC Routers & Hooks

### Branding Utility Functions

**Create `lib/branding/utils.ts`:**

```typescript
import type { WorkspaceBranding, EventBranding } from "@/server/db/schemas"

export type ResolvedBranding = {
  logo: string | null
  logoDark: string | null
  primaryColor: string | null
  accentColor: string | null
  primaryColorDark: string | null
  accentColorDark: string | null
  secondaryColor: string | null
  secondaryColorDark: string | null
  backgroundImage: string | null
  _source: Record<string, "workspace" | "event">
}

/**
 * Convert hex color to HSL string for CSS variables
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Resolve branding with inheritance (event overrides workspace)
 */
export function resolveBranding(
  workspaceBranding: WorkspaceBranding | null | undefined,
  eventBranding: EventBranding | null | undefined
): ResolvedBranding {
  const ws = workspaceBranding ?? {}
  const ev = eventBranding ?? {}

  const resolve = <T>(field: string): T | null => {
    return (ev as any)[field] ?? (ws as any)[field] ?? null
  }

  const source = (field: string): "workspace" | "event" => {
    return (ev as any)[field] ? "event" : "workspace"
  }

  return {
    logo: resolve("logo"),
    logoDark: resolve("logoDark"),
    primaryColor: resolve("primaryColor"),
    accentColor: resolve("accentColor"),
    primaryColorDark: resolve("primaryColorDark"),
    accentColorDark: resolve("accentColorDark"),
    secondaryColor: resolve("secondaryColor"),
    secondaryColorDark: resolve("secondaryColorDark"),
    backgroundImage: ev.backgroundImage ?? null,
    _source: {
      logo: source("logo"),
      logoDark: source("logoDark"),
      primaryColor: source("primaryColor"),
      accentColor: source("accentColor"),
      primaryColorDark: source("primaryColorDark"),
      accentColorDark: source("accentColorDark"),
      secondaryColor: source("secondaryColor"),
      secondaryColorDark: source("secondaryColorDark"),
      backgroundImage: "event",
    },
  }
}

/**
 * Generate CSS variables object from branding
 */
export function generateCSSVariables(
  branding: ResolvedBranding
): Record<string, string> {
  const vars: Record<string, string> = {}

  if (branding.primaryColor) {
    vars['--brand-primary'] = hexToHsl(branding.primaryColor)
  }
  if (branding.accentColor) {
    vars['--brand-accent'] = hexToHsl(branding.accentColor)
  }
  if (branding.primaryColorDark) {
    vars['--brand-primary-dark'] = hexToHsl(branding.primaryColorDark)
  }
  if (branding.accentColorDark) {
    vars['--brand-accent-dark'] = hexToHsl(branding.accentColorDark)
  }

  return vars
}

/**
 * Get appropriate logo for current theme
 */
export function getLogoForTheme(
  branding: ResolvedBranding,
  isDarkMode: boolean
): string | null {
  if (isDarkMode && branding.logoDark) {
    return branding.logoDark
  }
  return branding.logo
}
```

### tRPC Router Updates

**Update `trpc/routers/workspaces.ts`:**

```typescript
// Add to workspacesRouter

getBranding: protectedProcedure
  .input(z.object({ workspaceId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, input.workspaceId),
      columns: { id: true, branding: true, logo: true },
    })

    if (!workspace) {
      throw new TRPCError({ code: "NOT_FOUND" })
    }

    // Check membership
    await requireWorkspaceMember(ctx.user.id, workspace.id)

    return {
      branding: {
        ...workspace.branding,
        logo: workspace.branding?.logo ?? workspace.logo ?? null,
      },
    }
  }),

updateBranding: protectedProcedure
  .input(updateWorkspaceBrandingSchema)
  .mutation(async ({ ctx, input }) => {
    const { workspaceId, branding } = input

    await requireWorkspacePermission(
      ctx.user.id,
      workspaceId,
      PERMISSIONS.MANAGE_WORKSPACE
    )

    const [updated] = await db
      .update(workspaces)
      .set({
        branding,
        logo: branding.logo ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning()

    return { message: "Branding updated", branding: updated.branding }
  }),
```

**Update `trpc/routers/events.ts`:**

```typescript
// Add to eventsRouter

getBranding: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const event = await db.query.events.findFirst({
      where: eq(events.id, input.eventId),
      with: {
        workspace: {
          columns: { id: true, branding: true, logo: true },
        },
      },
    })

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" })
    }

    await requireWorkspaceMember(ctx.user.id, event.workspaceId)

    const workspaceBranding = {
      ...event.workspace.branding,
      logo: event.workspace.branding?.logo ?? event.workspace.logo,
    }

    return {
      eventBranding: event.branding,
      workspaceBranding,
      resolved: resolveBranding(workspaceBranding, event.branding),
    }
  }),

updateBranding: protectedProcedure
  .input(updateEventBrandingSchema)
  .mutation(async ({ ctx, input }) => {
    const { eventId, branding } = input

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    })

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" })
    }

    await requireWorkspacePermission(
      ctx.user.id,
      event.workspaceId,
      PERMISSIONS.MANAGE_EVENT
    )

    const [updated] = await db
      .update(events)
      .set({ branding, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning()

    return {
      message: branding === null
        ? "Branding reset to workspace defaults"
        : "Branding updated",
      branding: updated.branding,
    }
  }),
```

### Hooks

**Update `trpc/hooks/workspaces-hooks.ts`:**

```typescript
export const useWorkspaceBranding = (workspaceId: string) => {
  return trpc.workspaces.getBranding.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  )
}

export const useUpdateWorkspaceBranding = (options?: {
  onSuccess?: () => void
}) => {
  const utils = trpc.useUtils()

  return trpc.workspaces.updateBranding.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.workspaces.getBranding.invalidate()
      utils.workspaces.getOne.invalidate()
      options?.onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
  })
}
```

**Update `trpc/hooks/events-hooks.ts`:**

```typescript
export const useEventBranding = (eventId: string) => {
  return trpc.events.getBranding.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

export const useUpdateEventBranding = (options?: {
  onSuccess?: () => void
}) => {
  const utils = trpc.useUtils()

  return trpc.events.updateBranding.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.events.getBranding.invalidate()
      utils.events.getOne.invalidate()
      options?.onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
  })
}
```

### Files to Create/Modify

```
lib/branding/
└── utils.ts                    # Create: utilities

trpc/routers/
├── workspaces.ts               # Modify: add getBranding, updateBranding
└── events.ts                   # Modify: add getBranding, updateBranding

trpc/hooks/
├── workspaces-hooks.ts         # Modify: add branding hooks
└── events-hooks.ts             # Modify: add branding hooks
```

---

## 9C: CSS Variables & Theming

### CSS Variable Layer

**Update `styles/globals.css`:**

Add brand variable fallbacks to the `@theme inline` block:

```css
@theme inline {
  /* Brand-aware colors - fall back to defaults if not set */
  --color-primary: hsl(var(--brand-primary, var(--primary)));
  --color-accent: hsl(var(--brand-accent, var(--accent)));

  /* Sidebar brand colors */
  --color-sidebar-primary: hsl(var(--brand-sidebar-primary, var(--sidebar-primary)));
  --color-sidebar-accent: hsl(var(--brand-sidebar-accent, var(--sidebar-accent)));
}

/* Dark mode brand variable switching */
.dark {
  --brand-primary: var(--brand-primary-dark, var(--brand-primary));
  --brand-accent: var(--brand-accent-dark, var(--brand-accent));
}
```

### Branding Provider

**Create `components/providers/branding-provider.tsx`:**

```typescript
"use client"

import { createContext, useContext, useMemo } from "react"
import { useTheme } from "next-themes"
import type { ResolvedBranding } from "@/lib/branding/utils"
import { generateCSSVariables, getLogoForTheme } from "@/lib/branding/utils"

interface BrandingContextValue {
  branding: ResolvedBranding
  currentLogo: string | null
  isDark: boolean
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

interface BrandingProviderProps {
  branding: ResolvedBranding
  children: React.ReactNode
}

export function BrandingProvider({ branding, children }: BrandingProviderProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const cssVariables = useMemo(
    () => generateCSSVariables(branding),
    [branding]
  )

  const value = useMemo(
    () => ({
      branding,
      currentLogo: getLogoForTheme(branding, isDark),
      isDark,
    }),
    [branding, isDark]
  )

  return (
    <BrandingContext.Provider value={value}>
      <div style={cssVariables as React.CSSProperties}>
        {children}
      </div>
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider")
  }
  return context
}
```

### Dashboard Layout Integration

**Update `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/layout.tsx`:**

```typescript
// Add workspace branding fetch and wrap children
import { BrandingProvider } from "@/components/providers/branding-provider"
import { resolveBranding } from "@/lib/branding/utils"

// In the layout component:
const workspace = await trpc.workspaces.getOne({ slug })

const resolvedBranding = resolveBranding(workspace.branding, null)

return (
  <BrandingProvider branding={resolvedBranding}>
    {/* existing layout content */}
  </BrandingProvider>
)
```

### Files to Create/Modify

```
styles/
└── globals.css                           # Modify: add brand CSS variables

components/providers/
└── branding-provider.tsx                 # Create: context provider

app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/
└── layout.tsx                            # Modify: integrate branding
```

---

## 9D: UI Components

### Color Picker

**Create `components/branding/color-picker.tsx`:**

```typescript
"use client"

import { useState, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Preset brand colors
const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#2563EB", // Blue
  "#0891B2", // Cyan
  "#059669", // Emerald
  "#CA8A04", // Yellow
  "#EA580C", // Orange
  "#DC2626", // Red
  "#9333EA", // Purple
  "#64748B", // Slate
  "#000000", // Black
]

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  showInheritOption?: boolean
  inheritedValue?: string
  onInheritToggle?: (inherit: boolean) => void
}

export function ColorPicker({
  value,
  onChange,
  label,
  disabled,
  showInheritOption,
  inheritedValue,
  onInheritToggle,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value || "")

  const handleColorSelect = useCallback((color: string) => {
    onChange(color)
    setHexInput(color)
  }, [onChange])

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    setHexInput(hex)
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      onChange(hex)
    }
  }, [onChange])

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start gap-2"
          >
            <div
              className="h-4 w-4 rounded border"
              style={{ backgroundColor: value || "#FFFFFF" }}
            />
            <span className="font-mono text-sm">
              {value || "Select color"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          {/* Preset swatches */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 w-8 rounded border-2 transition-all",
                    value === color ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>

          {/* Hex input */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hex Value</Label>
            <div className="flex gap-2">
              <Input
                value={hexInput}
                onChange={handleHexChange}
                placeholder="#000000"
                className="font-mono"
              />
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border"
              />
            </div>
          </div>

          {/* Inherit option for events */}
          {showInheritOption && inheritedValue && (
            <div className="mt-3 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onInheritToggle?.(true)}
              >
                Reset to workspace default
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

### Logo Upload Group

**Create `components/branding/logo-upload-group.tsx`:**

```typescript
"use client"

import { ImageUpload } from "@/components/global/image-upload"
import { Label } from "@/components/ui/label"

interface LogoUploadGroupProps {
  logo?: string
  logoDark?: string
  onLogoChange: (url: string) => void
  onLogoDarkChange: (url: string) => void
  workspaceId: string
  disabled?: boolean
}

export function LogoUploadGroup({
  logo,
  logoDark,
  onLogoChange,
  onLogoDarkChange,
  workspaceId,
  disabled,
}: LogoUploadGroupProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Light mode logo */}
      <div className="space-y-2">
        <Label>Logo (Light Mode)</Label>
        <div className="rounded-lg border bg-white p-4">
          <ImageUpload
            type="logo"
            image={logo}
            disabled={disabled}
            // Pass appropriate props for S3 upload
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Displayed on light backgrounds
        </p>
      </div>

      {/* Dark mode logo */}
      <div className="space-y-2">
        <Label>Logo (Dark Mode)</Label>
        <div className="rounded-lg border bg-gray-900 p-4">
          <ImageUpload
            type="logo"
            image={logoDark}
            disabled={disabled}
            // Pass appropriate props for S3 upload
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Displayed on dark backgrounds (optional)
        </p>
      </div>
    </div>
  )
}
```

### Branding Preview

**Create `components/branding/branding-preview.tsx`:**

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrandingPreviewProps {
  logo?: string
  logoDark?: string
  primaryColor?: string
  accentColor?: string
  className?: string
}

export function BrandingPreview({
  logo,
  logoDark,
  primaryColor = "#4F46E5",
  accentColor = "#0EA5E9",
  className,
}: BrandingPreviewProps) {
  const [isDark, setIsDark] = useState(false)

  const displayLogo = isDark ? (logoDark || logo) : logo

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Preview</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <CardContent
        className={cn("p-6 transition-colors", isDark ? "bg-gray-900" : "bg-white")}
      >
        {/* Mini RSVP mockup */}
        <div className="space-y-4">
          {/* Logo */}
          {displayLogo ? (
            <img
              src={displayLogo}
              alt="Logo preview"
              className="h-10 w-auto"
            />
          ) : (
            <div className="h-10 w-24 rounded bg-gray-200" />
          )}

          {/* Mock content */}
          <div className="space-y-2">
            <div
              className={cn(
                "h-6 w-3/4 rounded",
                isDark ? "bg-gray-700" : "bg-gray-100"
              )}
            />
            <div
              className={cn(
                "h-4 w-1/2 rounded",
                isDark ? "bg-gray-700" : "bg-gray-100"
              )}
            />
          </div>

          {/* Primary button */}
          <button
            className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Primary Button
          </button>

          {/* Accent link */}
          <p className="text-sm">
            <span className={isDark ? "text-gray-300" : "text-gray-600"}>
              Need help?{" "}
            </span>
            <a
              className="underline"
              style={{ color: accentColor }}
            >
              Contact us
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Inheritance Indicator

**Create `components/branding/inheritance-indicator.tsx`:**

```typescript
import { Badge } from "@/components/ui/badge"
import { Building2, Pencil } from "lucide-react"

interface InheritanceIndicatorProps {
  isInherited: boolean
  workspaceName?: string
}

export function InheritanceIndicator({
  isInherited,
  workspaceName,
}: InheritanceIndicatorProps) {
  if (isInherited) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Building2 className="h-3 w-3" />
        Inherited{workspaceName ? ` from ${workspaceName}` : ""}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Pencil className="h-3 w-3" />
      Custom
    </Badge>
  )
}
```

### Files to Create

```
components/branding/
├── color-picker.tsx              # Color picker with presets
├── logo-upload-group.tsx         # Light/dark logo uploads
├── branding-preview.tsx          # Live preview component
└── inheritance-indicator.tsx     # Inherited/custom badge
```

---

## 9E: Settings Pages & Forms

### Route Configuration

**Update `lib/routes.ts`:**

```typescript
// Add to RouteName type
| "settings-branding"

// Add to ROUTES object
"settings-branding": {
  name: "settings-branding",
  path: "/:slug/settings/branding",
  metadata: {
    title: documentTitle("Branding"),
    description: "Customize your workspace branding",
  },
},

// Add to RouteParams
"settings-branding": { slug: string }
```

### Settings Navigation

**Update `app/[locale]/(web)/(dashboard)/[slug]/settings/layout.tsx`:**

Add branding to `workspaceSettingsRoutes` after `settings-workspace`:

```typescript
const workspaceSettingsRoutes = [
  "settings-workspace",
  "settings-branding",  // Add this
  "settings-members",
]
```

### Workspace Branding Page

**Create `app/[locale]/(web)/(dashboard)/[slug]/settings/branding/page.tsx`:**

```typescript
import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { WorkspaceBrandingForm } from "@/components/forms/workspace-branding-form"

export const metadata: Metadata = ROUTES["settings-branding"].metadata
export const dynamic = "force-dynamic"

type BrandingPageProps = {
  params: Promise<{ slug: string }>
}

export default async function BrandingPage({ params }: BrandingPageProps) {
  const { slug } = await params
  const workspace = await trpc.workspaces.getOne({ slug })
  void trpc.workspaces.getBranding.prefetch({ workspaceId: workspace.id })

  return (
    <HydrateClient>
      <SettingsWrapper
        title="Branding"
        description="Customize the look and feel of your workspace and events"
      >
        <WorkspaceBrandingForm
          workspaceId={workspace.id}
          isOwner={workspace.isOwner}
        />
      </SettingsWrapper>
    </HydrateClient>
  )
}
```

### Workspace Branding Form

**Create `components/forms/workspace-branding-form.tsx`:**

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import { ColorPicker } from "@/components/branding/color-picker"
import { LogoUploadGroup } from "@/components/branding/logo-upload-group"
import { BrandingPreview } from "@/components/branding/branding-preview"
import { Button } from "@/components/ui/button"
import { useWorkspaceBranding, useUpdateWorkspaceBranding } from "@/trpc/hooks/workspaces-hooks"
import { workspaceBrandingSchema, type WorkspaceBrandingInput } from "@/lib/schemas"

interface WorkspaceBrandingFormProps {
  workspaceId: string
  isOwner: boolean
}

export function WorkspaceBrandingForm({ workspaceId, isOwner }: WorkspaceBrandingFormProps) {
  const { data } = useWorkspaceBranding(workspaceId)
  const { mutate, isPending } = useUpdateWorkspaceBranding()

  const form = useForm<WorkspaceBrandingInput>({
    resolver: zodResolver(workspaceBrandingSchema),
    values: data?.branding ?? {},
  })

  const onSubmit = (values: WorkspaceBrandingInput) => {
    mutate({ workspaceId, branding: values })
  }

  const watchedValues = form.watch()

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logos */}
          <SettingsWrapperCard>
            <LogoUploadGroup
              logo={watchedValues.logo}
              logoDark={watchedValues.logoDark}
              onLogoChange={(url) => form.setValue("logo", url)}
              onLogoDarkChange={(url) => form.setValue("logoDark", url)}
              workspaceId={workspaceId}
              disabled={!isOwner}
            />
          </SettingsWrapperCard>

          {/* Colors */}
          <SettingsWrapperCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <ColorPicker
                      label="Primary Color"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!isOwner}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <ColorPicker
                      label="Accent Color"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!isOwner}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dark mode colors */}
            <div className="mt-4 border-t pt-4">
              <p className="mb-3 text-sm font-medium">Dark Mode Colors (Optional)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryColorDark"
                  render={({ field }) => (
                    <FormItem>
                      <ColorPicker
                        label="Primary (Dark)"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!isOwner}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accentColorDark"
                  render={({ field }) => (
                    <FormItem>
                      <ColorPicker
                        label="Accent (Dark)"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!isOwner}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </SettingsWrapperCard>

          {isOwner && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </form>
      </Form>

      {/* Preview */}
      <div className="lg:sticky lg:top-4">
        <BrandingPreview
          logo={watchedValues.logo}
          logoDark={watchedValues.logoDark}
          primaryColor={watchedValues.primaryColor}
          accentColor={watchedValues.accentColor}
        />
      </div>
    </div>
  )
}
```

### Event Branding Tab

**Create `components/events/event-branding-tab.tsx`:**

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "@/components/branding/color-picker"
import { LogoUploadGroup } from "@/components/branding/logo-upload-group"
import { BrandingPreview } from "@/components/branding/branding-preview"
import { InheritanceIndicator } from "@/components/branding/inheritance-indicator"
import { Button } from "@/components/ui/button"
import { useEventBranding, useUpdateEventBranding } from "@/trpc/hooks/events-hooks"
import { eventBrandingSchema, type EventBrandingInput } from "@/lib/schemas"

interface EventBrandingTabProps {
  eventId: string
  workspaceId: string
  workspaceName: string
}

export function EventBrandingTab({
  eventId,
  workspaceId,
  workspaceName,
}: EventBrandingTabProps) {
  const { data } = useEventBranding(eventId)
  const { mutate, isPending } = useUpdateEventBranding()

  const form = useForm<EventBrandingInput>({
    resolver: zodResolver(eventBrandingSchema),
    values: data?.eventBranding ?? {},
  })

  const hasCustomBranding = !!data?.eventBranding

  const onSubmit = (values: EventBrandingInput) => {
    mutate({ eventId, branding: values })
  }

  const resetToWorkspace = () => {
    mutate({ eventId, branding: null })
  }

  const watchedValues = form.watch()
  const resolved = data?.resolved

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
      <div className="space-y-6">
        {/* Inheritance toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Use workspace branding</Label>
            <p className="text-sm text-muted-foreground">
              Inherit logo and colors from workspace settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InheritanceIndicator
              isInherited={!hasCustomBranding}
              workspaceName={workspaceName}
            />
            <Switch
              checked={!hasCustomBranding}
              onCheckedChange={(checked) => {
                if (checked) resetToWorkspace()
              }}
            />
          </div>
        </div>

        {/* Custom branding form */}
        {hasCustomBranding && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <LogoUploadGroup
                logo={watchedValues.logo}
                logoDark={watchedValues.logoDark}
                onLogoChange={(url) => form.setValue("logo", url)}
                onLogoDarkChange={(url) => form.setValue("logoDark", url)}
                workspaceId={workspaceId}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <ColorPicker
                        label="Primary Color"
                        value={field.value}
                        onChange={field.onChange}
                        showInheritOption
                        inheritedValue={data?.workspaceBranding?.primaryColor}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <ColorPicker
                        label="Secondary Color"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        )}

        {/* Show inherited values when using workspace branding */}
        {!hasCustomBranding && resolved && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-3 text-sm font-medium">Inherited from workspace:</p>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Primary:</span>
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: resolved.primaryColor || undefined }}
                />
                <span className="font-mono">{resolved.primaryColor || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Accent:</span>
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: resolved.accentColor || undefined }}
                />
                <span className="font-mono">{resolved.accentColor || "Not set"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => mutate({ eventId, branding: {} })}
            >
              Customize for this event
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-4">
        <BrandingPreview
          logo={resolved?.logo ?? undefined}
          logoDark={resolved?.logoDark ?? undefined}
          primaryColor={resolved?.primaryColor ?? undefined}
          accentColor={resolved?.accentColor ?? undefined}
        />
      </div>
    </div>
  )
}
```

### Update Event Tabs

**Update `components/events/event-tabs.tsx`:**

Add "Branding" tab:

```typescript
// Add to tabs array
{ id: "branding", label: "Branding", icon: Palette },

// Add tab content in switch/render
case "branding":
  return (
    <EventBrandingTab
      eventId={event.id}
      workspaceId={event.workspaceId}
      workspaceName={workspaceName}
    />
  )
```

### Files to Create/Modify

```
lib/
└── routes.ts                               # Modify: add settings-branding route

app/[locale]/(web)/(dashboard)/[slug]/settings/
├── layout.tsx                              # Modify: add to navigation
└── branding/
    └── page.tsx                            # Create: branding settings page

components/forms/
├── workspace-branding-form.tsx             # Create: workspace form
└── event-branding-form.tsx                 # Create: event form (if separate)

components/events/
├── event-tabs.tsx                          # Modify: add Branding tab
└── event-branding-tab.tsx                  # Create: tab content
```

---

## 9F: RSVP Integration & i18n

### Update RSVP API

**Update `app/api/rsvp/[token]/route.ts`:**

```typescript
import { resolveBranding } from "@/lib/branding/utils"

// In the GET handler, update the return:
const workspaceBranding = {
  ...guest.event.workspace.branding,
  logo: guest.event.workspace.branding?.logo ?? guest.event.workspace.logo,
}

return NextResponse.json({
  guest: { /* ... */ },
  event: {
    id: guest.event.id,
    name: guest.event.name,
    // ... other fields ...
    branding: resolveBranding(workspaceBranding, guest.event.branding),
  },
  category: { /* ... */ },
})
```

### Update RSVP Page Component

**Update `components/rsvp/rsvp-page.tsx`:**

```typescript
import { generateCSSVariables, getLogoForTheme } from "@/lib/branding/utils"
import { useTheme } from "next-themes"

// In component:
const { resolvedTheme } = useTheme()
const isDark = resolvedTheme === "dark"
const currentLogo = getLogoForTheme(event.branding, isDark)
const cssVars = generateCSSVariables(event.branding)

// Apply CSS variables to wrapper:
<div style={cssVars as React.CSSProperties}>
  {/* RSVP content */}
</div>

// Use currentLogo for display:
{currentLogo && <img src={currentLogo} alt={event.name} />}

// Use CSS variables for colors:
<button className="bg-[hsl(var(--brand-primary))]">
  Submit RSVP
</button>
```

### i18n Translations

**Update `messages/en.json`:**

```json
{
  "branding": {
    "title": "Branding",
    "description": "Customize the look and feel of your workspace",
    "logo": "Logo",
    "logoDark": "Logo (Dark Mode)",
    "logoLightHelp": "Displayed on light backgrounds",
    "logoDarkHelp": "Displayed on dark backgrounds (optional)",
    "primaryColor": "Primary Color",
    "accentColor": "Accent Color",
    "secondaryColor": "Secondary Color",
    "darkModeColors": "Dark Mode Colors",
    "darkModeColorsHelp": "Optional - uses light mode colors if not set",
    "preview": "Preview",
    "inherited": "Inherited",
    "inheritedFrom": "Inherited from {workspace}",
    "custom": "Custom",
    "useWorkspaceBranding": "Use workspace branding",
    "useWorkspaceBrandingHelp": "Inherit logo and colors from workspace settings",
    "customizeForEvent": "Customize for this event",
    "resetToDefault": "Reset to workspace default",
    "saveChanges": "Save Changes",
    "saving": "Saving..."
  }
}
```

**Update `messages/ar.json`:**

```json
{
  "branding": {
    "title": "العلامة التجارية",
    "description": "تخصيص مظهر مساحة العمل الخاصة بك",
    "logo": "الشعار",
    "logoDark": "الشعار (الوضع الداكن)",
    "logoLightHelp": "يظهر على الخلفيات الفاتحة",
    "logoDarkHelp": "يظهر على الخلفيات الداكنة (اختياري)",
    "primaryColor": "اللون الأساسي",
    "accentColor": "لون التمييز",
    "secondaryColor": "اللون الثانوي",
    "darkModeColors": "ألوان الوضع الداكن",
    "darkModeColorsHelp": "اختياري - يستخدم ألوان الوضع الفاتح إذا لم يتم تعيينها",
    "preview": "معاينة",
    "inherited": "موروث",
    "inheritedFrom": "موروث من {workspace}",
    "custom": "مخصص",
    "useWorkspaceBranding": "استخدام علامة مساحة العمل",
    "useWorkspaceBrandingHelp": "وراثة الشعار والألوان من إعدادات مساحة العمل",
    "customizeForEvent": "تخصيص لهذا الحدث",
    "resetToDefault": "إعادة التعيين إلى الافتراضي",
    "saveChanges": "حفظ التغييرات",
    "saving": "جاري الحفظ..."
  }
}
```

### Files to Modify

```
app/api/rsvp/[token]/
└── route.ts                      # Modify: return resolved branding

components/rsvp/
└── rsvp-page.tsx                 # Modify: apply branding styles

messages/
├── en.json                       # Modify: add branding translations
└── ar.json                       # Modify: add Arabic translations
```

---

## Verification Checklist

After completing Stage 9:

### 9A: Schema & Validation ✅
- [x] Workspace schema has branding JSON column (`server/db/schemas/workspace.ts`)
- [x] Event branding type includes dark mode variants (`server/db/schemas/event.ts`)
- [x] Zod schemas validate hex colors and image URLs (`lib/schemas.ts`)
- [x] Database migration runs successfully

### 9B: API Layer ✅
- [x] `workspaces.getBranding` returns branding data (uses slug parameter)
- [x] `workspaces.updateBranding` saves branding
- [x] `events.getBranding` returns resolved branding with inheritance
- [x] `events.updateBranding` can set custom or reset to workspace (null = reset)
- [x] Hooks work correctly with cache invalidation (`trpc/hooks/workspaces-hooks.ts`, `trpc/hooks/events-hooks.ts`)

### 9C: CSS Variables ✅
- [x] Brand CSS variables defined in globals.css
- [x] BrandingProvider injects CSS variables (`components/providers/branding-provider.tsx`)
- [x] Dark mode switches to dark color variants via fallback chain

### 9D: UI Components ✅
- [x] Color picker shows presets and hex input (`components/branding/color-picker.tsx`)
- [x] Color picker works with native picker
- [x] Logo upload group shows light/dark previews (`components/branding/logo-upload-group.tsx`)
- [x] Branding preview updates in real-time (`components/branding/branding-preview.tsx`)
- [x] Preview theme toggle works
- [x] Inheritance indicator badge (`components/branding/inheritance-indicator.tsx`)

### 9E: Settings Pages ✅
- [x] Workspace branding page accessible at `/:slug/settings/branding`
- [x] Branding appears in settings sidebar navigation
- [x] Workspace form saves logo and colors (`components/workspace/workspace-branding-form.tsx`)
- [x] Event branding tab shows in event detail (`components/events/event-branding-tab.tsx`)
- [x] Inheritance display with "Reset to Workspace" button
- [x] Live preview alongside form

### 9F: RSVP & i18n ✅
- [x] RSVP API returns `resolvedBranding` with inheritance (`app/api/rsvp/[token]/route.ts`)
- [x] RSVP page displays correct logo from resolved branding
- [x] RSVP buttons use brand primary color
- [x] Background uses brand accent color
- [x] English translations complete (`messages/en.json`)
- [x] Arabic translations complete (`messages/ar.json`)

---

## Dependencies

No new npm packages required. Uses existing:
- `react-hook-form` + `zod` - Forms
- `next-themes` - Dark mode detection
- Existing Shadcn components (Popover, Switch, etc.)

---

## Related Documents

- [Stage 5: Admin Dashboard](./05-admin-dashboard.md) - Event tabs pattern
- [Stage 4: tRPC Routers & RSVP](./04-routers-rsvp.md) - Router patterns

---

## Implementation Summary

### Files Created

```
lib/branding/
├── index.ts                    # Re-exports
└── utils.ts                    # hexToHsl, resolveBranding, generateCSSVariables, getLogoForTheme

components/branding/
├── index.ts                    # Re-exports
├── color-picker.tsx            # Custom color picker with presets
├── logo-upload-group.tsx       # Light/dark logo uploads using S3
├── branding-preview.tsx        # Live RSVP mockup preview
└── inheritance-indicator.tsx   # Badge showing inherited/custom status

components/workspace/
├── workspace-branding-client.tsx   # Client wrapper with Suspense
└── workspace-branding-form.tsx     # Workspace branding form

components/events/
└── event-branding-tab.tsx      # Event branding tab with inheritance

components/providers/
└── branding-provider.tsx       # Context provider for CSS variable injection

hooks/
└── use-branding.ts             # Re-export of useBranding hook

app/[locale]/(web)/(dashboard)/[slug]/settings/branding/
└── page.tsx                    # Workspace branding settings page
```

### Files Modified

```
server/db/schemas/workspace.ts  # Added WorkspaceBranding type and branding column
server/db/schemas/event.ts      # Extended EventBranding with dark mode variants
lib/schemas.ts                  # Added branding Zod validation schemas
lib/routes.ts                   # Added settings-branding route
styles/globals.css              # Added brand CSS variables
trpc/routers/workspaces.ts      # Added getBranding, updateBranding procedures
trpc/routers/events.ts          # Added getBranding, updateBranding procedures
trpc/hooks/workspaces-hooks.ts  # Added useWorkspaceBranding, useUpdateWorkspaceBranding
trpc/hooks/events-hooks.ts      # Added useEventBranding, useUpdateEventBranding
app/api/rsvp/[token]/route.ts   # Added resolvedBranding to response
components/rsvp/rsvp-page.tsx   # Updated to use resolved branding
components/events/event-tabs.tsx # Added Branding tab
app/[locale]/(web)/(dashboard)/[slug]/settings/layout.tsx # Added branding to navigation
messages/en.json                # Added branding translations
messages/ar.json                # Added Arabic branding translations
```
