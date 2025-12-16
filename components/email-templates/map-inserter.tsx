"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useTemplateVariables } from "@/trpc/hooks/email-hooks"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface MapInserterProps {
  eventId: string
  onInsert: (variable: string) => void
  onFocus?: () => void
}

type MapVariable = "mapImage" | "mapLink"

export function MapInserter({ eventId, onInsert, onFocus }: MapInserterProps) {
  const t = useTranslations("emailTemplate")

  // Check if event has coordinates by checking if map variables exist
  const { data: variables } = useTemplateVariables(eventId)
  const hasCoordinates = variables?.map && variables.map.length > 0

  const [open, setOpen] = useState(false)
  const [selectedVariable, setSelectedVariable] = useState<MapVariable>("mapImage")

  const handleInsert = () => {
    const variable = selectedVariable === "mapImage"
      ? "{{event.mapImage}}"
      : "{{event.mapLink}}"

    onInsert(variable)
    setOpen(false)
    setSelectedVariable("mapImage")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedVariable("mapImage")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onFocus}
          disabled={!hasCoordinates}
          title={!hasCoordinates ? t("mapNoCoordinates") : undefined}
        >
          <Icons.mapPin className="mr-1.5 h-3 w-3" />
          {t("insertMap")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h4 className="font-medium text-sm">{t("insertMap")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("mapDescription")}
            </p>
          </div>

          {/* Map variable options */}
          <RadioGroup
            value={selectedVariable}
            onValueChange={(value) => setSelectedVariable(value as MapVariable)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="mapImage" id="mapImage" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="mapImage" className="text-sm font-normal cursor-pointer">
                  {t("mapVariables.mapImage")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mapVariables.mapImageDescription")}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="mapLink" id="mapLink" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="mapLink" className="text-sm font-normal cursor-pointer">
                  {t("mapVariables.mapLink")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mapVariables.mapLinkDescription")}
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Insert button */}
          <Button
            type="button"
            className="w-full"
            size="sm"
            onClick={handleInsert}
          >
            {t("insertVariable")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
