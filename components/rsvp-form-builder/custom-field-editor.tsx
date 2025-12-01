"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, GripVertical, Pencil, X } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

import { BilingualInput, BilingualDisplay } from "./bilingual-input"
import { CategoryVisibilitySelect, CategoryBadges } from "./category-visibility-select"
import {
  customFieldTypeValues,
  bilingualTextSchema,
  fieldValidationSchema,
  fieldConditionalSchema,
} from "@/lib/schemas"
import type { CustomFieldDefinition, BilingualText } from "@/server/db/schemas/event"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface CustomFieldEditorProps {
  customFields: CustomFieldDefinition[]
  categories: GuestCategory[]
  language: "en" | "ar"
  onAddField: (field: Omit<CustomFieldDefinition, "sortOrder">) => void
  onUpdateField: (fieldId: string, field: Partial<CustomFieldDefinition>) => void
  onDeleteField: (fieldId: string) => void
  onReorderFields: (fieldIds: string[]) => void
  disabled?: boolean
}

// Optional bilingual text - allows empty strings (for description, placeholder)
const optionalBilingualTextSchema = z.object({
  en: z.string(),
  ar: z.string().optional(),
})

// Form schema for custom field
const customFieldFormSchema = z.object({
  type: z.enum(customFieldTypeValues),
  label: bilingualTextSchema,
  description: optionalBilingualTextSchema.optional(),
  placeholder: optionalBilingualTextSchema.optional(),
  required: z.boolean(),
  visibleToCategories: z.array(z.string()).optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1, "Value is required"),
        label: bilingualTextSchema,
      })
    )
    .optional(),
})

type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Text Area",
  select: "Dropdown",
  radio: "Radio Buttons",
  checkbox: "Checkboxes",
  date: "Date",
  number: "Number",
  email: "Email",
  phone: "Phone",
}

const FIELD_TYPES_WITH_OPTIONS = ["select", "radio", "checkbox"]

