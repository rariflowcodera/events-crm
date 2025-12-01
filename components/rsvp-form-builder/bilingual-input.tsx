"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface BilingualInputProps {
  label?: string
  description?: string
  value: { en: string; ar?: string }
  onChange: (value: { en: string; ar?: string }) => void
  placeholder?: { en?: string; ar?: string }
  multiline?: boolean
  rows?: number
  required?: boolean
  disabled?: boolean
  className?: string
}

export function BilingualInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  required = false,
  disabled = false,
  className,
}: BilingualInputProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [activeLanguage, setActiveLanguage] = useState<"en" | "ar">("en")

  const hasArContent = (value.ar || "").length > 0
  const hasEnContent = (value.en || "").length > 0

  const handleChange = (lang: "en" | "ar", newValue: string) => {
    onChange({
      ...value,
      [lang]: newValue,
    })
  }

  const InputComponent = multiline ? Textarea : Input

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Tabs
            value={activeLanguage}
            onValueChange={(v) => setActiveLanguage(v as "en" | "ar")}
          >
            <TabsList className="h-7">
              <TabsTrigger value="en" className="text-xs px-2 h-6">
                EN
                {hasEnContent && (
                  <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ar" className="text-xs px-2 h-6">
                AR
                {hasArContent && (
                  <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div dir={activeLanguage === "ar" ? "rtl" : "ltr"}>
        <InputComponent
          value={activeLanguage === "en" ? value.en : (value.ar || "")}
          onChange={(e) => handleChange(activeLanguage, e.target.value)}
          placeholder={
            activeLanguage === "en"
              ? placeholder?.en
              : placeholder?.ar || placeholder?.en
          }
          disabled={disabled}
          className={cn(activeLanguage === "ar" && "text-right")}
          {...(multiline ? { rows } : {})}
        />
      </div>

      {activeLanguage === "ar" && !value.ar && value.en && (
        <p className="text-xs text-muted-foreground">
          {t("fallbackToEnglish")}
        </p>
      )}
    </div>
  )
}

interface BilingualDisplayProps {
  value: { en: string; ar?: string }
  language?: "en" | "ar"
  fallback?: string
  className?: string
}

export function BilingualDisplay({
  value,
  language = "en",
  fallback = "",
  className,
}: BilingualDisplayProps) {
  const text = language === "ar" ? (value.ar || value.en) : value.en
  return <span className={className}>{text || fallback}</span>
}
