"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useEventDocuments } from "@/trpc/hooks/document-hooks"
import { DocumentRow } from "./document-row"
import { DocumentUploadDialog } from "./document-upload-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Icons } from "@/components/global/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import type { EventDocumentType } from "@/server/db/schemas/event-document"

interface GuestCategory {
  id: string
  name: string
  color: string | null
}

interface DocumentLibraryProps {
  eventId: string
  categories: GuestCategory[]
}

export function DocumentLibrary({ eventId, categories }: DocumentLibraryProps) {
  const t = useTranslations("documents")

  const [isOpen, setIsOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const { data: documents, isLoading } = useEventDocuments(
    eventId,
    typeFilter === "all" ? undefined : (typeFilter as EventDocumentType)
  )

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.fileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{t("title")}</CardTitle>
                    <CardDescription className="text-sm">
                      {t("description")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {documents && documents.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {documents.length} document{documents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="border-t pt-4">
              {/* Header with Upload Button */}
              <div className="flex items-center justify-between mb-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="schedule">{t("types.schedule")}</SelectItem>
                    <SelectItem value="map">{t("types.map")}</SelectItem>
                    <SelectItem value="policy">{t("types.policy")}</SelectItem>
                    <SelectItem value="brochure">{t("types.brochure")}</SelectItem>
                    <SelectItem value="invitation">{t("types.invitation")}</SelectItem>
                    <SelectItem value="other">{t("types.other")}</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setIsUploadOpen(true)}>
                  <Icons.upload className="mr-2 h-4 w-4" />
                  {t("uploadButton")}
                </Button>
              </div>

              {/* Document List */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !documents?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icons.fileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">{t("noDocuments")}</p>
                  <p className="text-sm mt-1">{t("noDocumentsDescription")}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsUploadOpen(true)}
                  >
                    <Icons.upload className="mr-2 h-4 w-4" />
                    {t("uploadFirst")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      document={doc}
                      categories={categories}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <DocumentUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        eventId={eventId}
        categories={categories}
      />
    </>
  )
}
