# Stage 15: Google Maps Integration

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Planned

## Objective

Integrate Google Maps into the event location workflow to enable:
1. **Location Input**: Replace plain text venue inputs with Google Places Autocomplete to capture structured location data (coordinates, place ID, city, country)
2. **Admin Map Preview**: Display interactive map preview after location selection
3. **Email Templates**: Add map variables (`{{event.mapImage}}`, `{{event.mapLink}}`) for embedding static maps in guest communications

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Maps Provider | Google Maps Platform | Industry standard, excellent Arabic support, reliable |
| Autocomplete Library | @react-google-maps/api | Well-maintained React wrapper, TypeScript support |
| Email Maps | Google Static Maps API | Generates image URLs compatible with all email clients |
| Map Variable Format | Full HTML output | `{{event.mapImage}}` outputs complete `<img>` tag for simplicity |
| Coordinate Storage | Decimal precision 10,7 | Standard for GPS coordinates (±180.0000000) |
| KSA Compliance | Accepted | Google Maps API calls acceptable for this use case |

---

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| 15A | Schema & Environment Setup | ~4 files |
| 15B | Place Autocomplete Component | ~4 files |
| 15C | Map Preview Component | ~3 files |
| 15D | Email Template Variables | ~4 files |

---

## 15A: Schema & Environment Setup

### Environment Variables

**Update `env.ts`:**

```typescript
// Client-side key (restricted to domain)
export const NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_ENV = z
  .string()
  .min(1, "Google Maps API key is required")

// Server-side key (for Static Maps API in emails)
export const GOOGLE_MAPS_API_KEY_ENV = z
  .string()
  .min(1, "Google Maps server API key is required")
```

**Add to `.env.local`:**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_client_key_here
GOOGLE_MAPS_API_KEY=your_server_key_here
```

### Database Schema Changes

**Update `server/db/schemas/event.ts`:**

```typescript
import { decimal, text } from "drizzle-orm/pg-core"

// Add to events table definition
latitude: decimal("latitude", { precision: 10, scale: 7 }),
longitude: decimal("longitude", { precision: 10, scale: 7 }),
placeId: text("place_id"),           // Google's unique place identifier
city: text("city"),                  // Extracted for filtering/display
country: text("country"),            // Extracted for filtering/display
```

### Migration

```bash
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migration
```

### tRPC Router Updates

**Update `trpc/routers/events.ts`:**

Add new fields to create/update input schemas:

```typescript
// In create procedure input
latitude: z.string().optional(),
longitude: z.string().optional(),
placeId: z.string().optional(),
city: z.string().optional(),
country: z.string().optional(),

// Same for update procedure
```

---

## 15B: Place Autocomplete Component

### Files to Create

```
components/forms/place-autocomplete-input.tsx
components/providers/google-maps-provider.tsx
```

### Google Maps Provider

**`components/providers/google-maps-provider.tsx`:**

```typescript
"use client"

import { Libraries, useJsApiLoader } from "@react-google-maps/api"
import { createContext, useContext, ReactNode } from "react"

const libraries: Libraries = ["places"]

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
})

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}
```

### Place Autocomplete Input

**`components/forms/place-autocomplete-input.tsx`:**

```typescript
"use client"

import { useRef, useCallback } from "react"
import { Autocomplete } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { useGoogleMaps } from "@/components/providers/google-maps-provider"
import { Skeleton } from "@/components/ui/skeleton"

export interface PlaceResult {
  venue: string
  venueAddress: string
  latitude: string
  longitude: string
  placeId: string
  city: string
  country: string
}

interface PlaceAutocompleteInputProps {
  value?: string
  onChange: (place: PlaceResult | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PlaceAutocompleteInput({
  value,
  onChange,
  placeholder = "Search for a venue...",
  disabled,
  className,
}: PlaceAutocompleteInputProps) {
  const { isLoaded } = useGoogleMaps()
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) {
      onChange(null)
      return
    }

    // Extract address components
    const getComponent = (type: string) =>
      place.address_components?.find((c) => c.types.includes(type))?.long_name || ""

    onChange({
      venue: place.name || "",
      venueAddress: place.formatted_address || "",
      latitude: place.geometry.location.lat().toString(),
      longitude: place.geometry.location.lng().toString(),
      placeId: place.place_id || "",
      city: getComponent("locality") || getComponent("administrative_area_level_1"),
      country: getComponent("country"),
    })
  }, [onChange])

  if (!isLoaded) {
    return <Skeleton className="h-10 w-full" />
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ["establishment", "geocode"],
        fields: ["name", "formatted_address", "geometry", "place_id", "address_components"],
      }}
    >
      <Input
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    </Autocomplete>
  )
}
```

### Update Event Forms

**Update `components/forms/create-event-form.tsx`:**

Replace venue/venueAddress text inputs with:

```typescript
import { PlaceAutocompleteInput, PlaceResult } from "@/components/forms/place-autocomplete-input"
import { LocationPreview } from "@/components/events/location-preview"

