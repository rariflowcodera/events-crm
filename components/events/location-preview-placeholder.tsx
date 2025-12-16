"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, ExternalLink } from "lucide-react"
import { LocationPreview } from "@/components/events/location-preview"

interface LocationPreviewPlaceholderProps {
  venue?: string | null
  venueAddress?: string | null
  latitude?: string | null
  longitude?: string | null
}

export function LocationPreviewPlaceholder({
  venue,
  venueAddress,
  latitude,
  longitude,
}: LocationPreviewPlaceholderProps) {
  const t = useTranslations("event.dashboard")

  if (!venue && !venueAddress) {
    return null
  }

  const hasCoordinates = latitude && longitude
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null

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

        {/* Map Preview or Placeholder */}
        {hasCoordinates ? (
          <LocationPreview
            latitude={parseFloat(latitude)}
            longitude={parseFloat(longitude)}
            venue={venue || undefined}
            height="180px"
          />
        ) : (
          <div className="relative h-[180px] rounded-md border bg-muted/50 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t("noCoordinates")}</p>
            </div>
          </div>
        )}

        {/* View on Map Button */}
        {mapsUrl ? (
          <Button variant="outline" className="w-full" asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("viewOnMap")}
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("viewOnMap")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
