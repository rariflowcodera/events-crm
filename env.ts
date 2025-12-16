// Database
export const DATABASE_URL_ENV = process.env.DATABASE_URL || ""
export const DATABASE_SSL_ENV = process.env.DATABASE_SSL || "false"

// Redis
export const REDIS_URL_ENV = process.env.REDIS_URL || ""

// SMTP Email
export const SMTP_HOST_ENV = process.env.SMTP_HOST || ""
export const SMTP_PORT_ENV = process.env.SMTP_PORT || "587"
export const SMTP_USER_ENV = process.env.SMTP_USER || ""
export const SMTP_PASS_ENV = process.env.SMTP_PASS || ""
export const SMTP_FROM_ENV = process.env.SMTP_FROM || ""

// OAuth
export const GOOGLE_CLIENT_ID_ENV = process.env.GOOGLE_CLIENT_ID || ""
export const GOOGLE_CLIENT_SECRET_ENV = process.env.GOOGLE_CLIENT_SECRET || ""
export const GITHUB_CLIENT_ID_ENV = process.env.GITHUB_CLIENT_ID || ""
export const GITHUB_CLIENT_SECRET_ENV = process.env.GITHUB_CLIENT_SECRET || ""

// Auth
export const BETTER_AUTH_URL_ENV = process.env.BETTER_AUTH_URL || ""
export const BETTER_AUTH_TRUSTED_ORIGINS_ENV =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS || ""

// Storage Provider
export const STORAGE_PROVIDER_ENV = process.env.STORAGE_PROVIDER || "local"

// AWS S3
export const AWS_ACCESS_KEY_ID_ENV = process.env.AWS_ACCESS_KEY_ID || ""
export const AWS_SECRET_ACCESS_KEY_ENV = process.env.AWS_SECRET_ACCESS_KEY || ""
export const AWS_REGION_ENV = process.env.AWS_REGION || ""
export const S3_UPLOAD_BUCKET_ENV = process.env.S3_UPLOAD_BUCKET || ""

// PUBLIC
export const NEXT_PUBLIC_APP_URL_ENV = process.env.NEXT_PUBLIC_APP_URL || ""

// Google Maps (client-side key for Places API)
export const NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_ENV =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

// Google Maps (server-side key for Static Maps API in emails)
export const GOOGLE_MAPS_API_KEY_ENV = process.env.GOOGLE_MAPS_API_KEY || ""

// OCI Email Delivery (for suppression list sync)
export const OCI_TENANCY_OCID_ENV = process.env.OCI_TENANCY_OCID || ""
export const OCI_USER_OCID_ENV = process.env.OCI_USER_OCID || ""
export const OCI_FINGERPRINT_ENV = process.env.OCI_FINGERPRINT || ""
export const OCI_PRIVATE_KEY_ENV = process.env.OCI_PRIVATE_KEY || ""
export const OCI_REGION_ENV = process.env.OCI_REGION || "me-jeddah-1"
export const OCI_COMPARTMENT_ID_ENV = process.env.OCI_COMPARTMENT_ID || ""
