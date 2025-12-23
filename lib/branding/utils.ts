import type { WorkspaceBranding, EventBranding } from "@/server/db/schemas"

// ============================================================================
// Resolved Branding Type
// ============================================================================

export type ResolvedBranding = {
  logo: string | null
  logoDark: string | null
  primaryColor: string | null
  accentColor: string | null
  primaryColorDark: string | null
  accentColorDark: string | null
  secondaryColor: string | null
  secondaryColorDark: string | null
  backgroundImage: string | null
  /** Tracks the source of each field for UI display */
  _source: {
    logo: "workspace" | "event"
    logoDark: "workspace" | "event"
    primaryColor: "workspace" | "event"
    accentColor: "workspace" | "event"
    primaryColorDark: "workspace" | "event"
    accentColorDark: "workspace" | "event"
    secondaryColor: "workspace" | "event"
    secondaryColorDark: "workspace" | "event"
    backgroundImage: "workspace" | "event"
  }
}

// ============================================================================
// Color Conversion Utilities
// ============================================================================

/**
 * Convert hex color to HSL string for CSS variables.
 * Returns format "H S% L%" compatible with Tailwind CSS.
 *
 * @param hex - Hex color like "#4F46E5" or "4F46E5"
 * @returns HSL string like "239 84% 67%"
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "")

  // Handle 3-character hex
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }

  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Calculate relative luminance of a color for contrast calculations.
 * Based on WCAG 2.1 formula.
 */
