"use client"

import { ReactNode } from "react"

/**
 * Panel Layout - Wrapper for panel routes under event detail
 *
 * This layout provides the context for panel pages (guest detail, add guest, etc.)
 * The actual PagePanel component is used within each page to provide
 * the responsive behavior (full-screen mobile, overlay desktop).
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  // The layout itself is transparent - the PagePanel component
  // in each child page handles the overlay/full-screen behavior
  return <>{children}</>
}
