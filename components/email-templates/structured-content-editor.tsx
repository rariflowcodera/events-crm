"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Plus, Trash2, GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { VariableInserter } from "./variable-inserter"
import { DocumentInserter } from "./document-inserter"
import { MapInserter } from "./map-inserter"
import { FormLinkInserter } from "./form-link-inserter"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface StructuredContentEditorProps {
  eventId: string
  language: "en" | "ar"
  namePrefix: string // e.g., "structuredContent.en" or "structuredContent.ar"
  isOptional?: boolean // Arabic content is optional
}

// ============================================================================
// Component
// ============================================================================

export function StructuredContentEditor({
  eventId,
  language,
  namePrefix,
  isOptional = false,
}: StructuredContentEditorProps) {
  const t = useTranslations("emailTemplate")
  const form = useFormContext()

  const isRtl = language === "ar"
  const languageLabel = language === "en" ? "English" : "Arabic"

  // Field array for body paragraphs
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: `${namePrefix}.bodyParagraphs`,
  })

  // Insert variable at cursor position in a specific field
  const insertVariable = (fieldName: string, variable: string) => {
    const currentValue = form.getValues(fieldName) || ""
    // For simplicity, append at end. A more sophisticated implementation
    // would track cursor position.
    form.setValue(fieldName, currentValue + variable, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      {/* Subject Line */}
      <FormField
        control={form.control}
        name={`${namePrefix}.subject`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                {t("subject")}
                {!isOptional && <Badge variant="secondary" className="text-xs">Required</Badge>}
              </FormLabel>
              <VariableInserter
                eventId={eventId}
                onInsert={(v) => insertVariable(`${namePrefix}.subject`, v)}
              />
            </div>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={language === "en" ? "You're Invited to {{event.name}}" : "دعوة لحضور {{event.name}}"}
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(isRtl && "text-right")}
              />
            </FormControl>
            <FormDescription>
              {t("subjectDescription")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Greeting (Optional) */}
      <FormField
        control={form.control}
        name={`${namePrefix}.greeting`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("greeting")}</FormLabel>
              <VariableInserter
                eventId={eventId}
                onInsert={(v) => insertVariable(`${namePrefix}.greeting`, v)}
              />
            </div>
            <FormControl>
              <Input
                {...field}
                value={field.value || ""}
                placeholder={language === "en" ? "Dear {{guest.salutation}} {{guest.fullName}}," : "{{guest.salutation}} {{guest.fullName}} العزيز/ة،"}
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(isRtl && "text-right")}
              />
            </FormControl>
            <FormDescription>
              Optional personalized greeting line
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Heading */}
      <FormField
        control={form.control}
        name={`${namePrefix}.heading`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                {t("heading")}
                {!isOptional && <Badge variant="secondary" className="text-xs">Required</Badge>}
              </FormLabel>
              <VariableInserter
                eventId={eventId}
                onInsert={(v) => insertVariable(`${namePrefix}.heading`, v)}
              />
            </div>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={language === "en" ? "You Are Cordially Invited" : "دعوة كريمة لحضور"}
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(isRtl && "text-right")}
              />
            </FormControl>
            <FormDescription>
              Main heading displayed prominently in the email
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Subheading (Optional) */}
      <FormField
        control={form.control}
        name={`${namePrefix}.subheading`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>{t("subheading")}</FormLabel>
              <VariableInserter
                eventId={eventId}
                onInsert={(v) => insertVariable(`${namePrefix}.subheading`, v)}
              />
            </div>
            <FormControl>
              <Input
                {...field}
                value={field.value || ""}
                placeholder={language === "en" ? "{{event.name}}" : "{{event.name}}"}
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(isRtl && "text-right")}
              />
            </FormControl>
            <FormDescription>
              Optional subheading or event name/tagline
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* Body Paragraphs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Body Paragraphs</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add paragraphs for the main email content
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append("")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Paragraph
          </Button>
        </div>

        {fields.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No paragraphs yet. Click &quot;Add Paragraph&quot; to add content.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <Card key={field.id} className="relative">
                <CardContent className="pt-4 pb-3">
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-end gap-2">
                        <MapInserter
                          eventId={eventId}
                          onInsert={(v) => insertVariable(`${namePrefix}.bodyParagraphs.${index}`, v)}
                        />
                        <DocumentInserter
                          eventId={eventId}
                          onInsert={(v) => insertVariable(`${namePrefix}.bodyParagraphs.${index}`, v)}
                        />
                        <FormLinkInserter
                          eventId={eventId}
                          onInsert={(v) => insertVariable(`${namePrefix}.bodyParagraphs.${index}`, v)}
                        />
                        <VariableInserter
                          eventId={eventId}
                          onInsert={(v) => insertVariable(`${namePrefix}.bodyParagraphs.${index}`, v)}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`${namePrefix}.bodyParagraphs.${index}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={language === "en"
                                  ? "Enter paragraph content..."
                                  : "أدخل محتوى الفقرة..."
                                }
                                dir={isRtl ? "rtl" : "ltr"}
                                className={cn("min-h-[80px] resize-y", isRtl && "text-right")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* CTA Button */}
      <Accordion type="single" collapsible defaultValue="cta">
        <AccordionItem value="cta" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-medium">Call to Action Button</span>
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2 pb-4">
            <FormField
              control={form.control}
              name={`${namePrefix}.cta.text`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Button Text</FormLabel>
                    <VariableInserter
                      eventId={eventId}
                      onInsert={(v) => insertVariable(`${namePrefix}.cta.text`, v)}
                    />
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder={language === "en" ? "Confirm Your Attendance" : "تأكيد الحضور"}
                      dir={isRtl ? "rtl" : "ltr"}
                      className={cn(isRtl && "text-right")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`${namePrefix}.cta.url`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Button URL</FormLabel>
                    <VariableInserter
                      eventId={eventId}
                      onInsert={(v) => insertVariable(`${namePrefix}.cta.url`, v)}
                    />
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="{{rsvp.link}}"
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    Use {"{{rsvp.link}}"} for the personalized RSVP link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Post-CTA Text */}
      <FormField
        control={form.control}
        name={`${namePrefix}.postCtaText`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Post-CTA Text</FormLabel>
              <VariableInserter
                eventId={eventId}
                onInsert={(v) => insertVariable(`${namePrefix}.postCtaText`, v)}
              />
            </div>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ""}
                placeholder={language === "en"
                  ? "We look forward to seeing you!"
                  : "نتطلع لرؤيتكم!"
                }
                dir={isRtl ? "rtl" : "ltr"}
                className={cn("min-h-[60px]", isRtl && "text-right")}
              />
            </FormControl>
            <FormDescription>
              Optional text displayed after the CTA button
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
