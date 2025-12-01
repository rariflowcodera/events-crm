"use client"

import { useTranslations } from "next-intl"

import MultipleSelector, { Option } from "@/components/ui/multiselect"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface CategoryVisibilitySelectProps {
  label?: string
  description?: string
  categories: GuestCategory[]
  value?: string[]
  onChange: (categoryIds: string[] | undefined) => void
  disabled?: boolean
  className?: string
}

export function CategoryVisibilitySelect({
  label,
  description,
  categories,
  value,
  onChange,
  disabled = false,
  className,
}: CategoryVisibilitySelectProps) {
  const t = useTranslations("rsvpFormBuilder")

  // Convert categories to options format
  const options: Option[] = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))

  // Convert selected IDs to options
  const selectedOptions: Option[] = (value || [])
    .map((id) => {
      const cat = categories.find((c) => c.id === id)
      return cat ? { value: cat.id, label: cat.name } : null
    })
    .filter((opt): opt is Option => opt !== null)

  const handleChange = (selected: Option[]) => {
    if (selected.length === 0) {
      // Empty selection means "all categories"
      onChange(undefined)
    } else {
      onChange(selected.map((opt) => opt.value))
    }
  }

  const isAllCategories = !value || value.length === 0

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <MultipleSelector
        value={selectedOptions}
        onChange={handleChange}
        options={options}
        placeholder={isAllCategories ? t("allCategories") : t("selectCategories")}
        disabled={disabled}
        emptyIndicator={
          <p className="text-center text-sm text-muted-foreground">
            {t("noCategories")}
          </p>
        }
        hideClearAllButton={false}
        className="w-full"
      />

      {isAllCategories && (
        <p className="text-xs text-muted-foreground">
          {t("visibleToAllCategories")}
        </p>
      )}
    </div>
  )
}

interface CategoryBadgesProps {
  categories: GuestCategory[]
  selectedIds?: string[]
  className?: string
}

export function CategoryBadges({
  categories,
  selectedIds,
  className,
}: CategoryBadgesProps) {
  const t = useTranslations("rsvpFormBuilder")

  if (!selectedIds || selectedIds.length === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("allCategories")}
      </span>
    )
  }

  const selectedCategories = selectedIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((cat): cat is GuestCategory => cat !== undefined)

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {selectedCategories.map((cat) => (
        <span
          key={cat.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: cat.color || "#6366f1" }}
          />
          {cat.name}
        </span>
      ))}
    </div>
  )
}
