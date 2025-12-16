# Stage 26: Event Dashboard

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Transform the event overview page from a simple information display into a comprehensive dashboard with:
1. **Stat Tiles**: Key metrics at-a-glance (total invited, response rate, attended, countdown)
2. **Visual Charts**: Stacked bar chart showing guest breakdown by category and RSVP status
3. **Location Preview**: Map placeholder ready for Google Maps integration (Stage 15)
4. **Dashboard Layout**: Reorganized layout with metrics-first presentation

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chart Library | Recharts (existing) | Already installed, consistent with RSVP reports |
| Chart Type | Horizontal stacked bar | Better for category names, clear status breakdown |
| Status Groups | Confirmed, Pending, Maybe, Declined | Matches existing RSVP card, focused view |
| Countdown Format | Days until event | Simple, scannable metric |
| Map Component | Placeholder now, real later | Prepares UI for Stage 15 Google Maps |
| Layout | 3-row grid | Stat tiles → Charts → Details |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 26A | Backend Statistics Endpoint | ~2 files |
| 26B | Stat Tile Components | ~2 files |
| 26C | Category Status Chart | ~1 file |
| 26D | Location Placeholder | ~1 file |
| 26E | Dashboard Layout Refactor | ~1 file |
| 26F | i18n Translations | ~2 files |

---

## 26A: Backend Statistics Endpoint

### New tRPC Procedure

**Modify `trpc/routers/guests.ts`:**

Add `getStatsByCategoryAndStatus` procedure that returns a matrix of counts per category:

```typescript
getStatsByCategoryAndStatus: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Verify event exists and user has access (same pattern as getStats)

    // Query: group by categoryId and status, count guests
    const results = await db
      .select({
        categoryId: guests.categoryId,
        status: guests.status,
        count: sql<number>`count(*)::int`,
      })
      .from(guests)
      .where(eq(guests.eventId, input.eventId))
      .groupBy(guests.categoryId, guests.status)

    // Get category info
    const categories = await db.query.guestCategories.findMany({
      where: eq(guestCategories.eventId, input.eventId),
      orderBy: [asc(guestCategories.sortOrder)],
    })

    // Transform to matrix format
    return categories.map((cat) => {
      const catResults = results.filter((r) => r.categoryId === cat.id)
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color || "#6366f1",
        confirmed: catResults.find((r) => r.status === "confirmed")?.count ?? 0,
        pending: catResults.find((r) => r.status === "pending")?.count ?? 0,
        maybe: catResults.find((r) => r.status === "maybe")?.count ?? 0,
        declined: catResults.find((r) => r.status === "declined")?.count ?? 0,
        total: catResults.reduce((sum, r) => sum + r.count, 0),
      }
    })
  }),
```

### Hook

**Modify `trpc/hooks/guests-hooks.ts`:**

```typescript
export const useGuestStatsByCategoryAndStatus = (eventId: string) => {
  return trpc.guests.getStatsByCategoryAndStatus.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}
```

---

## 26B: Stat Tile Components

### Dashboard Stat Tile

**Create `components/events/dashboard-stat-tile.tsx`:**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon } from "lucide-react"

interface DashboardStatTileProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "destructive" | "muted"
  description?: string
  isLoading?: boolean
}

const variantStyles = {
  default: "bg-card",
  success: "bg-green-50 dark:bg-green-950/30",
  warning: "bg-yellow-50 dark:bg-yellow-950/30",
  destructive: "bg-red-50 dark:bg-red-950/30",
  muted: "bg-muted/50",
}

