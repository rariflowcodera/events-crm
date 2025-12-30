"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useUpdateEventDocument, useDeleteEventDocument } from "@/trpc/hooks/document-hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"
import { cn } from "@/lib/utils"
import type { EventDocumentType } from "@/server/db/schemas/event-document"

const documentTypeColors: Record<EventDocumentType, string> = {
  schedule: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  map: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  policy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  brochure: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  invitation: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  image: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
}

interface GuestCategory {
  id: string
  name: string
  color: string | null
}

interface DocumentRowProps {
  document: {
    id: string
    eventId: string
    name: string
    fileName: string
    url: string
    mimeType: string
    fileSize: number
    type: EventDocumentType
    categoryIds: string[] | null
    createdAt: Date
    creator?: {
      id: string
      name: string | null
      image: string | null
    } | null
  }
  categories: GuestCategory[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return new Date(date).toLocaleDateString()
}

export function DocumentRow({ document, categories }: DocumentRowProps) {
  const t = useTranslations("documents")
  const tCommon = useTranslations("common")

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState(document.name)
  const [editType, setEditType] = useState<EventDocumentType>(document.type)
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>(document.categoryIds || [])

  const { mutate: updateDocument, isPending: isUpdating } = useUpdateEventDocument({
    onSuccess: () => setIsEditDialogOpen(false),
  })

  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteEventDocument({
    onSuccess: () => setIsDeleteDialogOpen(false),
  })

  const handleCopyLink = () => {
    navigator.clipboard.writeText(document.url)
    toast.success(t("linkCopied"))
  }

  const handleCopyVariable = () => {
    navigator.clipboard.writeText(`{{document.${document.id}}}`)
    toast.success("Variable copied to clipboard")
  }

  const handleSaveEdit = () => {
    updateDocument({
      documentId: document.id,
      name: editName,
      type: editType,
      categoryIds: editCategoryIds.length > 0 ? editCategoryIds : null,
    })
  }

  const handleDelete = () => {
    deleteDocument({ documentId: document.id })
  }

  const isPdf = document.mimeType === "application/pdf"
  const visibleCategories = categories.filter((c) => document.categoryIds?.includes(c.id))

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 p-2 bg-muted rounded-md">
                {isPdf ? (
                  <Icons.fileText className="h-5 w-5 text-red-500" />
                ) : (
                  <Icons.fileText className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs font-medium", documentTypeColors[document.type])}
                  >
                    {t(`types.${document.type}`)}
                  </Badge>
                  <span className="font-medium truncate">{document.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>{formatRelativeDate(document.createdAt)}</span>
                  {document.creator?.name && (
                    <span>by {document.creator.name}</span>
                  )}
                </div>
                {visibleCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{t("categories")}:</span>
                    {visibleCategories.map((cat) => (
                      <Badge
                        key={cat.id}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                        style={{
                          borderColor: cat.color || "#6366f1",
                          color: cat.color || "#6366f1",
                        }}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {(!document.categoryIds || document.categoryIds.length === 0) && (
                  <span className="text-xs text-muted-foreground">{t("allCategories")}</span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <Icons.actions className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Icons.edit className="mr-2 h-4 w-4" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyVariable}>
                  <Icons.copy className="mr-2 h-4 w-4" />
                  Copy Variable
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Icons.link className="mr-2 h-4 w-4" />
                  {t("copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={document.url} target="_blank" rel="noopener noreferrer">
                    <Icons.externalLink className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Icons.trash className="mr-2 h-4 w-4" />
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>
              Update document name, type, or category visibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("name")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">{t("type")}</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as EventDocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">{t("types.schedule")}</SelectItem>
                  <SelectItem value="map">{t("types.map")}</SelectItem>
                  <SelectItem value="policy">{t("types.policy")}</SelectItem>
                  <SelectItem value="brochure">{t("types.brochure")}</SelectItem>
                  <SelectItem value="invitation">{t("types.invitation")}</SelectItem>
                  <SelectItem value="image">{t("types.image")}</SelectItem>
                  <SelectItem value="other">{t("types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("categories")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={editCategoryIds.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditCategoryIds([])}
                >
                  {t("allCategories")}
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    variant={editCategoryIds.includes(cat.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEditCategoryIds((prev) =>
                        prev.includes(cat.id)
                          ? prev.filter((id) => id !== cat.id)
                          : [...prev, cat.id]
                      )
                    }}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select which guest categories can see this document in emails.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating || !editName.trim()}>
              {isUpdating ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                t("edit.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete")}
              <br />
              <span className="font-medium">{document.name}</span>
              <br />
              <span className="text-yellow-600 dark:text-yellow-500 mt-2 block">
                {t("deleteWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
