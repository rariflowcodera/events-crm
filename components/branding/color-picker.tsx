"use client"

import { useState, useCallback, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { RotateCcw } from "lucide-react"

// ============================================================================
// Preset Colors
// ============================================================================

const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#2563EB", // Blue
  "#0891B2", // Cyan
  "#059669", // Emerald
  "#16A34A", // Green
  "#CA8A04", // Yellow
  "#EA580C", // Orange
  "#DC2626", // Red
  "#DB2777", // Pink
  "#9333EA", // Purple
  "#64748B", // Slate
  "#000000", // Black
]

// ============================================================================
// Types
// ============================================================================

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  showInheritOption?: boolean
  inheritedValue?: string
  onReset?: () => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ColorPicker({
  value,
  onChange,
  label,
  disabled,
  showInheritOption,
  inheritedValue,
  onReset,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value || "")

  // Sync hex input when value changes externally
  useEffect(() => {
    setHexInput(value || "")
  }, [value])

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange(color)
      setHexInput(color)
    },
    [onChange]
  )

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let hex = e.target.value

      // Auto-add # if user starts typing without it
      if (hex && !hex.startsWith("#")) {
        hex = "#" + hex
      }

      setHexInput(hex)

      // Validate and update if valid hex
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
        onChange(hex)
      }
    },
    [onChange]
  )

  const handleNativeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value.toUpperCase()
      handleColorSelect(color)
    },
    [handleColorSelect]
  )

  const displayValue = value || inheritedValue || "#000000"
  const isUsingInherited = !value && inheritedValue

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2",
              isUsingInherited && "opacity-60"
            )}
          >
            <div
              className="h-4 w-4 shrink-0 rounded border border-border"
              style={{ backgroundColor: displayValue }}
            />
            <span className="font-mono text-sm">
              {value || (isUsingInherited ? `${inheritedValue} (inherited)` : "Select color")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          {/* Preset swatches */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="mt-1.5 grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded border-2 transition-all hover:scale-110",
                    value === color
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Hex input and native picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hex Value</Label>
            <div className="flex gap-2">
              <Input
                value={hexInput}
                onChange={handleHexChange}
                placeholder="#000000"
                className="font-mono"
                maxLength={7}
              />
              <div className="relative">
                <input
                  type="color"
                  value={displayValue}
                  onChange={handleNativeColorChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  title="Pick color"
                />
                <div
                  className="h-9 w-9 rounded border border-input"
                  style={{ backgroundColor: displayValue }}
                />
              </div>
            </div>
          </div>

          {/* Reset to inherited option */}
          {showInheritOption && inheritedValue && value && (
            <div className="mt-3 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  onReset?.()
                  setIsOpen(false)
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to workspace default
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
