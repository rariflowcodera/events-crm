/**
 * All possible guest statuses (matches guestStatusEnum in server/db/schemas/guest.ts)
 */
export type GuestStatus =
  | "pending"
  | "invited"
  | "reminded"
  | "viewed"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show"

/**
 * Response statuses are "final" statuses that should not be overwritten
 * by earlier-stage statuses (invited, reminded, viewed).
 *
 * Once a guest has responded to an RSVP or been marked with a post-event status,
 * these should be protected from being reset.
 */
export const RESPONSE_STATUSES: GuestStatus[] = [
  "confirmed",
  "declined",
  "maybe",
  "attended",
  "no_show",
  "cancelled",
]

/**
 * Check if a status is a "response status" that should be protected
 * from being overwritten by pre-response statuses.
 */
export function isResponseStatus(status: string): boolean {
  return RESPONSE_STATUSES.includes(status as GuestStatus)
}

/**
 * Determine what status to set when sending an email.
 * Returns null if the status should not be changed (guest already responded).
 *
 * @param currentStatus - The guest's current status
 * @param templateType - The email template type ("invitation" or "reminder")
 * @returns The new status to set, or null if status should be preserved
 */
export function getStatusOnEmailSend(
  currentStatus: string,
  templateType: string
): GuestStatus | null {
  // Don't overwrite response statuses
  if (isResponseStatus(currentStatus)) {
    return null
  }

  // Set status based on email template type
  return templateType === "reminder" ? "reminded" : "invited"
}
