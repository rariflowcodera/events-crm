"use client"

import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { ColorPicker } from "./color-picker"

// ============================================================================
// Types
// ============================================================================

type CardAccent = {
  enabled: boolean
  color: string
  position: "top" | "bottom" | "left" | "right"
  thickness: "thin" | "medium" | "thick"
}

interface CardAccentSettingsProps {
  value?: CardAccent
  onChange: (accent: CardAccent | undefined) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ACCENT: CardAccent = {
  enabled: true,
  color: "#D4A84B", // Gold
  position: "top",
  thickness: "medium",
}

const THICKNESS_VALUES = {
  thin: "3px",
  medium: "6px",
  thick: "10px",
} as const

// ============================================================================
// Helper
// ============================================================================

export function getAccentStyles(accent?: CardAccent): React.CSSProperties {
  if (!accent?.enabled) return {}

  const thickness = THICKNESS_VALUES[accent.thickness]
  const color = accent.color

  switch (accent.position) {
    case "top":
      return { borderTop: `${thickness} solid ${color}` }
    case "bottom":
      return { borderBottom: `${thickness} solid ${color}` }
    case "left":
      return { borderLeft: `${thickness} solid ${color}` }
    case "right":
      return { borderRight: `${thickness} solid ${color}` }
    default:
      return {}
  }
}

// ============================================================================
// Component
// ============================================================================

export function CardAccentSettings({
  value,
  onChange,
  disabled,
  className,
}: CardAccentSettingsProps) {
  const t = useTranslations("branding")

  const accent = value || { ...DEFAULT_ACCENT, enabled: false }

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...DEFAULT_ACCENT, ...value, enabled: true })
    } else {
      onChange(value ? { ...value, enabled: false } : undefined)
    }
  }

  const handleColorChange = (color: string) => {
    onChange({ ...accent, color })
  }

  const handlePositionChange = (position: CardAccent["position"]) => {
    onChange({ ...accent, position })
  }

  const handleThicknessChange = (thickness: CardAccent["thickness"]) => {
    onChange({ ...accent, thickness })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="accent-toggle">{t("cardAccent")}</Label>
        <Switch
          id="accent-toggle"
          checked={accent.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {accent.enabled && (
        <>
          {/* Color */}
          <ColorPicker
            value={accent.color}
            onChange={handleColorChange}
            label={t("accentColor")}
            disabled={disabled}
          />

          {/* Position */}
          <div className="space-y-2">
            <Label>{t("accentPosition")}</Label>
            <RadioGroup
              value={accent.position}
              onValueChange={(v) => handlePositionChange(v as CardAccent["position"])}
              className="flex flex-wrap gap-3"
              disabled={disabled}
            >
              {(["top", "bottom", "left", "right"] as const).map((pos) => (
                <div key={pos} className="flex items-center space-x-2">
                  <RadioGroupItem value={pos} id={`pos-${pos}`} />
                  <Label htmlFor={`pos-${pos}`} className="font-normal cursor-pointer">
                    {t(`accentPosition${pos.charAt(0).toUpperCase() + pos.slice(1)}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Thickness */}
          <div className="space-y-2">
            <Label>{t("accentThickness")}</Label>
            <RadioGroup
              value={accent.thickness}
              onValueChange={(v) => handleThicknessChange(v as CardAccent["thickness"])}
              className="flex flex-wrap gap-3"
              disabled={disabled}
            >
              {(["thin", "medium", "thick"] as const).map((size) => (
                <div key={size} className="flex items-center space-x-2">
                  <RadioGroupItem value={size} id={`size-${size}`} />
                  <Label htmlFor={`size-${size}`} className="font-normal cursor-pointer">
                    {t(`accentThickness${size.charAt(0).toUpperCase() + size.slice(1)}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t("preview") || "Preview"}</Label>
            <div
              className="h-20 w-full rounded-lg border bg-card"
              style={getAccentStyles(accent)}
            >
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("sampleCard") || "Sample Card"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
