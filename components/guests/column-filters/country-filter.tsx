"use client"

import { useState, useMemo, useCallback } from "react"
import { Filter, Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { getCountryName } from "@/lib/data/countries"

interface CountryOption {
  code: string
  name: string
}

interface CountryFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  availableCountries: CountryOption[]
  label?: string
}

export function CountryFilter({
  value,
  onChange,
  availableCountries,
  label = "Country",
}: CountryFilterProps) {
  const [open, setOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(value), [value])

  const handleToggle = useCallback(
    (code: string) => {
      const newSet = new Set(selectedSet)
      if (newSet.has(code)) {
        newSet.delete(code)
      } else {
        newSet.add(code)
      }
      onChange(Array.from(newSet))
    },
    [selectedSet, onChange]
  )

  const handleClear = useCallback(() => {
    onChange([])
  }, [onChange])

  const hasValue = value.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 relative border flex-shrink-0",
            hasValue
              ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Filter className="h-4 w-4" />
          {hasValue && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {value.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">{label}</span>
            {hasValue && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleClear}
              >
                Clear
                <X className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandInput placeholder="Search countries..." />
          <CommandList>
            <CommandEmpty>No countries found.</CommandEmpty>
            <CommandGroup>
              {availableCountries.map((country) => {
                const isSelected = selectedSet.has(country.code)
                return (
                  <CommandItem
                    key={country.code}
                    value={country.name}
                    onSelect={() => handleToggle(country.code)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-3 w-3")} />
                    </div>
                    <span className="truncate">{country.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {hasValue && (
          <div className="border-t p-2 flex flex-wrap gap-1">
            {value.map((code) => {
              const name = getCountryName(code) || code
              return (
                <Badge
                  key={code}
                  variant="secondary"
                  className="text-xs"
                  onClick={() => handleToggle(code)}
                >
                  {name}
                  <X className="ml-1 h-2 w-2 cursor-pointer" />
                </Badge>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
