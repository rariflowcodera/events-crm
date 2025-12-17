"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Hook for back navigation with explicit destination support.
 * When a fallback URL is provided, always navigates there for consistent UX.
 * Uses browser history only when no fallback is specified.
 */
export function useBackNavigation(fallbackUrl?: string) {
  const router = useRouter()

  const goBack = useCallback(() => {
    // If a fallback URL is provided, always use it for consistent navigation
    // This ensures clicking "back" on a detail page always goes to the list
    if (fallbackUrl) {
      router.push(fallbackUrl)
    } else if (typeof window !== "undefined" && window.history.length > 2) {
      // No explicit destination - use browser history
      router.back()
    } else {
      // Default fallback - go to home
      router.push("/")
    }
  }, [router, fallbackUrl])

  return { goBack }
}
