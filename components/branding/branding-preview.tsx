"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface BrandingPreviewProps {
  logo?: string
  logoDark?: string
  primaryColor?: string
  accentColor?: string
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
          "p-6 transition-colors duration-200",
          isDark ? "bg-gray-900" : "bg-white"
        )}
      >
        {/* Mini RSVP mockup */}
        <div className="space-y-4">
          {/* Logo */}
          <div className="flex items-center justify-center">
            {displayLogo ? (
              <Image
                src={displayLogo}
                alt="Logo preview"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div
                className={cn(
                  "flex h-10 w-24 items-center justify-center rounded text-xs",
                  isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
                )}
              >
                Logo
              </div>
            )}
          </div>

          {/* Mock content */}
          <div className="space-y-2">
            <div
              className={cn(
                "h-5 w-3/4 rounded",
                isDark ? "bg-gray-700" : "bg-gray-100"
              )}
            />
            <div
              className={cn(
                "h-4 w-1/2 rounded",
                isDark ? "bg-gray-700" : "bg-gray-100"
              )}
            />
          </div>

          {/* Mock form field */}
          <div
            className={cn(
              "h-9 w-full rounded border",
              isDark
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-gray-50"
            )}
          />

          {/* Primary button */}
          <button
            type="button"
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Confirm Attendance
          </button>

          {/* Accent link */}
          <p
            className={cn(
              "text-center text-xs",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          >
            Need help?{" "}
            <span className="underline" style={{ color: accentColor }}>
              Contact us
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
