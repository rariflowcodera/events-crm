"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { getBackgroundStyles, type BackgroundImageMode } from "./background-image-upload"
import { getAccentStyles } from "./card-accent-settings"

// ============================================================================
// Types
// ============================================================================

type CardAccent = {
  enabled: boolean
  color: string
  position: "top" | "bottom" | "left" | "right"
  thickness: "thin" | "medium" | "thick"
}

type SectionHeader = {
  backgroundColor: string
  textColor: string
}

interface BrandingPreviewProps {
  logo?: string
  logoDark?: string
  primaryColor?: string
  accentColor?: string
  backgroundImage?: string
  backgroundImageMode?: BackgroundImageMode
  cardAccent?: CardAccent
  sectionHeader?: SectionHeader
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function BrandingPreview({
  logo,
  logoDark,
  primaryColor = "#4F46E5",
  accentColor = "#0EA5E9",
  backgroundImage,
  backgroundImageMode = "cover",
  cardAccent,
  sectionHeader,
  className,
}: BrandingPreviewProps) {
  const [isDark, setIsDark] = useState(false)

  const displayLogo = isDark ? logoDark || logo : logo

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Preview</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsDark(!isDark)}
          type="button"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <CardContent
        className={cn(
          "relative p-6 transition-colors duration-200 overflow-hidden",
          isDark ? "bg-gray-900" : "bg-white"
        )}
        style={backgroundImage ? {
          backgroundImage: `url(${backgroundImage})`,
          ...getBackgroundStyles(backgroundImageMode),
        } : undefined}
      >
        {/* Backdrop overlay for readability when background image is set */}
        {backgroundImage && (
          <div className={cn(
            "absolute inset-0",
            isDark ? "bg-gray-900/70" : "bg-white/70"
          )} />
        )}

        {/* Mini RSVP mockup card with accent */}
        <div
          className={cn(
            "relative rounded-lg overflow-hidden",
            isDark ? "bg-gray-800" : "bg-white",
            "shadow-sm border",
            isDark ? "border-gray-700" : "border-gray-200"
          )}
          style={getAccentStyles(cardAccent)}
        >
          <div className="p-4 space-y-3">
            {/* Logo */}
            <div className="flex items-center justify-center">
              {displayLogo ? (
                <Image
                  src={displayLogo}
                  alt="Logo preview"
                  width={120}
                  height={40}
                  className="h-8 w-auto object-contain"
                  unoptimized={displayLogo.startsWith("/api/file")}
                />
              ) : (
                <div
                  className={cn(
                    "flex h-8 w-20 items-center justify-center rounded text-xs",
                    isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
                  )}
                >
                  Logo
                </div>
              )}
            </div>

            {/* Section header preview */}
            {sectionHeader && (
              <div
                className="px-3 py-1.5 rounded text-xs font-semibold -mx-1"
                style={{
                  backgroundColor: sectionHeader.backgroundColor,
                  color: sectionHeader.textColor,
                }}
              >
                Travel & Logistics
              </div>
            )}

            {/* Mock form field */}
            <div
              className={cn(
                "h-7 w-full rounded border",
                isDark
                  ? "border-gray-600 bg-gray-700"
                  : "border-gray-200 bg-gray-50"
              )}
            />

            {/* Primary button */}
            <button
              type="button"
              className="w-full rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Confirm
            </button>

            {/* Accent link */}
            <p
              className={cn(
                "text-center text-[10px]",
                isDark ? "text-gray-400" : "text-gray-500"
              )}
            >
              Need help?{" "}
              <span className="underline" style={{ color: accentColor }}>
                Contact us
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
