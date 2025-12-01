"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import {
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ResponseData {
  id: string
  guestName: string
  guestEmail?: string
  categoryName: string
  categoryCode: string
  status: "confirmed" | "declined" | "maybe" | "pending"
  dietaryType?: string
  accessibilityType?: string
  hotelRequired?: boolean
  transportRequired?: boolean
  submittedAt?: Date | string
}

interface ResponsesTableProps {
  data: ResponseData[]
  categories: Array<{ id: string; name: string; code: string }>
  isLoading?: boolean
  onExport?: () => void
}

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    className: "text-green-600 dark:text-green-400",
    badgeVariant: "default" as const,
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    badgeVariant: "destructive" as const,
  },
  maybe: {
    label: "Maybe",
    icon: HelpCircle,
    className: "text-yellow-600 dark:text-yellow-400",
    badgeVariant: "secondary" as const,
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-muted-foreground",
    badgeVariant: "outline" as const,
  },
}

export function ResponsesTable({
  data,
  categories,
  isLoading,
  onExport,
}: ResponsesTableProps) {
  const t = useTranslations("rsvpReports")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  // Filter data
  const filteredData = data.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.guestName.toLowerCase().includes(search.toLowerCase()) ||
      item.guestEmail?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    const matchesCategory = categoryFilter === "all" || item.categoryCode === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>{t("allResponses")}</CardTitle>
            <CardDescription>
              {t("showingResponses", {
                filtered: filteredData.length,
                total: data.length,
              })}
            </CardDescription>
          </div>
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              {t("exportAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
              <SelectItem value="declined">{t("declined")}</SelectItem>
              <SelectItem value="maybe">{t("maybe")}</SelectItem>
              <SelectItem value="pending">{t("pending")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("filterByCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.code}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredData.length > 0 ? (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("guestName")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("dietary")}</TableHead>
                  <TableHead>{t("accessibility")}</TableHead>
                  <TableHead>{t("hotel")}</TableHead>
                  <TableHead>{t("transport")}</TableHead>
                  <TableHead>{t("submittedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = statusConfig[item.status]
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.guestName}</p>
                          {item.guestEmail && (
                            <p className="text-sm text-muted-foreground">{item.guestEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.categoryCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.badgeVariant} className="gap-1">
                          <StatusIcon className={cn("h-3 w-3", status.className)} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.dietaryType && item.dietaryType !== "none" ? (
                          <Badge variant="secondary">{item.dietaryType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.accessibilityType && item.accessibilityType !== "none" ? (
                          <Badge variant="secondary">{item.accessibilityType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.hotelRequired ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {t("yes")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.transportRequired ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {t("yes")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.submittedAt ? (
                          <span className="text-sm">
                            {format(
                              typeof item.submittedAt === "string"
                                ? new Date(item.submittedAt)
                                : item.submittedAt,
                              "MMM d, yyyy HH:mm"
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("noResponsesFound")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
