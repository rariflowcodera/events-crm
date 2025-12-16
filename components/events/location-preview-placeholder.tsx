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
