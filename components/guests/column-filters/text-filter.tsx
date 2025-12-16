"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TextFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function TextFilter({
  value,
  onChange,
  placeholder = "Search...",
  label = "Filter",
}: TextFilterProps) {
  const [localValue, setLocalValue] = useState(value)
  const [open, setOpen] = useState(false)

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, value, onChange])

  const handleClear = useCallback(() => {
    setLocalValue("")
    onChange("")
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
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">{label}</p>
          <div className="relative">
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              className="pr-8"
              autoFocus
            />
            {localValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
