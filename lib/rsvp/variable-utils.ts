import { formatEventDateTime } from "@/lib/date-utils"
import { format } from "date-fns"

/**
 * Data available for welcome message variable replacement
 */
export interface WelcomeMessageData {
  guest: {
    firstName: string
    lastName: string
    preferredName?: string
    displayNameAr?: string
    title?: string
    email?: string
  }
  event: {
    name: string
    venue?: string
    venueAddress?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    isSingleDay?: boolean
    rsvpDeadline?: string
  }
  locale: "en" | "ar"
}

/**
 * Available variables for the welcome message editor
 * Used to display a reference panel in the UI
 */
export const WELCOME_MESSAGE_VARIABLES = {
  guest: [
    { key: "guest.firstName", label: { en: "First Name", ar: "الاسم الأول" }, example: "Ahmed" },
    { key: "guest.lastName", label: { en: "Last Name", ar: "اسم العائلة" }, example: "Al-Rashid" },
    { key: "guest.fullName", label: { en: "Full Name", ar: "الاسم الكامل" }, example: "Ahmed Al-Rashid" },
    { key: "guest.displayNameAr", label: { en: "Arabic Name", ar: "الاسم بالعربية" }, example: "أحمد الراشد" },
    { key: "guest.title", label: { en: "Title", ar: "اللقب" }, example: "Mr." },
    { key: "guest.email", label: { en: "Email", ar: "البريد الإلكتروني" }, example: "ahmed@example.com" },
  ],
  event: [
    { key: "event.name", label: { en: "Event Name", ar: "اسم الفعالية" }, example: "Asia Cup 2027" },
    { key: "event.venue", label: { en: "Venue", ar: "المكان" }, example: "King Abdul Aziz Conference Center" },
    { key: "event.venueAddress", label: { en: "Venue Address", ar: "عنوان المكان" }, example: "Riyadh, Saudi Arabia" },
    { key: "event.dateRange", label: { en: "Date Range", ar: "نطاق التاريخ" }, example: "Dec 18 - Mar 13, 2026" },
    { key: "event.startDate", label: { en: "Start Date", ar: "تاريخ البدء" }, example: "December 18, 2025" },
    { key: "event.endDate", label: { en: "End Date", ar: "تاريخ الانتهاء" }, example: "March 13, 2026" },
  ],
  rsvp: [
    { key: "rsvp.deadline", label: { en: "RSVP Deadline", ar: "الموعد النهائي للرد" }, example: "January 8, 2026" },
  ],
} as const

/**
 * Get all available variables as a flat list
 */
export function getAllVariables() {
  return [
    ...WELCOME_MESSAGE_VARIABLES.guest,
    ...WELCOME_MESSAGE_VARIABLES.event,
    ...WELCOME_MESSAGE_VARIABLES.rsvp,
  ]
}

/**
 * Format a date for display based on locale
 */
function formatDate(dateStr: string | undefined, locale: "en" | "ar"): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

/**
 * Replace variables in a welcome message with actual values
 *
 * Variables use mustache-style syntax: {{variable.name}}
 * Missing values are replaced with empty strings
 */
export function replaceWelcomeMessageVariables(
  html: string,
  data: WelcomeMessageData
): string {
  const { guest, event, locale } = data

  // Build the full name
  const fullName = guest.preferredName || `${guest.firstName} ${guest.lastName}`.trim()

  // Format dates
  const startDateFormatted = formatDate(event.startDate, locale)
  const endDateFormatted = formatDate(event.endDate, locale)
  const deadlineFormatted = formatDate(event.rsvpDeadline, locale)

  // Format date range using the existing utility
  let dateRange = ""
  if (event.startDate) {
    dateRange = formatEventDateTime({
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : null,
      startTime: event.startTime,
      endTime: event.endTime,
      isSingleDay: event.isSingleDay,
    })
  }

  // Build Arabic name with fallback to English full name
  const arabicName = guest.displayNameAr || fullName

  // Variable replacements map
  const replacements: Record<string, string> = {
    // Guest variables
    "guest.firstName": guest.firstName || "",
    "guest.lastName": guest.lastName || "",
    "guest.fullName": fullName,
    "guest.displayNameAr": arabicName,
    "guest.title": guest.title || "",
    "guest.email": guest.email || "",

    // Event variables
    "event.name": event.name || "",
    "event.venue": event.venue || "",
    "event.venueAddress": event.venueAddress || "",
    "event.dateRange": dateRange,
    "event.startDate": startDateFormatted,
    "event.endDate": endDateFormatted,

    // RSVP variables
    "rsvp.deadline": deadlineFormatted,
  }

  // Replace all variables in the HTML
  return html.replace(/\{\{(\w+\.\w+)\}\}/g, (match, variable) => {
    return replacements[variable] ?? ""
  })
}

/**
 * Get a default welcome message if none is configured
 */
export function getDefaultWelcomeMessage(locale: "en" | "ar"): string {
  if (locale === "ar") {
    // Use displayNameAr which falls back to fullName if not set
    return `<p>عزيزي/عزيزتي <strong>{{guest.displayNameAr}}</strong>، أنت مدعو/ة إلى <strong>{{event.name}}</strong></p>
<p><strong>المكان:</strong> {{event.venue}}</p>
<p><strong>التاريخ:</strong> {{event.dateRange}}</p>
<p style="color: var(--destructive)"><strong>الموعد النهائي للرد:</strong> {{rsvp.deadline}}</p>`
  }

  return `<p>Dear <strong>{{guest.fullName}}</strong>, you are invited to <strong>{{event.name}}</strong></p>
<p><strong>Venue:</strong> {{event.venue}}</p>
<p><strong>Date:</strong> {{event.dateRange}}</p>
<p style="color: var(--destructive)"><strong>RSVP Deadline:</strong> {{rsvp.deadline}}</p>`
}