// In form state, add location fields
const [locationData, setLocationData] = useState<PlaceResult | null>(null)

// Replace venue inputs with:
<FormItem>
  <FormLabel>{t("event.fields.venue")}</FormLabel>
  <PlaceAutocompleteInput
    value={form.watch("venue")}
    onChange={(place) => {
      if (place) {
        form.setValue("venue", place.venue)
        form.setValue("venueAddress", place.venueAddress)
        form.setValue("latitude", place.latitude)
        form.setValue("longitude", place.longitude)
        form.setValue("placeId", place.placeId)
        form.setValue("city", place.city)
        form.setValue("country", place.country)
        setLocationData(place)
      }
    }}
    placeholder={t("event.fields.venuePlaceholder")}
  />
</FormItem>

{/* Show map preview when location selected */}
{locationData?.latitude && locationData?.longitude && (
  <LocationPreview
    latitude={parseFloat(locationData.latitude)}
    longitude={parseFloat(locationData.longitude)}
    venue={locationData.venue}
  />
)}
```

**Update `components/events/event-settings-tab.tsx`:**

Same pattern as create-event-form.tsx.

---

## 15C: Map Preview Component

### Files to Create

```
components/events/location-preview.tsx
```

### Location Preview Component

**`components/events/location-preview.tsx`:**

```typescript
"use client"

import { GoogleMap, Marker } from "@react-google-maps/api"
import { useGoogleMaps } from "@/components/providers/google-maps-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LocationPreviewProps {
  latitude: number
  longitude: number
  venue?: string
  className?: string
  height?: string
}

export function LocationPreview({
  latitude,
  longitude,
  venue,
  className,
  height = "200px",
}: LocationPreviewProps) {
  const { isLoaded } = useGoogleMaps()

  if (!isLoaded) {
    return <Skeleton className={cn("w-full rounded-md", className)} style={{ height }} />
  }

  const center = { lat: latitude, lng: longitude }

  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height }}
        center={center}
        zoom={15}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        <Marker position={center} title={venue} />
      </GoogleMap>
    </div>
  )
}
```

### Integration in Event Overview

**Update `components/events/event-overview-tab.tsx`:**

Add map preview in the event info section:

```typescript
import { LocationPreview } from "@/components/events/location-preview"

// In the overview tab, add:
{event.latitude && event.longitude && (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">{t("event.location")}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {event.venue && <p className="font-medium">{event.venue}</p>}
      {event.venueAddress && (
        <p className="text-sm text-muted-foreground">{event.venueAddress}</p>
      )}
      <LocationPreview
        latitude={parseFloat(event.latitude)}
        longitude={parseFloat(event.longitude)}
        venue={event.venue}
        height="180px"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline"
      >
        {t("event.openInMaps")}
      </a>
    </CardContent>
  </Card>
)}
```

---

## 15D: Email Template Variables

### Files to Create/Modify

```
lib/maps/index.ts                           # New: Map utility functions
trpc/routers/email-templates.ts             # Modify: Add variables
lib/queue/email-job.ts                      # Modify: Render variables
components/email-templates/email-preview/   # Modify: Preview support
```

### Map Utility Functions

**Create `lib/maps/index.ts`:**

```typescript
/**
 * Builds a clickable static map HTML for email templates
 */
export function buildStaticMapHtml(event: {
  latitude?: string | null
  longitude?: string | null
  venue?: string | null
}): string {
  if (!event.latitude || !event.longitude) {
    return ""
  }

  const lat = event.latitude
  const lng = event.longitude
  const alt = event.venue || "Event Location"

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: "600x300",
    scale: "2", // Retina support
    markers: `color:red|${lat},${lng}`,
    key: process.env.GOOGLE_MAPS_API_KEY!,
  })

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params}`
  const linkUrl = buildGoogleMapsLink(lat, lng)

  return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="display: block;"><img src="${mapUrl}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" /></a>`
}

/**
 * Builds a Google Maps link for the given coordinates
 */
export function buildGoogleMapsLink(
  lat?: string | null,
  lng?: string | null
): string {
  if (!lat || !lng) return ""
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/**
 * Builds a static map URL (without HTML wrapper)
 */
export function buildStaticMapUrl(
  lat: string,
  lng: string,
  options?: {
    width?: number
    height?: number
    zoom?: number
  }
): string {
  const { width = 600, height = 300, zoom = 15 } = options || {}

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    scale: "2",
    markers: `color:red|${lat},${lng}`,
    key: process.env.GOOGLE_MAPS_API_KEY!,
  })

  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}
