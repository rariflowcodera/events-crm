"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string // "HH:MM" format
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  increment?: 15 | 30 // Minutes between options
}

function generateTimeOptions(increment: 15 | 30 = 30): string[] {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += increment) {
      options.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      )
    }
  }
  return options
}

export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select time",
  className,
  increment = 30,
}: TimePickerProps) {
  const timeOptions = React.useMemo(() => generateTimeOptions(increment), [increment])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 opacity-50" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
