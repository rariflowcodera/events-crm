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