export function getLuminance(hex: string): number {
  hex = hex.replace(/^#/, "")

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Determine if a color is "light" or "dark" based on luminance.
 * Useful for selecting contrasting foreground colors.
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.179
}

/**
 * Get a contrasting foreground color (black or white) for a given background.
 * Returns HSL format for CSS variables.
 */
export function getContrastingForeground(hexBackground: string): string {
  return isLightColor(hexBackground)
    ? "0 0% 0%" // Black for light backgrounds
    : "0 0% 100%" // White for dark backgrounds
}

// ============================================================================
// Branding Inheritance
// ============================================================================

/**
 * Resolve branding by merging event overrides with workspace defaults.
 * Event-level values take precedence; undefined/null falls back to workspace.
 *
 * @param workspaceBranding - Workspace branding configuration
 * @param eventBranding - Event branding configuration (may be null)
 * @returns Resolved branding with source tracking
 */
export function resolveBranding(
  workspaceBranding: WorkspaceBranding | null | undefined,
  eventBranding: EventBranding | null | undefined
): ResolvedBranding {
  const ws = workspaceBranding ?? {}
  const ev = eventBranding ?? {}

  // Helper to resolve a field with fallback
  const resolve = (field: keyof WorkspaceBranding | keyof EventBranding): string | null => {
    const eventValue = (ev as Record<string, unknown>)[field]
    const workspaceValue = (ws as Record<string, unknown>)[field]

    if (typeof eventValue === "string" && eventValue.length > 0) {
      return eventValue
    }
    if (typeof workspaceValue === "string" && workspaceValue.length > 0) {
      return workspaceValue
    }
    return null
  }

  // Helper to determine source of a field
  const source = (field: keyof WorkspaceBranding | keyof EventBranding): "workspace" | "event" => {
    const eventValue = (ev as Record<string, unknown>)[field]
    return typeof eventValue === "string" && eventValue.length > 0 ? "event" : "workspace"
  }

  return {
    logo: resolve("logo"),
    logoDark: resolve("logoDark"),
    primaryColor: resolve("primaryColor"),
    accentColor: resolve("accentColor"),
    primaryColorDark: resolve("primaryColorDark"),
    accentColorDark: resolve("accentColorDark"),
    secondaryColor: resolve("secondaryColor"),
    secondaryColorDark: resolve("secondaryColorDark"),
    backgroundImage: ev.backgroundImage || null,
    _source: {
      logo: source("logo"),
      logoDark: source("logoDark"),
      primaryColor: source("primaryColor"),
      accentColor: source("accentColor"),
      primaryColorDark: source("primaryColorDark"),
      accentColorDark: source("accentColorDark"),
      secondaryColor: source("secondaryColor"),
      secondaryColorDark: source("secondaryColorDark"),
      backgroundImage: "event", // Background image is always event-specific
    },
  }
}

// ============================================================================
// CSS Variable Generation
// ============================================================================

/**
 * Generate CSS variables object from resolved branding.
 * These can be spread onto a style prop for injection.
 *
 * @param branding - Resolved branding configuration
 * @returns Object with CSS variable names and HSL values
 */
export function generateCSSVariables(branding: ResolvedBranding): Record<string, string> {
  const vars: Record<string, string> = {}

  // Light mode colors
  if (branding.primaryColor) {
    vars["--brand-primary"] = hexToHsl(branding.primaryColor)
    vars["--brand-primary-foreground"] = getContrastingForeground(branding.primaryColor)
  }

  if (branding.accentColor) {
    vars["--brand-accent"] = hexToHsl(branding.accentColor)
    vars["--brand-accent-foreground"] = getContrastingForeground(branding.accentColor)
  }

  if (branding.secondaryColor) {
    vars["--brand-secondary"] = hexToHsl(branding.secondaryColor)
    vars["--brand-secondary-foreground"] = getContrastingForeground(branding.secondaryColor)
  }

  // Dark mode colors (used when .dark class is present)
  if (branding.primaryColorDark) {
    vars["--brand-primary-dark"] = hexToHsl(branding.primaryColorDark)
    vars["--brand-primary-dark-foreground"] = getContrastingForeground(branding.primaryColorDark)
  }

  if (branding.accentColorDark) {
    vars["--brand-accent-dark"] = hexToHsl(branding.accentColorDark)
    vars["--brand-accent-dark-foreground"] = getContrastingForeground(branding.accentColorDark)
  }

  if (branding.secondaryColorDark) {
    vars["--brand-secondary-dark"] = hexToHsl(branding.secondaryColorDark)
    vars["--brand-secondary-dark-foreground"] = getContrastingForeground(branding.secondaryColorDark)
  }

  return vars
}

// ============================================================================
// Logo Utilities
// ============================================================================

/**
 * Get the appropriate logo URL for the current theme.
 *
 * @param branding - Resolved branding configuration
 * @param isDarkMode - Whether dark mode is active
 * @returns Logo URL or null if not set
 */
export function getLogoForTheme(branding: ResolvedBranding, isDarkMode: boolean): string | null {
  if (isDarkMode && branding.logoDark) {
    return branding.logoDark
  }
  return branding.logo
}

/**
 * Get the appropriate logo URL based on the display mode setting.
 * Used for public pages (RSVP, custom forms) where the logo display mode is configurable.
 *
 * @param branding - Branding configuration (resolved or event)
 * @param displayMode - The configured display mode ("light", "dark", or "auto")
 * @param isSystemDark - Whether the user's system is in dark mode (only used for "auto" mode)
 * @returns Logo URL or null if not set
 */
export function getLogoForDisplayMode(
  branding: { logo?: string | null; logoDark?: string | null } | null | undefined,
  displayMode: "light" | "dark" | "auto" = "light",
  isSystemDark: boolean = false
): string | null {
  if (!branding) return null

  const logo = branding.logo || null
  const logoDark = branding.logoDark || null

  switch (displayMode) {
    case "dark":
      // Always prefer dark logo, fallback to light
      return logoDark || logo
    case "auto":
      // Use system preference, fallback appropriately
      if (isSystemDark) {
        return logoDark || logo
      }
      return logo || logoDark
    case "light":
    default:
      // Always prefer light logo, fallback to dark
      return logo || logoDark
  }
}

/**
 * Check if branding has any custom values set.
 */
export function hasBrandingValues(
  branding: WorkspaceBranding | EventBranding | null | undefined
): boolean {
  if (!branding) return false

  return Object.values(branding).some(
    (value) => typeof value === "string" && value.length > 0
  )
}

// ============================================================================
// Email Branding Types and Utilities
// ============================================================================

import type { EmailBrandingConfig } from "@/server/db/schemas/workspace"

/**
 * Resolved email branding with all values populated (using defaults where needed).
 */
export type ResolvedEmailBranding = {
  accentStripColor: string
  accentStripHeight: "thin" | "medium" | "thick"
  headingColor: string
  bodyTextColor: string
  ctaButtonColor: string
  ctaButtonTextColor: string
  contentBackgroundColor: string
  ctaButtonStyle: "rounded" | "pill" | "square"
  fontFamily: "noto-sans" | "inter" | "arial" | "georgia" | "system"
  arabicFontFamily: "noto-sans" | "din-next" | "geeza" | "tahoma" | "system"
  footerText?: string
  bannerFooterImage?: string // URL for optional banner image above footer text
}

/**
 * Resolve email branding by merging event overrides with workspace defaults.
 * Falls back to visual branding colors when email-specific colors are not set.
 *
 * @param workspaceEmailBranding - Workspace email branding configuration
 * @param eventEmailBranding - Event email branding configuration (may be null)
 * @param resolvedVisualBranding - Resolved visual branding for color fallbacks
 * @returns Resolved email branding with all values populated
 */
export function resolveEmailBranding(
  workspaceEmailBranding?: EmailBrandingConfig,
  eventEmailBranding?: EmailBrandingConfig,
  resolvedVisualBranding?: ResolvedBranding
): ResolvedEmailBranding {
  const ws = workspaceEmailBranding ?? {}
  const ev = eventEmailBranding ?? {}

  // Helper to get first non-empty string value
  const resolveString = (...values: (string | null | undefined)[]): string | undefined => {
    return values.find((v): v is string => typeof v === "string" && v.length > 0)
  }

  return {
    accentStripColor:
      resolveString(ev.accentStripColor, ws.accentStripColor, resolvedVisualBranding?.accentColor) ||
      "#A67C52",
    accentStripHeight: ev.accentStripHeight || ws.accentStripHeight || "medium",
    headingColor:
      resolveString(ev.headingColor, ws.headingColor, resolvedVisualBranding?.primaryColor) ||
      "#1B5E5E",
    bodyTextColor: resolveString(ev.bodyTextColor, ws.bodyTextColor) || "#374151",
    ctaButtonColor:
      resolveString(ev.ctaButtonColor, ws.ctaButtonColor, resolvedVisualBranding?.accentColor) ||
      "#A67C52",
    ctaButtonTextColor: resolveString(ev.ctaButtonTextColor, ws.ctaButtonTextColor) || "#ffffff",
    contentBackgroundColor: resolveString(ev.contentBackgroundColor, ws.contentBackgroundColor) || "#ffffff",
    ctaButtonStyle: ev.ctaButtonStyle || ws.ctaButtonStyle || "rounded",
    fontFamily: ev.fontFamily || ws.fontFamily || "inter",
    arabicFontFamily: ev.arabicFontFamily || ws.arabicFontFamily || "din-next",
    footerText: resolveString(ev.footerText, ws.footerText),
    bannerFooterImage: resolveString(ev.bannerFooterImage, ws.bannerFooterImage),
  }
}

// ============================================================================
// Email Styling Helpers
// ============================================================================

/**
 * Get the web-safe font stack for a given font family.
 */
export function getFontStack(family: ResolvedEmailBranding["fontFamily"]): string {
  const stacks: Record<string, string> = {
    inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    arial: "Arial, Helvetica, sans-serif",
    georgia: "Georgia, 'Times New Roman', serif",
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  }
  return stacks[family] || stacks.inter
}

/**
 * Get the Arabic font stack for a given font family.
 */
export function getArabicFontStack(family: ResolvedEmailBranding["arabicFontFamily"]): string {
  const stacks: Record<string, string> = {
    "din-next": "'DIN Next Arabic', 'Geeza Pro', Tahoma, sans-serif",
    geeza: "'Geeza Pro', 'Arabic Typesetting', Tahoma, sans-serif",
    tahoma: "Tahoma, 'Arabic Typesetting', sans-serif",
    system: "'Geeza Pro', Tahoma, sans-serif",
  }
  return stacks[family] || stacks["din-next"]
}

/**
 * Get the pixel height for accent strip.
 */
export function getAccentStripHeight(height: ResolvedEmailBranding["accentStripHeight"]): string {
  return { thin: "3px", medium: "6px", thick: "10px" }[height] || "6px"
}

/**
 * Get the border radius for CTA button.
 */
export function getCtaBorderRadius(style: ResolvedEmailBranding["ctaButtonStyle"]): string {
  return { rounded: "6px", pill: "9999px", square: "0px" }[style] || "6px"
}

/**
 * Get the content padding based on spacing preference.
 */
export function getContentPadding(spacing: "compact" | "normal" | "spacious" = "normal"): string {
  return { compact: "24px", normal: "40px 48px", spacious: "56px 64px" }[spacing] || "40px 48px"
}
