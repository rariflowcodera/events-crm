"use client"

import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ColorPicker } from "./color-picker"

// ============================================================================
// Types
// ============================================================================

type SectionHeader = {
  backgroundColor: string
  textColor: string
}

interface SectionHeaderSettingsProps {
  value?: SectionHeader
  onChange: (header: SectionHeader | undefined) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_HEADER: SectionHeader = {
  backgroundColor: "#006B5A", // Teal
  textColor: "#FFFFFF", // White
}

// ============================================================================
// Component
// ============================================================================

export function SectionHeaderSettings({
  value,
  onChange,
  disabled,
  className,
}: SectionHeaderSettingsProps) {
  const t = useTranslations("branding")

  const handleBackgroundChange = (backgroundColor: string) => {
    onChange({
      backgroundColor,
      textColor: value?.textColor || DEFAULT_HEADER.textColor,
    })
  }

  const handleTextColorChange = (textColor: string) => {
    onChange({
      backgroundColor: value?.backgroundColor || DEFAULT_HEADER.backgroundColor,
      textColor,
    })
  }

  const handleReset = () => {
    onChange(undefined)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label>{t("sectionHeaders")}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("sectionHeadersDescription") || "Customize form section header appearance"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorPicker
          value={value?.backgroundColor}
          onChange={handleBackgroundChange}
          label={t("sectionBackgroundColor")}
          disabled={disabled}
          showInheritOption={!!value?.backgroundColor}
          onReset={handleReset}
        />
        <ColorPicker
          value={value?.textColor}
          onChange={handleTextColorChange}
          label={t("sectionTextColor")}
          disabled={disabled}
          showInheritOption={!!value?.textColor}
          onReset={handleReset}
        />
      </div>

      {/* Preview */}
      {value && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("preview") || "Preview"}</Label>
          <div className="overflow-hidden rounded-lg border">
            <div
              className="px-4 py-2.5 font-semibold"
              style={{
                backgroundColor: value.backgroundColor,
                color: value.textColor,
              }}
            >
              {t("sampleSectionTitle") || "Travel & Logistics"}
            </div>
            <div className="bg-card p-4">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
