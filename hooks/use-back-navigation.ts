"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Hook for smart back navigation with fallback URL support.
 * Uses browser history when available, otherwise navigates to fallback.
 */
export function useBackNavigation(fallbackUrl?: string) {
  const router = useRouter()

  const goBack = useCallback(() => {
    // Check if we have meaningful history to go back to
    // history.length > 2 because: 1 = initial page, 2 = current page
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back()
    } else if (fallbackUrl) {
      router.push(fallbackUrl)
    } else {
      // Default fallback - go to home
      router.push("/")
    }
  }, [router, fallbackUrl])

  return { goBack }
}
