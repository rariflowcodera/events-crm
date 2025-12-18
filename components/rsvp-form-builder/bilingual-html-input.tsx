"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { WELCOME_MESSAGE_VARIABLES } from "@/lib/rsvp/variable-utils"

interface BilingualHtmlInputProps {
  label?: string
  description?: string
  value: { en: string; ar?: string }
  onChange: (value: { en: string; ar?: string }) => void
  placeholder?: { en?: string; ar?: string }
  rows?: number
  required?: boolean
  disabled?: boolean
  className?: string
  showVariables?: boolean
}

export function BilingualHtmlInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  rows = 8,
  required = false,
  disabled = false,
  className,
  showVariables = true,
}: BilingualHtmlInputProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [activeLanguage, setActiveLanguage] = useState<"en" | "ar">("en")
  const [isVariablesOpen, setIsVariablesOpen] = useState(false)
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)

  const hasArContent = (value.ar || "").length > 0
  const hasEnContent = (value.en || "").length > 0

  const handleChange = (lang: "en" | "ar", newValue: string) => {
    onChange({
      ...value,
      [lang]: newValue,
    })
  }

  const handleCopyVariable = async (variableKey: string) => {
    const variableText = `{{${variableKey}}}`
    await navigator.clipboard.writeText(variableText)
    setCopiedVariable(variableKey)
    setTimeout(() => setCopiedVariable(null), 2000)
  }

  const variableGroups = [
    { key: "guest", label: t("variableGroupGuest"), variables: WELCOME_MESSAGE_VARIABLES.guest },
    { key: "event", label: t("variableGroupEvent"), variables: WELCOME_MESSAGE_VARIABLES.event },
    { key: "rsvp", label: t("variableGroupRsvp"), variables: WELCOME_MESSAGE_VARIABLES.rsvp },
  ]

  return (
    <div className={cn("space-y-3", className)}>
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
        <Textarea
          value={activeLanguage === "en" ? value.en : (value.ar || "")}
          onChange={(e) => handleChange(activeLanguage, e.target.value)}
          placeholder={
            activeLanguage === "en"
              ? placeholder?.en
              : placeholder?.ar || placeholder?.en
          }
          disabled={disabled}
          rows={rows}
          className={cn(
            "font-mono text-sm",
            activeLanguage === "ar" && "text-right"
          )}
        />
      </div>

      {activeLanguage === "ar" && !value.ar && value.en && (
        <p className="text-xs text-muted-foreground">
          {t("fallbackToEnglish")}
        </p>
      )}

      {/* Variable Reference Panel */}
      {showVariables && (
        <Collapsible open={isVariablesOpen} onOpenChange={setIsVariablesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {isVariablesOpen ? (
                <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t("welcomeMessageVariables")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-md border bg-muted/50 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("welcomeMessageVariablesDescription")}
              </p>
              {variableGroups.map((group) => (
                <div key={group.key} className="space-y-1.5">
                  <p className="text-xs font-medium">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.variables.map((variable) => (
                      <Button
                        key={variable.key}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] font-mono"
                        onClick={() => handleCopyVariable(variable.key)}
                      >
                        {copiedVariable === variable.key ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-600" />
                            {t("copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            {`{{${variable.key}}}`}
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