export function DashboardStatTile({
  label,
  value,
  icon: Icon,
  variant = "default",
  description,
  isLoading,
}: DashboardStatTileProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-16" />
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border p-4", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
```

### Event Countdown Tile

**Create `components/events/event-countdown-tile.tsx`:**

```typescript
"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { differenceInDays, isToday, isBefore, isAfter } from "date-fns"
import { DashboardStatTile } from "./dashboard-stat-tile"
import { Calendar, Clock } from "lucide-react"

interface EventCountdownTileProps {
  startDate: Date | null
  endDate?: Date | null
  isLoading?: boolean
}

export function EventCountdownTile({
  startDate,
  endDate,
  isLoading,
}: EventCountdownTileProps) {
  const t = useTranslations("event.dashboard")

  const { value, label, variant, icon } = useMemo(() => {
    if (!startDate) {
      return {
        value: "-",
        label: t("countdown"),
        variant: "muted" as const,
        icon: Calendar,
      }
    }

    const now = new Date()
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start

    // Event is today
    if (isToday(start) || (isAfter(now, start) && isBefore(now, end))) {
      return {
        value: t("today"),
        label: t("countdown"),
        variant: "success" as const,
        icon: Clock,
      }
    }

    // Event is in the past
    if (isAfter(now, end)) {
      return {
        value: t("completed"),
        label: t("countdown"),
        variant: "muted" as const,
        icon: Calendar,
      }
    }

    // Event is in the future
    const daysUntil = differenceInDays(start, now)
    return {
      value: t("daysUntil", { days: daysUntil }),
      label: t("countdown"),
      variant: daysUntil <= 7 ? ("warning" as const) : ("default" as const),
      icon: Calendar,
    }
  }, [startDate, endDate, t])

  return (
    <DashboardStatTile
      label={label}
      value={value}
      icon={icon}
      variant={variant}
      isLoading={isLoading}
    />
  )
}
```

---

## 26C: Category Status Chart

**Create `components/events/category-status-chart.tsx`:**

```typescript
"use client"

import { useTranslations } from "next-intl"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryStatusData {
  categoryId: string
  categoryName: string
  categoryColor: string
  confirmed: number
  pending: number
  maybe: number
  declined: number
  total: number
}

interface CategoryStatusChartProps {
  data: CategoryStatusData[]
  isLoading?: boolean
}

const STATUS_COLORS = {
  confirmed: "#22c55e", // green-500
  pending: "#eab308",   // yellow-500
  maybe: "#3b82f6",     // blue-500
  declined: "#ef4444",  // red-500
}

export function CategoryStatusChart({ data, isLoading }: CategoryStatusChartProps) {
  const t = useTranslations("event.dashboard")

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("guestsByCategory")}</CardTitle>
          <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("guestsByCategory")}</CardTitle>
          <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">{t("noCategories")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("guestsByCategory")}</CardTitle>
        <CardDescription>{t("guestsByCategoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="categoryName"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar
                dataKey="confirmed"
                name={t("statusConfirmed")}
                stackId="a"
                fill={STATUS_COLORS.confirmed}
              />
              <Bar
                dataKey="pending"
                name={t("statusPending")}
                stackId="a"
                fill={STATUS_COLORS.pending}
              />
              <Bar
                dataKey="maybe"
                name={t("statusMaybe")}
                stackId="a"
                fill={STATUS_COLORS.maybe}
              />
              <Bar
                dataKey="declined"
                name={t("statusDeclined")}
                stackId="a"
                fill={STATUS_COLORS.declined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 26D: Location Placeholder

**Create `components/events/location-preview-placeholder.tsx`:**

```typescript
"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, ExternalLink } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LocationPreviewPlaceholderProps {
  venue?: string | null
  venueAddress?: string | null
}

export function LocationPreviewPlaceholder({
  venue,
  venueAddress,
}: LocationPreviewPlaceholderProps) {
  const t = useTranslations("event.dashboard")

  if (!venue && !venueAddress) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t("location")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Venue Info */}
        {venue && <p className="font-medium">{venue}</p>}
        {venueAddress && (
          <p className="text-sm text-muted-foreground">{venueAddress}</p>
        )}

        {/* Map Placeholder */}
        <div className="relative h-[180px] rounded-md border bg-muted/50 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t("mapComingSoon")}</p>
          </div>
        </div>

        {/* View on Map Button (disabled) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" className="w-full" disabled>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("viewOnMap")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("mapComingSoonTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
```

---

## 26E: Dashboard Layout Refactor

**Modify `components/events/event-overview-tab.tsx`:**

Replace the existing 2x2 grid with a new 3-row dashboard layout.

**Layout Diagram:**

```
┌─────────────────────────────────────────────────────────┐
│  STAT TILES ROW (4 tiles)                               │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Total    │ Response │ Attended │ Countdown│          │
│  │ Invited  │ Rate     │          │          │          │
│  │ 156      │ 72%      │ 45       │ 12 days  │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
├─────────────────────────────────────────────────────────┤
│  CHARTS ROW (2 columns)                                 │
│  ┌─────────────────────┬─────────────────────┐          │
│  │ RSVP Breakdown      │ Guests by Category  │          │
│  │ (existing card with │ (stacked bar chart) │          │
│  │  status breakdown)  │                     │          │
│  └─────────────────────┴─────────────────────┘          │
├─────────────────────────────────────────────────────────┤
│  DETAILS ROW (2 columns)                                │
│  ┌─────────────────────┬─────────────────────┐          │
│  │ Event Details       │ Location            │          │
│  │                     │ (map placeholder)   │          │
│  └─────────────────────┴─────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 26F: i18n Translations

### English

**Add to `messages/en.json` under `event`:**

```json
{
  "event": {
    "dashboard": {
      "totalInvited": "Total Invited",
      "responseRate": "Response Rate",
      "attended": "Attended",
      "countdown": "Event Countdown",
      "today": "Today",
      "completed": "Completed",
      "daysUntil": "{days} days",
      "guestsByCategory": "Guests by Category",
      "guestsByCategoryDescription": "RSVP status breakdown per guest category",
      "noCategories": "No categories with guests yet",
      "rsvpBreakdown": "RSVP Response Rate",
      "rsvpBreakdownDescription": "Track guest responses and attendance",
      "statusConfirmed": "Confirmed",
      "statusPending": "Pending",
      "statusMaybe": "Maybe",
      "statusDeclined": "Declined",
      "eventDetails": "Event Details",
      "noDetailsYet": "No additional details added yet. Update in Settings tab.",
      "location": "Location",
      "mapComingSoon": "Map view coming soon",
      "mapComingSoonTooltip": "Google Maps integration is planned for a future update",
      "viewOnMap": "View on Map"
    }
  }
}
```

### Arabic

**Add to `messages/ar.json` under `event`:**

```json
{
  "event": {
    "dashboard": {
      "totalInvited": "إجمالي المدعوين",
      "responseRate": "معدل الاستجابة",
      "attended": "الحضور",
      "countdown": "العد التنازلي",
      "today": "اليوم",
      "completed": "منتهي",
      "daysUntil": "{days} يوم",
      "guestsByCategory": "الضيوف حسب الفئة",
      "guestsByCategoryDescription": "تفصيل حالة الرد حسب فئة الضيوف",
      "noCategories": "لا توجد فئات بها ضيوف حتى الآن",
      "rsvpBreakdown": "معدل الاستجابة للدعوات",
      "rsvpBreakdownDescription": "تتبع ردود الضيوف والحضور",
      "statusConfirmed": "مؤكد",
      "statusPending": "قيد الانتظار",
      "statusMaybe": "ربما",
      "statusDeclined": "اعتذر",
      "eventDetails": "تفاصيل الفعالية",
      "noDetailsYet": "لم تتم إضافة تفاصيل إضافية بعد. يمكنك التحديث من تبويب الإعدادات.",
      "location": "الموقع",
      "mapComingSoon": "عرض الخريطة قريباً",
      "mapComingSoonTooltip": "تكامل خرائط جوجل مخطط في تحديث مستقبلي",
      "viewOnMap": "عرض على الخريطة"
    }
  }
}
```

---

## Verification Checklist

### 26A: Backend Statistics
- [ ] `getStatsByCategoryAndStatus` procedure created
- [ ] Returns correct matrix of counts per category
- [ ] Hook added to `guests-hooks.ts`

### 26B: Stat Tiles
- [ ] `DashboardStatTile` component renders correctly
- [ ] Loading skeleton state works
- [ ] Color variants display properly
- [ ] `EventCountdownTile` shows correct state (days, today, completed)

### 26C: Category Chart
- [ ] Horizontal stacked bar chart renders
- [ ] All 4 status colors display correctly
- [ ] Tooltip shows counts on hover
- [ ] Legend displays at bottom
- [ ] Empty state shows when no data

### 26D: Location Placeholder
- [ ] Shows venue name and address
- [ ] Map placeholder area displays
- [ ] Disabled button with tooltip
- [ ] Hidden when no venue data

### 26E: Dashboard Layout
- [ ] 4 stat tiles in top row
- [ ] 2 charts in middle row
- [ ] 2 detail cards in bottom row
- [ ] Responsive on mobile (stacks properly)

### 26F: i18n
- [ ] All English translations added
- [ ] All Arabic translations added
- [ ] RTL layout works correctly

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `trpc/routers/guests.ts` |
| Modify | `trpc/hooks/guests-hooks.ts` |
| Create | `components/events/dashboard-stat-tile.tsx` |
| Create | `components/events/event-countdown-tile.tsx` |
| Create | `components/events/category-status-chart.tsx` |
| Create | `components/events/location-preview-placeholder.tsx` |
| Modify | `components/events/event-overview-tab.tsx` |
| Modify | `messages/en.json` |
| Modify | `messages/ar.json` |

---

## Dependencies

No new npm packages required. Uses existing:
- Recharts (already installed)
- date-fns (already installed)
- Lucide icons (already installed)
- Shadcn components

---

## Related Documents

- [15-google-maps-integration.md](./15-google-maps-integration.md) - Future map integration (location placeholder will be replaced)
- [00-overview.md](./00-overview.md) - Master plan overview

---

## Future Enhancements (Not in Scope)

- Real-time updates via WebSocket
- Drill-down from chart to guest list
- Exportable dashboard as PDF
- Custom date range filters
- Comparison with previous events
