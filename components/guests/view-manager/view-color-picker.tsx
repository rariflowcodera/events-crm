"use client"

import { VIEW_COLORS, type ViewColor } from "@/lib/guest-columns"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ViewColorPickerProps {
  value?: ViewColor
  onChange: (color: ViewColor) => void
}

export function ViewColorPicker({ value = "gray", onChange }: ViewColorPickerProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as ViewColor)}
      className="grid grid-cols-2 gap-3"
    >
      {(Object.entries(VIEW_COLORS) as [ViewColor, typeof VIEW_COLORS[ViewColor]][]).map(
        ([key, { label, dot }]) => (
          <div key={key} className="flex items-center space-x-2">
            <RadioGroupItem value={key} id={`color-${key}`} />
            <Label
              htmlFor={`color-${key}`}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className={`size-3 rounded-full ${dot}`} />
              <span className="text-sm">{label}</span>
            </Label>
          </div>
        )
      )}
    </RadioGroup>
  )
}
