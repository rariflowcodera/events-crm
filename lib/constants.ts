/** Overall app name */

export const EMAIL_ALREADY_IN_USE = "Email already in use with different provider!"

export const BUCKET_NAME = "tsker"

/** Auth cookies */
export const AUTH_COOKIES = {
  SESSION: "next-auth.session-token",
  CSRF: "next-auth.csrf-token",
  SECURE_SESSION: "__Secure-next-auth.session-token",
  SECURE_CSRF: "__Host-next-auth.csrf-token",
} as const

/** Rate limit for 1 minute using string */
export const RATE_LIMIT_1_MINUTE = "60s"

export const RATE_LIMIT_5 = 5
export const RATE_LIMIT_10 = 10
export const RATE_LIMIT_20 = 20
/**
 * Global error message
 *
 */
export const GLOBAL_ERROR_MESSAGE = "An error occurred. Please try again."

/** Logo of the application */
export const LOGO =
  "https://res.cloudinary.com/dowiygzq3/image/upload/v1701434821/Tsker_logo_jpco7y.png"

export const RIGHT_ARROW =
  "https://res.cloudinary.com/dowiygzq3/image/upload/v1701435135/Right_arrow_ckzhbi.png"

export const ROOT_PATH = "/"
