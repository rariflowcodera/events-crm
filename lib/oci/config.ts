import * as oci from "oci-sdk"
import {
  OCI_TENANCY_OCID_ENV,
  OCI_USER_OCID_ENV,
  OCI_FINGERPRINT_ENV,
  OCI_PRIVATE_KEY_ENV,
  OCI_REGION_ENV,
} from "@/env"

let provider: oci.common.SimpleAuthenticationDetailsProvider | null = null

/**
 * Get the OCI authentication provider
 * Uses simple authentication with environment variables
 */
export function getOciAuthProvider(): oci.common.SimpleAuthenticationDetailsProvider {
  if (provider) return provider

  provider = new oci.common.SimpleAuthenticationDetailsProvider(
    OCI_TENANCY_OCID_ENV,
    OCI_USER_OCID_ENV,
    OCI_FINGERPRINT_ENV,
    OCI_PRIVATE_KEY_ENV,
    null, // passphrase
    oci.common.Region.fromRegionId(OCI_REGION_ENV)
  )

  return provider
}

/**
 * Check if OCI is properly configured
 */
export function isOciConfigured(): boolean {
  return !!(
    OCI_TENANCY_OCID_ENV &&
    OCI_USER_OCID_ENV &&
    OCI_FINGERPRINT_ENV &&
    OCI_PRIVATE_KEY_ENV &&
    OCI_REGION_ENV
  )
}
