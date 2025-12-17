import { format, isSameDay } from "date-fns"

interface EventDateTime {
  startDate: Date | null
  endDate: Date | null
  startTime?: string | null // "HH:MM"
  endTime?: string | null // "HH:MM"
  isSingleDay?: boolean // Override for single-day detection from event schema
}

/**
 * Format event date/time for display
 *
 * Examples:
 * - Single day with times: "Dec 16, 2024, 15:00 - 18:00"
 * - Single day no times: "Dec 16, 2024"
 * - Multi-day same month: "Dec 16 - 18, 2024"
 * - Multi-day different months: "Dec 16 - Jan 2, 2025"
 */
export function formatEventDateTime(event: EventDateTime): string {
  const { startDate, endDate, startTime, endTime } = event

  if (!startDate) return ""

  // Use explicit isSingleDay flag if provided, otherwise infer from dates
  const isSingleDay = event.isSingleDay ?? (!endDate || isSameDay(startDate, endDate))

  if (isSingleDay) {
    // Single day event
    const dateStr = format(startDate, "MMM d, yyyy")

    if (startTime && endTime) {
      // With times: "Dec 16, 2024, 15:00 - 18:00"
      return `${dateStr}, ${startTime} - ${endTime}`
    } else if (startTime) {
      // Start time only: "Dec 16, 2024 at 15:00"
      return `${dateStr} at ${startTime}`
    }

    // Date only: "Dec 16, 2024"
    return dateStr
  }

  // Multi-day event
  const startYear = startDate.getFullYear()
  const endYear = endDate!.getFullYear()
  const startMonth = startDate.getMonth()
  const endMonth = endDate!.getMonth()

  if (startYear === endYear && startMonth === endMonth) {
    // Same month: "Dec 16 - 18, 2024"
    return `${format(startDate, "MMM d")} - ${format(endDate!, "d, yyyy")}`
  } else if (startYear === endYear) {
    // Same year, different months: "Dec 16 - Jan 2, 2024"
    return `${format(startDate, "MMM d")} - ${format(endDate!, "MMM d, yyyy")}`
  }

  // Different years: "Dec 16, 2024 - Jan 2, 2025"
  return `${format(startDate, "MMM d, yyyy")} - ${format(endDate!, "MMM d, yyyy")}`
}

/**
 * Check if an event is a single-day event
 */
export function isSingleDayEvent(
  startDate: Date | null,
  endDate: Date | null
): boolean {
  if (!startDate) return false
  if (!endDate) return true
  return isSameDay(startDate, endDate)
}
