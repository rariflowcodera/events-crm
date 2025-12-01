"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Download, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface HotelRequirement {
  guestId: string
  guestName: string
  checkin: Date | string | null
  checkout: Date | string | null
  category: string
}

interface TransportRequirement {
  guestId: string
  guestName: string
  arrivalDate: Date | string | null
  arrivalFlight: string | null
  departureDate: Date | string | null
  departureFlight: string | null
  category: string
}

interface LogisticsTableProps {
  hotelData?: HotelRequirement[]
  transportData?: TransportRequirement[]
  isLoading?: boolean
  onExport?: (type: "hotel" | "transport") => void
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "MMM d, yyyy")
}

export function LogisticsTable({
  hotelData = [],
  transportData = [],
  isLoading,
  onExport,
}: LogisticsTableProps) {
  const t = useTranslations("rsvpReports")
  const [hotelOpen, setHotelOpen] = useState(true)
  const [transportOpen, setTransportOpen] = useState(true)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hotel Requirements */}
      <Collapsible open={hotelOpen} onOpenChange={setHotelOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t("hotelRequirements")}
                    <Badge variant="secondary">{hotelData.length}</Badge>
                  </CardTitle>
                  <CardDescription>{t("hotelRequirementsDescription")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {onExport && hotelData.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onExport("hotel")
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("export")}
                    </Button>
                  )}
                  {hotelOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {hotelData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("guestName")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("checkIn")}</TableHead>
                        <TableHead>{t("checkOut")}</TableHead>
                        <TableHead className="text-right">{t("nights")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotelData.map((item) => {
                        const checkin = item.checkin ? new Date(item.checkin) : null
                        const checkout = item.checkout ? new Date(item.checkout) : null
                        const nights =
                          checkin && checkout
                            ? Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24))
                            : null

                        return (
                          <TableRow key={item.guestId}>
                            <TableCell className="font-medium">{item.guestName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(item.checkin)}</TableCell>
                            <TableCell>{formatDate(item.checkout)}</TableCell>
                            <TableCell className="text-right">
                              {nights !== null ? nights : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t("noHotelRequirements")}</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Transport Requirements */}
      <Collapsible open={transportOpen} onOpenChange={setTransportOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t("transportRequirements")}
                    <Badge variant="secondary">{transportData.length}</Badge>
                  </CardTitle>
                  <CardDescription>{t("transportRequirementsDescription")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {onExport && transportData.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onExport("transport")
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("export")}
                    </Button>
                  )}
                  {transportOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {transportData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("guestName")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("arrivalDate")}</TableHead>
                        <TableHead>{t("arrivalFlight")}</TableHead>
                        <TableHead>{t("departureDate")}</TableHead>
                        <TableHead>{t("departureFlight")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transportData.map((item) => (
                        <TableRow key={item.guestId}>
                          <TableCell className="font-medium">{item.guestName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.arrivalDate)}</TableCell>
                          <TableCell>{item.arrivalFlight || "-"}</TableCell>
                          <TableCell>{formatDate(item.departureDate)}</TableCell>
                          <TableCell>{item.departureFlight || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t("noTransportRequirements")}</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
