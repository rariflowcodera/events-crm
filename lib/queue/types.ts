import type { EmailTemplateType } from "@/lib/schemas"

/**
 * Individual email job - sends one email to one guest
 */
export interface SingleEmailJobData {
  type: "single"
  guestId: string
  eventId: string
  templateId: string
  emailType: EmailTemplateType
  bulkJobId: string
  language: "en" | "ar"
}

/**
 * Bulk email job - creates child jobs for each guest
 */
export interface BulkEmailJobData {
  type: "bulk"
  bulkJobId: string
  eventId: string
  templateId: string
  emailType: EmailTemplateType
  guestIds: string[]
  /**
   * Whether this job should be blocked if the event is in draft status.
   * True for the "Send Invitation" quick-send paths (sendToAll, sendBulkByCategory);
   * false for the manual "Send Email" template picker (sendBulk), which is never gated.
   */
  enforceDraftGuard?: boolean
}

export type EmailJobData = SingleEmailJobData | BulkEmailJobData

/**
 * Result returned after job completion
 */
export interface EmailJobResult {
  success: boolean
  guestId?: string
  emailLogId?: string
  error?: string
  /** Reason for failure (e.g., "suppressed" if email was blocked due to suppression list) */
  reason?: "suppressed" | "error"
}

/**
 * Progress update sent during job execution
 */
export interface EmailJobProgress {
  guestId: string
  status: "sent" | "failed" | "bounced"
  emailLogId?: string
  error?: string
  /** Reason for failure (e.g., "suppressed" if email was blocked due to suppression list) */
  reason?: "suppressed" | "error"
}
