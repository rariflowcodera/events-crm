import * as oci from "oci-sdk"
import { getOciAuthProvider, isOciConfigured } from "./config"
import { OCI_COMPARTMENT_ID_ENV } from "@/env"

let emailClient: oci.email.EmailClient | null = null

/**
 * Get the OCI Email Delivery client
 */
export function getEmailClient(): oci.email.EmailClient {
  if (!isOciConfigured()) {
    throw new Error("OCI Email Delivery is not configured")
  }

  if (emailClient) return emailClient

  emailClient = new oci.email.EmailClient({
    authenticationDetailsProvider: getOciAuthProvider(),
  })

  return emailClient
}

export interface OciSuppression {
  id: string
  emailAddress: string
  reason: "UNKNOWN" | "HARDBOUNCE" | "SOFTBOUNCE" | "MANUAL" | "COMPLAINT" | "UNSUBSCRIBE"
  errorDetail?: string
  errorSource?: string
  timeCreated: Date
}

/**
 * Fetch all suppressions from OCI (paginated)
 */
export async function listAllSuppressions(): Promise<OciSuppression[]> {
  const client = getEmailClient()
  const suppressions: OciSuppression[] = []
  let page: string | undefined

  do {
    const response = await client.listSuppressions({
      compartmentId: OCI_COMPARTMENT_ID_ENV,
      page,
      limit: 100,
    })

    for (const item of response.items || []) {
      suppressions.push({
        id: item.id!,
        emailAddress: item.emailAddress!.toLowerCase(),
        reason: (item.reason as OciSuppression["reason"]) || "UNKNOWN",
        // Note: errorDetail and errorSource are not available on SuppressionSummary (list response)
        // They're only available when fetching individual suppression details
        errorDetail: undefined,
        errorSource: undefined,
        timeCreated: item.timeCreated!,
      })
    }

    page = response.opcNextPage
  } while (page)

  return suppressions
}

/**
 * Remove an email from the suppression list
 */
export async function deleteSuppression(suppressionId: string): Promise<void> {
  const client = getEmailClient()
  await client.deleteSuppression({ suppressionId })
}

/**
 * Add an email to the suppression list manually
 */
export async function createSuppression(emailAddress: string): Promise<OciSuppression> {
  const client = getEmailClient()
  const response = await client.createSuppression({
    createSuppressionDetails: {
      compartmentId: OCI_COMPARTMENT_ID_ENV,
      emailAddress: emailAddress.toLowerCase(),
    },
  })

  return {
    id: response.suppression.id!,
    emailAddress: response.suppression.emailAddress!.toLowerCase(),
    reason: (response.suppression.reason as OciSuppression["reason"]) || "MANUAL",
    errorDetail: response.suppression.errorDetail,
    errorSource: response.suppression.errorSource,
    timeCreated: response.suppression.timeCreated!,
  }
}

// Re-export for convenience
export { isOciConfigured } from "./config"
