import * as XLSX from "xlsx"
import { getCountryName } from "@/lib/data/countries"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface Guest {
  id: string
  serialNumber: string | null
  firstName: string
  lastName: string
  displayNameAr: string | null
  email: string | null
  phone: string | null
  country: string | null
  position: string | null
  entity: string | null
  status: string
  rsvpToken: string
  internalNotes: string | null
  category: GuestCategory
  createdAt: Date
  rsvpRespondedAt: Date | null
}

/**
 * Format a status value for display
 */
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Format a date for export (using UTC to ensure consistency)
 */
function formatDate(date: Date | null): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Export guests to Excel file
 */
export function exportGuestsToExcel(
  guests: Guest[],
  eventSlug: string,
  eventName: string
): void {
  const headers = [
    "Event",
    "Serial Number",
    "First Name",
    "Last Name",
    "Arabic Name",
    "Email",
    "Phone",
    "Position",
    "Entity",
    "Country",
    "Category",
    "Status",
    "RSVP Responded",
    "Notes",
    "Created",
  ]

  const rows = guests.map((guest) => [
    eventName,
    guest.serialNumber || "",
    guest.firstName,
    guest.lastName,
    guest.displayNameAr || "",
    guest.email || "",
    guest.phone || "",
    guest.position || "",
    guest.entity || "",
    guest.country ? getCountryName(guest.country) || guest.country : "",
    guest.category?.name || "",
    formatStatus(guest.status),
    formatDate(guest.rsvpRespondedAt),
    guest.internalNotes || "",
    formatDate(guest.createdAt),
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths for better readability
  ws["!cols"] = [
    { wch: 25 }, // Event
    { wch: 15 }, // Serial Number
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 25 }, // Arabic Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 20 }, // Position
    { wch: 20 }, // Entity
    { wch: 15 }, // Country
    { wch: 15 }, // Category
    { wch: 12 }, // Status
    { wch: 15 }, // RSVP Responded
    { wch: 30 }, // Notes
    { wch: 12 }, // Created
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Guests")

  // Generate filename with date
  const today = new Date().toISOString().split("T")[0]
  const filename = `${eventSlug}-guests-${today}.xlsx`

  XLSX.writeFile(wb, filename)
}
