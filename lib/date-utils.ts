import { formatInTimeZone } from "date-fns-tz"

interface EventDateTime {
  startDate: Date | null
  endDate: Date | null
  startTime?: string | null // "HH:MM"
  endTime?: string | null // "HH:MM"
  isSingleDay?: boolean // Override for single-day detection from event schema
}

/**
 * Parse a date string/Date as a calendar date, normalizing to UTC noon.
 * This prevents timezone shifts when the date crosses midnight boundaries.
 *
 * Use this when loading dates from the database for form initialization.
 */
export function parseCalendarDate(
  dateInput: string | Date | null | undefined
): Date | null {
  if (!dateInput) return null
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  // Use UTC components to get the stored date value, normalized to noon UTC
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
  )
}

/**
 * Format a date as a calendar date string, always showing the UTC date
 * regardless of the browser's timezone.
 *
 * Use this for displaying dates that should appear the same for all users.
 */
export function formatCalendarDate(
  dateInput: Date | string | null | undefined,
  formatStr: string = "MMM d, yyyy"
): string {
  if (!dateInput) return ""
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  // Format in UTC to avoid timezone shifts
  return formatInTimeZone(d, "UTC", formatStr)
}

/**
 * Helper to compare dates in UTC (ignoring time components)
 */
function isSameDayUTC(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  )
}

/**
 * Format event date/time for display
 *
 * Examples:
 * - Single day with times: "Dec 16, 2024, 15:00 - 18:00"
 * - Single day no times: "Dec 16, 2024"
 * - Multi-day same month: "Dec 16 - 18, 2024"
 * - Multi-day different months: "Dec 16 - Jan 2, 2025"
 *
 * All dates are formatted in UTC to ensure consistent display across timezones.
 */
export function formatEventDateTime(event: EventDateTime): string {
  const { startDate, endDate, startTime, endTime } = event

  if (!startDate) return ""

  // Use explicit isSingleDay flag if provided, otherwise infer from dates
  const isSingleDay =
    event.isSingleDay ?? (!endDate || isSameDayUTC(startDate, endDate))

  if (isSingleDay) {
    // Single day event - use UTC formatting
    const dateStr = formatInTimeZone(startDate, "UTC", "MMM d, yyyy")

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

  // Multi-day event - use UTC methods for date comparisons
  const startYear = startDate.getUTCFullYear()
  const endYear = endDate!.getUTCFullYear()
  const startMonth = startDate.getUTCMonth()
  const endMonth = endDate!.getUTCMonth()

  if (startYear === endYear && startMonth === endMonth) {
    // Same month: "Dec 16 - 18, 2024"
    return `${formatInTimeZone(startDate, "UTC", "MMM d")} - ${formatInTimeZone(endDate!, "UTC", "d, yyyy")}`
  } else if (startYear === endYear) {
    // Same year, different months: "Dec 16 - Jan 2, 2024"
    return `${formatInTimeZone(startDate, "UTC", "MMM d")} - ${formatInTimeZone(endDate!, "UTC", "MMM d, yyyy")}`
  }

  // Different years: "Dec 16, 2024 - Jan 2, 2025"
  return `${formatInTimeZone(startDate, "UTC", "MMM d, yyyy")} - ${formatInTimeZone(endDate!, "UTC", "MMM d, yyyy")}`
}

/**
 * Check if an event is a single-day event (using UTC date comparison)
 */
export function isSingleDayEvent(
  startDate: Date | null,
  endDate: Date | null
): boolean {
  if (!startDate) return false
  if (!endDate) return true
  return isSameDayUTC(startDate, endDate)
}
