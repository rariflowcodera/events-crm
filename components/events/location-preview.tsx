"use client"

import { GoogleMap, MarkerF } from "@react-google-maps/api"
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
        <MarkerF position={center} title={venue} />
      </GoogleMap>
    </div>
  )
}
