"use client"

import { useTranslations } from "next-intl"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CategoryForm } from "@/components/guests/category-form"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  category?: GuestCategory | null
}

export function CategoryModal({
  isOpen,
  onClose,
  eventId,
  category,
}: CategoryModalProps) {
  const t = useTranslations("guest")
  const isEditing = !!category

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the category details"
              : "Create a new guest category with service levels"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4">
          <CategoryForm
            eventId={eventId}
            category={category}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
