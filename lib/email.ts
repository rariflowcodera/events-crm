import { SMTP_FROM_ENV, SMTP_HOST_ENV, SMTP_PASS_ENV, SMTP_PORT_ENV, SMTP_USER_ENV } from "@/env"
import nodemailer from "nodemailer"

// ============================================================================
// Email Sender Resolution Helpers
// ============================================================================

export type EmailSenderSettings = {
  fromEmail?: string
  fromName?: string
}

/**
 * Format an email sender string with optional display name
 * @example formatEmailSender("hello@example.com", "Company Name") => "Company Name <hello@example.com>"
 * @example formatEmailSender("hello@example.com") => "hello@example.com"
 */
export function formatEmailSender(email: string, name?: string): string {
  if (name && name.trim()) {
    return `${name.trim()} <${email}>`
  }
  return email
}

/**
 * Resolve email sender with fallback chain
 * Priority: explicitFrom > levelSettings > defaultFrom
 *
 * @param explicitFrom - Explicit from address (e.g., from template.fromEmail)
 * @param levelSettings - Level-specific settings (workspace or event)
 * @param defaultFrom - Default fallback (SMTP_FROM env variable)
 */
export function resolveEmailSender(options: {
  explicitFrom?: string
  levelSettings?: EmailSenderSettings | null
  defaultFrom: string
}): string {
  const { explicitFrom, levelSettings, defaultFrom } = options

  // 1. Explicit from (highest priority - e.g., template override)
  if (explicitFrom && explicitFrom.trim()) {
    return explicitFrom
  }

  // 2. Level-specific settings (workspace or event)
  if (levelSettings?.fromEmail && levelSettings.fromEmail.trim()) {
    return formatEmailSender(levelSettings.fromEmail, levelSettings.fromName)
  }

  // 3. Default env fallback
  return defaultFrom
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST_ENV,
  port: parseInt(SMTP_PORT_ENV, 10),
  secure: parseInt(SMTP_PORT_ENV, 10) === 465, // true for 465, false for other ports
  auth:
    SMTP_USER_ENV && SMTP_PASS_ENV
      ? {
          user: SMTP_USER_ENV,
          pass: SMTP_PASS_ENV,
        }
      : undefined,
})

export type SendEmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export type SendEmailResult = {
  data?: { id: string }
  error?: { message: string }
}

export const email = {
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { to, subject, html, text, from = SMTP_FROM_ENV } = options

      const info = await transporter.sendMail({
        from,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text,
      })

      return {
        data: { id: info.messageId },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send email"
      console.error("Email send error:", errorMessage)
      return {
        error: { message: errorMessage },
      }
    }
  },
}

// Alias for backwards compatibility with resend-style API
export const emails = {
  send: email.send,
}
