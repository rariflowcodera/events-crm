"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { useDeleteGuestCategory } from "@/trpc/hooks/guest-categories-hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { Icons } from "@/components/global/icons"
import { createRoute } from "@/lib/routes"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
  defaultEmailTemplateId: string | null
}

interface Event {
  id: string
  name: string
  slug: string
  guestCategories: GuestCategory[]
}

interface EventCategoriesTabProps {
  event: Event
  workspaceSlug: string
}

export function EventCategoriesTab({ event, workspaceSlug }: EventCategoriesTabProps) {
  const t = useTranslations("guest")
  const router = useRouter()
  const { can } = usePermissions(workspaceSlug)
  const canManage = can(PERMISSIONS.MANAGE_EVENT)

  // State
  const [deletingCategory, setDeletingCategory] = useState<GuestCategory | null>(null)

  // Navigation hrefs
  const addCategoryHref = createRoute("category-new", { slug: workspaceSlug, eventSlug: event.slug }).href
  const getCategoryDetailHref = useCallback(
    (categoryId: string) => createRoute("category-detail", { slug: workspaceSlug, eventSlug: event.slug, categoryId }).href,
    [workspaceSlug, event.slug]
  )

  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteGuestCategory({
    onSuccess: () => {
      setDeletingCategory(null)
      router.refresh()
    },
  })

  const handleDeleteCategory = useCallback(() => {
    if (!deletingCategory) return
    deleteCategory({ categoryId: deletingCategory.id })
  }, [deletingCategory, deleteCategory])

  // Sort categories by sortOrder
  const sortedCategories = [...event.guestCategories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("categories")}</h3>
          <p className="text-muted-foreground text-sm">
            Define guest categories with different service levels
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href={addCategoryHref}>
              <Icons.plus className="mr-2 h-4 w-4" />
              Add Category
            </Link>
          </Button>
        )}
      </div>

      {sortedCategories.length > 0 ? (
        <div className="space-y-3">
          {sortedCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: category.color || "#6366f1" }}
                  />
                  <div>
                    <p className="font-medium">
                      {category.name}{" "}
                      <span className="text-muted-foreground text-sm">
                        ({category.code})
                      </span>
                    </p>
                    {category.description && (
                      <p className="text-muted-foreground text-sm">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icons.actions className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={getCategoryDetailHref(category.id)}>
                          <Icons.edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Icons.trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <EmptyPlaceholder>
              <EmptyPlaceholder.Icon name="layers" />
              <EmptyPlaceholder.Title>No categories defined</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                Create categories like AAA, A, B with different service allocations. Categories are required before you can add guests.
              </EmptyPlaceholder.Description>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href={addCategoryHref}>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Add First Category
                  </Link>
                </Button>
              )}
            </EmptyPlaceholder>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{deletingCategory?.name}"?
              {" "}
              <span className="font-medium text-destructive">
                This will fail if there are guests assigned to this category.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
