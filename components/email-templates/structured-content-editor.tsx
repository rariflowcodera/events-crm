"use client"

import { useRef } from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { useTranslations } from "next-intl"
import {
  Plus,
  Trash2,
  GripVertical,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
} from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

      {/* Heading (Optional) */}
      <FormField
        control={form.control}
        name={`${namePrefix}.heading`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                {t("heading")}
                <Badge variant="outline" className="text-xs">Optional</Badge>
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
              Optional main heading displayed prominently in the email
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
              Use **bold**, _italic_, --- for horizontal rule. Adjust size and alignment per paragraph.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ content: "", alignment: undefined, size: undefined })}
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
              <ParagraphEditor
                key={field.id}
                index={index}
                namePrefix={namePrefix}
                eventId={eventId}
                language={language}
                isRtl={isRtl}
                onRemove={() => remove(index)}
                insertVariable={insertVariable}
              />
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

// ============================================================================
// Paragraph Editor Component
// ============================================================================

interface ParagraphEditorProps {
  index: number
  namePrefix: string
  eventId: string
  language: "en" | "ar"
  isRtl: boolean
  onRemove: () => void
  insertVariable: (fieldName: string, variable: string) => void
}

function ParagraphEditor({
  index,
  namePrefix,
  eventId,
  language,
  isRtl,
  onRemove,
  insertVariable,
}: ParagraphEditorProps) {
  const form = useFormContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const contentFieldName = `${namePrefix}.bodyParagraphs.${index}.content`
  const alignmentFieldName = `${namePrefix}.bodyParagraphs.${index}.alignment`
  const sizeFieldName = `${namePrefix}.bodyParagraphs.${index}.size`

  // Helper to wrap selected text with markers
  const wrapSelectedText = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)

    const newText = selectedText
      ? text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
      : text + prefix + suffix

    form.setValue(contentFieldName, newText, { shouldDirty: true })

    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length)
      } else {
        const cursorPos = text.length + prefix.length
        textarea.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)
  }

  // Insert horizontal rule at cursor position or end
  const insertHorizontalRule = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value

    // Add --- on a new line
    const hrText = "\n---\n"
    const newText = text.substring(0, start) + hrText + text.substring(start)

    form.setValue(contentFieldName, newText, { shouldDirty: true })

    // Set cursor after the HR
    setTimeout(() => {
      textarea.focus()
      const cursorPos = start + hrText.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const handleBold = () => wrapSelectedText("**", "**")
  const handleItalic = () => wrapSelectedText("_", "_")

  return (
    <Card className="relative">
      <CardContent className="pt-4 pb-3">
        <div className="flex gap-2">
          <div className="flex flex-col items-center gap-1 pt-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            <span className="text-xs text-muted-foreground">{index + 1}</span>
          </div>
          <div className="flex-1 space-y-2">
            {/* Top row: Alignment + Size + Variable inserters */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* Alignment selector */}
                <FormField
                  control={form.control}
                  name={alignmentFieldName}
                  render={({ field }) => (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={!field.value || field.value === "left" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("left")}
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align left</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={field.value === "center" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("center")}
                          >
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align center</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={field.value === "right" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("right")}
                          >
                            <AlignRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align right</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                />

                {/* Size selector */}
                <FormField
                  control={form.control}
                  name={sizeFieldName}
                  render={({ field }) => (
                    <div className="flex items-center gap-1 border-l pl-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={field.value === "small" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("small")}
                          >
                            <span className="text-xs font-medium">A</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Small text (14px)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={!field.value || field.value === "normal" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("normal")}
                          >
                            <span className="text-sm font-medium">A</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Normal text (16px)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={field.value === "large" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => field.onChange("large")}
                          >
                            <span className="text-base font-medium">A</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Large text (20px)</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                />
              </div>

              {/* Variable inserters */}
              <div className="flex gap-2">
                <MapInserter
                  eventId={eventId}
                  onInsert={(v) => insertVariable(contentFieldName, v)}
                />
                <DocumentInserter
                  eventId={eventId}
                  onInsert={(v) => insertVariable(contentFieldName, v)}
                />
                <FormLinkInserter
                  eventId={eventId}
                  onInsert={(v) => insertVariable(contentFieldName, v)}
                />
                <VariableInserter
                  eventId={eventId}
                  onInsert={(v) => insertVariable(contentFieldName, v)}
                />
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 border-b pb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleBold}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold (**text**)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleItalic}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic (_text_)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={insertHorizontalRule}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Horizontal rule (---)</TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground ml-2">
                Press Enter for line breaks
              </span>
            </div>

            {/* Textarea */}
            <FormField
              control={form.control}
              name={contentFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      ref={textareaRef}
                      value={field.value ?? ""}
                      placeholder={
                        language === "en"
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
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
