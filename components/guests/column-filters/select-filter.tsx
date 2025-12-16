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

interface SelectOption {
  value: string
  label: string
  color?: string
}

interface SelectFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  options: SelectOption[]
  label?: string
  searchPlaceholder?: string
}

export function SelectFilter({
  value,
  onChange,
  options,
  label = "Filter",
  searchPlaceholder = "Search...",
}: SelectFilterProps) {
  const [open, setOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(value), [value])

  const handleToggle = useCallback(
    (optionValue: string) => {
      const newSet = new Set(selectedSet)
      if (newSet.has(optionValue)) {
        newSet.delete(optionValue)
      } else {
        newSet.add(optionValue)
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
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${hasValue ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground"}`}
        >
          <Filter className="h-4 w-4" />
          {hasValue && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center">
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
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleToggle(option.value)}
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
                    {option.color && (
                      <div
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {hasValue && (
          <div className="border-t p-2 flex flex-wrap gap-1">
            {value.map((v) => {
              const option = options.find((o) => o.value === v)
              return (
                <Badge
                  key={v}
                  variant="secondary"
                  className="text-xs"
                  onClick={() => handleToggle(v)}
                >
                  {option?.label || v}
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
