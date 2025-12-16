"use client"

import { useFormContext } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ColorPicker } from "./color-picker"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface EmailBrandingSettingsProps {
  namePrefix: string // e.g., "branding.emailBranding" or "emailBranding"
  inheritedValues?: {
    accentStripColor?: string
    headingColor?: string
    bodyTextColor?: string
    ctaButtonColor?: string
    ctaButtonTextColor?: string
    contentBackgroundColor?: string
  }
  visualBrandingColors?: {
    primaryColor?: string
    accentColor?: string
  }
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const FONT_FAMILY_OPTIONS = [
  { value: "noto-sans", label: "Noto Sans (Brand)" },
  { value: "inter", label: "Inter (Modern Sans-serif)" },
  { value: "arial", label: "Arial (Classic Sans-serif)" },
  { value: "georgia", label: "Georgia (Serif)" },
  { value: "system", label: "System Default" },
]

const ARABIC_FONT_FAMILY_OPTIONS = [
  { value: "noto-sans", label: "Noto Sans Arabic (Brand)" },
  { value: "din-next", label: "DIN Next Arabic" },
  { value: "geeza", label: "Geeza Pro" },
  { value: "tahoma", label: "Tahoma" },
  { value: "system", label: "System Default" },
]

const ACCENT_STRIP_HEIGHT_OPTIONS = [
  { value: "thin", label: "Thin (3px)" },
  { value: "medium", label: "Medium (6px)" },
  { value: "thick", label: "Thick (10px)" },
]

const CTA_BUTTON_STYLE_OPTIONS = [
  { value: "rounded", label: "Rounded (6px)" },
  { value: "pill", label: "Pill (Full)" },
  { value: "square", label: "Square (0px)" },
]

// ============================================================================
// Component
// ============================================================================

export function EmailBrandingSettings({
  namePrefix,
  inheritedValues,
  visualBrandingColors,
  className,
}: EmailBrandingSettingsProps) {
  const t = useTranslations("branding")
  const form = useFormContext()

  // Get effective inherited values (email branding -> visual branding -> defaults)
  const effectiveInherited = {
    accentStripColor: inheritedValues?.accentStripColor || visualBrandingColors?.accentColor || "#A67C52",
    headingColor: inheritedValues?.headingColor || visualBrandingColors?.primaryColor || "#1B5E5E",
    bodyTextColor: inheritedValues?.bodyTextColor || "#374151",
    ctaButtonColor: inheritedValues?.ctaButtonColor || visualBrandingColors?.accentColor || "#A67C52",
    ctaButtonTextColor: inheritedValues?.ctaButtonTextColor || "#FFFFFF",
    contentBackgroundColor: inheritedValues?.contentBackgroundColor || "#FFFFFF",
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Colors Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Email Colors</CardTitle>
          <CardDescription>
            Customize colors for email templates. Leave empty to inherit from visual branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Accent Strip Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.accentStripColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent Strip Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.accentStripColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Top accent bar in emails
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Heading Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.headingColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.headingColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    H1 and H2 headings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Body Text Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.bodyTextColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Text Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.bodyTextColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Paragraph text
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CTA Button Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.ctaButtonColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Background</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.ctaButtonColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    CTA button background
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CTA Button Text Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.ctaButtonTextColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Text Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.ctaButtonTextColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    CTA button text
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Background Color */}
            <FormField
              control={form.control}
              name={`${namePrefix}.contentBackgroundColor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Background</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      showInheritOption
                      inheritedValue={effectiveInherited.contentBackgroundColor}
                      onReset={() => field.onChange(undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Main content area background
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Typography</CardTitle>
          <CardDescription>
            Select font families for email content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* English Font Family */}
            <FormField
              control={form.control}
              name={`${namePrefix}.fontFamily`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Font</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (Inter)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FONT_FAMILY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Arabic Font Family */}
            <FormField
              control={form.control}
              name={`${namePrefix}.arabicFontFamily`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arabic Font</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (DIN Next Arabic)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ARABIC_FONT_FAMILY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Layout & Style</CardTitle>
          <CardDescription>
            Customize the visual style of email elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Accent Strip Height */}
            <FormField
              control={form.control}
              name={`${namePrefix}.accentStripHeight`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent Strip Height</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (Medium)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCENT_STRIP_HEIGHT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CTA Button Style */}
            <FormField
              control={form.control}
              name={`${namePrefix}.ctaButtonStyle`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Style</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (Rounded)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CTA_BUTTON_STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Footer</CardTitle>
          <CardDescription>
            Default footer text for all emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name={`${namePrefix}.footerText`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Footer Text</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="© 2025 Your Organization. All rights reserved."
                    className="min-h-[80px]"
                  />
                </FormControl>
                <FormDescription>
                  Displayed at the bottom of all emails. Leave empty to use event name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
