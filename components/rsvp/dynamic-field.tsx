"use client"

import { useTranslations } from "next-intl"
import { Controller, useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import type { DynamicFieldProps } from "@/lib/rsvp/types"

interface DynamicFieldComponentProps extends DynamicFieldProps {
  locale: "en" | "ar"
}

export function DynamicField({
  fieldKey,
  type,
  label,
  description,
  placeholder,
  required,
  options,
  validation,
  disabled,
  locale,
}: DynamicFieldComponentProps) {
  const { control } = useFormContext()
  const isRtl = locale === "ar"

  const renderField = () => {
    switch (type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
              minLength: validation?.minLength
                ? { value: validation.minLength, message: `Minimum ${validation.minLength} characters` }
                : undefined,
              maxLength: validation?.maxLength
                ? { value: validation.maxLength, message: `Maximum ${validation.maxLength} characters` }
                : undefined,
              pattern: validation?.pattern
                ? { value: new RegExp(validation.pattern), message: "Invalid format" }
                : undefined,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={fieldKey} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <Input
                  id={fieldKey}
                  type={type}
                  placeholder={placeholder}
                  disabled={disabled}
                  dir={isRtl ? "rtl" : "ltr"}
                  className={cn(
                    "h-11 sm:h-9",
                    fieldState.error && "border-destructive"
                  )}
                  {...field}
                  value={field.value || ""}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "textarea":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
              minLength: validation?.minLength
                ? { value: validation.minLength, message: `Minimum ${validation.minLength} characters` }
                : undefined,
              maxLength: validation?.maxLength
                ? { value: validation.maxLength, message: `Maximum ${validation.maxLength} characters` }
                : undefined,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={fieldKey} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <Textarea
                  id={fieldKey}
                  placeholder={placeholder}
                  disabled={disabled}
                  dir={isRtl ? "rtl" : "ltr"}
                  rows={3}
                  className={cn(
                    "min-h-[100px] sm:min-h-[80px]",
                    fieldState.error && "border-destructive"
                  )}
                  {...field}
                  value={field.value || ""}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "number":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
              min: validation?.min
                ? { value: validation.min, message: `Minimum value is ${validation.min}` }
                : undefined,
              max: validation?.max
                ? { value: validation.max, message: `Maximum value is ${validation.max}` }
                : undefined,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={fieldKey} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <Input
                  id={fieldKey}
                  type="number"
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    "h-11 sm:h-9",
                    fieldState.error && "border-destructive"
                  )}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "date":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={fieldKey} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <Input
                  id={fieldKey}
                  type="date"
                  disabled={disabled}
                  className={cn(
                    "h-11 sm:h-9",
                    fieldState.error && "border-destructive"
                  )}
                  {...field}
                  value={field.value || ""}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "select":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={fieldKey} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={disabled}
                >
                  <SelectTrigger className={cn(
                    "h-11 sm:h-9",
                    fieldState.error && "border-destructive"
                  )}>
                    <SelectValue placeholder={placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "radio":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "This field is required" : false,
            }}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                  {label}
                </Label>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={disabled}
                  className="flex flex-col"
                >
                  {options?.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center gap-3 py-2",
                        isRtl && "flex-row-reverse"
                      )}
                    >
                      <RadioGroupItem value={option.value} id={`${fieldKey}-${option.value}`} />
                      <Label htmlFor={`${fieldKey}-${option.value}`} className="font-normal cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        )

      case "checkbox":
        return (
          <Controller
            name={fieldKey}
            control={control}
            rules={{
              required: required ? "Please select at least one option" : false,
            }}
            render={({ field, fieldState }) => {
              const selectedValues: string[] = field.value || []

              const handleCheckChange = (optionValue: string, checked: boolean) => {
                if (checked) {
                  field.onChange([...selectedValues, optionValue])
                } else {
                  field.onChange(selectedValues.filter((v) => v !== optionValue))
                }
              }

              return (
                <div className="space-y-2">
                  <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
                    {label}
                  </Label>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                  <div className="flex flex-col">
                    {options?.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center gap-3 py-2",
                          isRtl && "flex-row-reverse"
                        )}
                      >
                        <Checkbox
                          id={`${fieldKey}-${option.value}`}
                          checked={selectedValues.includes(option.value)}
                          onCheckedChange={(checked) =>
                            handleCheckChange(option.value, checked as boolean)
                          }
                          disabled={disabled}
                        />
                        <Label htmlFor={`${fieldKey}-${option.value}`} className="font-normal cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )
            }}
          />
        )

      default:
        return null
    }
  }

  return <div className="w-full">{renderField()}</div>
}
