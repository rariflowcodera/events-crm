"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useTheme } from "next-themes"
import type { ResolvedBranding } from "@/lib/branding"
import { generateCSSVariables, getLogoForTheme } from "@/lib/branding"

// ============================================================================
// Context Types
// ============================================================================

interface BrandingContextValue {
  branding: ResolvedBranding
  currentLogo: string | null
  isDark: boolean
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

// ============================================================================
// Provider Props
// ============================================================================

interface BrandingProviderProps {
  branding: ResolvedBranding
  children: ReactNode
}

// ============================================================================
// Provider Component
// ============================================================================

export function BrandingProvider({ branding, children }: BrandingProviderProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Generate CSS variables from branding config
  const cssVariables = useMemo(() => generateCSSVariables(branding), [branding])

  // Get the appropriate logo for current theme
  const currentLogo = useMemo(
    () => getLogoForTheme(branding, isDark),
    [branding, isDark]
  )

  // Context value
  const value = useMemo(
    () => ({
      branding,
      currentLogo,
      isDark,
    }),
    [branding, currentLogo, isDark]
  )

  return (
    <BrandingContext.Provider value={value}>
      <div style={cssVariables as React.CSSProperties} className="contents">
        {children}
      </div>
    </BrandingContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useBranding() {
  const context = useContext(BrandingContext)

  if (!context) {
    // Return default values when used outside provider (e.g., public pages)
    return {
      branding: null,
      currentLogo: null,
      isDark: false,
    }
  }

  return context
}

// ============================================================================
// Server Component Wrapper
// ============================================================================

interface BrandingWrapperProps {
  cssVariables: Record<string, string>
  children: ReactNode
}

/**
 * Server-side wrapper that injects CSS variables without client-side context.
 * Use this when you don't need the React context, just the CSS variables.
 */
export function BrandingWrapper({ cssVariables, children }: BrandingWrapperProps) {
  return (
    <div style={cssVariables as React.CSSProperties} className="contents">
      {children}
    </div>
  )
}