export function CustomFieldEditor({
  customFields,
  categories,
  language,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  disabled = false,
}: CustomFieldEditorProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)

  const editingField = editingFieldId
    ? customFields.find((f) => f.id === editingFieldId)
    : null

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      type: "text",
      label: { en: "", ar: "" },
      description: { en: "", ar: "" },
      placeholder: { en: "", ar: "" },
      required: false,
      visibleToCategories: undefined,
      options: [],
    },
  })

  const watchedType = form.watch("type")
  const needsOptions = FIELD_TYPES_WITH_OPTIONS.includes(watchedType)

  const handleOpenDialog = (fieldId?: string) => {
    console.log("handleOpenDialog called", { fieldId, isDialogOpen })
    if (fieldId) {
      const field = customFields.find((f) => f.id === fieldId)
      if (field) {
        form.reset({
          type: field.type,
          label: field.label,
          description: field.description || { en: "", ar: "" },
          placeholder: field.placeholder || { en: "", ar: "" },
          required: field.required,
          visibleToCategories: field.visibleToCategories,
          options: field.options || [],
        })
        setEditingFieldId(fieldId)
      }
    } else {
      form.reset({
        type: "text",
        label: { en: "", ar: "" },
        description: { en: "", ar: "" },
        placeholder: { en: "", ar: "" },
        required: false,
        visibleToCategories: undefined,
        options: [],
      })
      setEditingFieldId(null)
    }
    console.log("Setting isDialogOpen to true")
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingFieldId(null)
    form.reset()
  }

  const handleSubmit = (values: CustomFieldFormValues) => {
    const fieldData = {
      ...values,
      id: editingFieldId || crypto.randomUUID(),
      options: needsOptions ? values.options : undefined,
      description: values.description?.en ? values.description : undefined,
      placeholder: values.placeholder?.en ? values.placeholder : undefined,
    }

    if (editingFieldId) {
      onUpdateField(editingFieldId, fieldData)
    } else {
      onAddField(fieldData as Omit<CustomFieldDefinition, "sortOrder">)
    }
    handleCloseDialog()
  }

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= customFields.length) return

    const newOrder = [...customFields]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)

    onReorderFields(newOrder.map((f) => f.id))
  }

  const handleDeleteField = () => {
    if (deletingFieldId) {
      onDeleteField(deletingFieldId)
      setDeletingFieldId(null)
    }
  }

  // Options management
  const options = form.watch("options") || []

  const addOption = () => {
    form.setValue("options", [
      ...options,
      { value: "", label: { en: "", ar: "" } },
    ])
  }

  const removeOption = (index: number) => {
    form.setValue(
      "options",
      options.filter((_, i) => i !== index)
    )
  }

  const updateOption = (
    index: number,
    field: "value" | "label",
    value: string | BilingualText
  ) => {
    const newOptions = [...options]
    if (field === "value") {
      newOptions[index] = { ...newOptions[index], value: value as string }
    } else {
      newOptions[index] = { ...newOptions[index], label: value as BilingualText }
    }
    form.setValue("options", newOptions)
  }

  return (
    <div className="space-y-4">
      {/* Custom Fields List */}
      {customFields.length > 0 ? (
        <div className="space-y-2">
          {customFields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3 bg-background",
                disabled && "opacity-50"
              )}
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMoveField(index, "up")}
                  disabled={disabled || index === 0}
                >
                  <span className="text-xs">↑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleMoveField(index, "down")}
                  disabled={disabled || index === customFields.length - 1}
                >
                  <span className="text-xs">↓</span>
                </Button>
              </div>

              {/* Field info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    <BilingualDisplay value={field.label} language={language} />
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {FIELD_TYPE_LABELS[field.type] || field.type}
                  </Badge>
                  {field.required && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t("required")}
                    </Badge>
                  )}
                </div>
                {field.visibleToCategories && field.visibleToCategories.length > 0 && (
                  <div className="mt-1">
                    <CategoryBadges
                      categories={categories}
                      selectedIds={field.visibleToCategories}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenDialog(field.id)}
                  disabled={disabled}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingFieldId(field.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {t("noCustomFields")}
        </div>
      )}

      {/* Add Field Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOpenDialog()}
        disabled={disabled}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("addCustomField")}
      </Button>

      {/* Field Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFieldId ? t("editCustomField") : t("addCustomField")}
            </DialogTitle>
            <DialogDescription>
              {t("customFieldDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log("Form validation errors:", errors))} className="space-y-4">
              {/* Field Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fieldType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectFieldType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customFieldTypeValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Label */}
              <FormField
                control={form.control}
                name="label"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <BilingualInput
                      label={t("fieldLabel")}
                      value={field.value || { en: "", ar: "" }}
                      onChange={field.onChange}
                      placeholder={{ en: "Enter field label", ar: "أدخل تسمية الحقل" }}
                      required
                    />
                    {fieldState.error && (
                      <p className="text-sm font-medium text-destructive">
                        {fieldState.error.message || "English text is required"}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <BilingualInput
                      label={t("fieldDescription")}
                      value={field.value || { en: "", ar: "" }}
                      onChange={field.onChange}
                      placeholder={{ en: "Optional description", ar: "وصف اختياري" }}
                      multiline
                      rows={2}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Placeholder (for text inputs) */}
              {["text", "textarea", "email", "phone", "number"].includes(watchedType) && (
                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <BilingualInput
                        label={t("placeholder")}
                        value={field.value || { en: "", ar: "" }}
                        onChange={field.onChange}
                        placeholder={{ en: "Enter placeholder text", ar: "أدخل نص العنصر النائب" }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Options (for select/radio/checkbox) */}
              {needsOptions && (
                <div className="space-y-3">
                  <Label>{t("fieldOptions")}</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={option.value}
                          onChange={(e) => updateOption(index, "value", e.target.value)}
                          placeholder={t("optionValue")}
                          className="h-8"
                        />
                        <BilingualInput
                          label={`${t("optionLabel")} ${index + 1}`}
                          value={option.label}
                          onChange={(value) => updateOption(index, "label", value)}
                          placeholder={{ en: "Option label", ar: "تسمية الخيار" }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t("addOption")}
                  </Button>
                  {/* Show options validation errors */}
                  {form.formState.errors.options && (
                    <p className="text-sm font-medium text-destructive">
                      {t("optionsError")}
                    </p>
                  )}
                </div>
              )}

              {/* Required */}
              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("requiredField")}</FormLabel>
                      <FormDescription>{t("requiredFieldDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Category Visibility */}
              <FormField
                control={form.control}
                name="visibleToCategories"
                render={({ field }) => (
                  <FormItem>
                    <CategoryVisibilitySelect
                      label={t("visibleToCategories")}
                      description={t("categoryVisibilityDescription")}
                      categories={categories}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  {t("cancel")}
                </Button>
                <Button type="submit">
                  {editingFieldId ? t("saveChanges") : t("addField")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFieldId} onOpenChange={() => setDeletingFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFieldTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFieldDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
