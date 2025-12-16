"use client"

import { Libraries, useJsApiLoader } from "@react-google-maps/api"
import { createContext, useContext, ReactNode } from "react"
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_ENV } from "@/env"

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
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_ENV,
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