```

### Add Variables to Email Templates Router

**Update `trpc/routers/email-templates.ts`:**

In the `getVariables` procedure, add to the event group:

```typescript
event: [
  // ... existing variables ...
  { key: "{{event.mapImage}}", description: "Static map image (clickable HTML)" },
  { key: "{{event.mapLink}}", description: "Link to Google Maps" },
],
```

### Render Variables in Email Job

**Update `lib/queue/email-job.ts`:**

In the `renderEmailTemplate` function:

```typescript
import { buildStaticMapHtml, buildGoogleMapsLink } from "@/lib/maps"

// In the variables object:
const variables: Record<string, string> = {
  // ... existing variables ...
  "event.mapImage": buildStaticMapHtml(event),
  "event.mapLink": buildGoogleMapsLink(event.latitude, event.longitude),
}
```

### Update Email Preview

**Update email preview page to support map variables in preview mode:**

Add to the preview data object:

```typescript
const previewData = {
  // ... existing ...
  event: {
    // ... existing ...
    mapImage: event.latitude && event.longitude
      ? `<a href="https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}" target="_blank"><img src="https://maps.googleapis.com/maps/api/staticmap?center=${event.latitude},${event.longitude}&zoom=15&size=600x300&markers=color:red|${event.latitude},${event.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}" alt="${event.venue || 'Event Location'}" style="max-width: 100%; border-radius: 8px;" /></a>`
      : "",
    mapLink: event.latitude && event.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
      : "",
  },
}
```

---

## i18n Additions

**Add to `messages/en.json`:**

```json
{
  "event": {
    "location": "Location",
    "openInMaps": "Open in Google Maps",
    "fields": {
      "venuePlaceholder": "Search for a venue..."
    }
  },
  "emailTemplate": {
    "variables": {
      "mapImage": "Static map image (clickable HTML)",
      "mapLink": "Link to Google Maps"
    }
  }
}
```

**Add to `messages/ar.json`:**

```json
{
  "event": {
    "location": "الموقع",
    "openInMaps": "فتح في خرائط جوجل",
    "fields": {
      "venuePlaceholder": "ابحث عن مكان..."
    }
  },
  "emailTemplate": {
    "variables": {
      "mapImage": "صورة خريطة ثابتة (HTML قابل للنقر)",
      "mapLink": "رابط خرائط جوجل"
    }
  }
}
```

---

## Dependencies

```bash
pnpm add @react-google-maps/api
```

---

## Google Cloud Setup

### Prerequisites

1. **Create or use existing Google Cloud Project**

2. **Enable the following APIs:**
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Static Maps API

3. **Create API Keys:**
   - **Client key**:
     - Restrict to HTTP referrers (your domain(s))
     - Enable: Maps JavaScript API, Places API
   - **Server key**:
     - Restrict by IP or leave unrestricted (keep secret)
     - Enable: Static Maps API, Geocoding API

4. **Add to environment:**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...client_key
   GOOGLE_MAPS_API_KEY=AIza...server_key
   ```

### Cost Estimates

| API | Free Tier | Cost After |
|-----|-----------|------------|
| Maps JavaScript | 28,000 loads/month | $7/1000 |
| Places Autocomplete | $17/1000 sessions | Same |
| Static Maps | 25,000 loads/month | $2/1000 |
| Geocoding | 40,000 requests/month | $5/1000 |

Google provides $200/month credit which covers most small-medium usage.

---

## Verification Checklist

### 15A: Schema & Environment
- [ ] Environment variables added to `env.ts`
- [ ] `.env.local` updated with API keys
- [ ] Database migration created and applied
- [ ] tRPC router accepts new location fields

### 15B: Place Autocomplete
- [ ] GoogleMapsProvider added to app layout
- [ ] PlaceAutocompleteInput component works
- [ ] Autocomplete returns structured place data
- [ ] Arabic search queries work
- [ ] Create event form uses autocomplete
- [ ] Event settings uses autocomplete

### 15C: Map Preview
- [ ] LocationPreview displays interactive map
- [ ] Map shows marker at correct location
- [ ] Preview appears in create event form
- [ ] Preview appears in event settings
- [ ] Preview appears in event overview

### 15D: Email Variables
- [ ] `{{event.mapImage}}` outputs clickable map HTML
- [ ] `{{event.mapLink}}` outputs Google Maps URL
- [ ] Variables appear in variable inserter dropdown
- [ ] Preview renders map correctly
- [ ] Emails render map image correctly

---

## Critical Files Reference

| Pattern | Reference File |
|---------|---------------|
| Form input component | `components/forms/create-event-form.tsx` |
| Provider pattern | `components/providers/trpc-provider.tsx` |
| Event schema | `server/db/schemas/event.ts` |
| tRPC router | `trpc/routers/events.ts` |
| Email variables | `trpc/routers/email-templates.ts` |
| Email rendering | `lib/queue/email-job.ts` |
| Environment validation | `env.ts` |

---

## Future Enhancements (Not in Scope)

- Custom map styling to match event branding
- Directions/navigation integration
- Multiple venue support per event
- Venue capacity lookup
- Nearby amenities display
- Offline map support for mobile RSVP
