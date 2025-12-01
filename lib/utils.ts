/** Encryption and dycryption */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { NEXT_PUBLIC_APP_URL_ENV } from "@/env"
import { clsx, type ClassValue } from "clsx"
import { differenceInMinutes } from "date-fns"
import { twMerge } from "tailwind-merge"

import {
  InvitationStatusTypes,
  InvitationStatusTypesType,
  PlaceholderImageType,
} from "@/types/types"
import { configuration } from "@/lib/config"
import { AUTH_COOKIES, ROOT_PATH } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Colors are names (green) or 6 digit hex codes without # prefix (eae0e1)
 */
export const placeholderImageUrl = ({
  backgroundColor = "eae0e1",
  textColor = "691837",
  textRows = ["placeholder", "image"],
}: PlaceholderImageType) =>
  `https://placehold.co/600x400/${backgroundColor}/${textColor}?text=${textRows.join("%5Cn")}`

/**
 * @name isRouteActive
 * @description A function to check if a route is active. This is used to
 * highlight the active link in the navigation.
 * @param targetLink - The link to check against
 * @param currentRoute - the current route
 * @param depth - how far down should segments be matched?
 */

export function isRouteActive(targetLink: string, currentRoute: string, depth: number) {
  // we remove any eventual query param from the route's URL
  const currentRoutePath = currentRoute.split("?")[0]

  if (!isRoot(currentRoutePath) && isRoot(targetLink)) {
    return false
  }

  if (!currentRoutePath.includes(targetLink)) {
    return false
  }

  const isSameRoute = targetLink === currentRoutePath

  if (isSameRoute) {
    return true
  }

  return hasMatchingSegments(targetLink, currentRoutePath, depth)
}

function splitIntoSegments(href: string) {
  return href.split("/").filter(Boolean)
}

function hasMatchingSegments(targetLink: string, currentRoute: string, depth: number) {
  const segments = splitIntoSegments(targetLink)
  const matchingSegments = numberOfMatchingSegments(currentRoute, segments)

  // how far down should segments be matched?
  // - if depth = 1 => only highlight the links of the immediate parent
  // - if depth = 2 => for url = /settings match /settings/organization/members
  return matchingSegments > segments.length - depth
}

function numberOfMatchingSegments(href: string, segments: string[]) {
  let count = 0

  for (const segment of splitIntoSegments(href)) {
    // for as long as the segments match, keep counting + 1
    if (segments.includes(segment)) {
      count += 1
    } else {
      return count
    }
  }

  return count
}

function isRoot(path: string) {
  return path === ROOT_PATH
}

export const documentTitle = (pageTitle: string) => pageTitle + " | " + configuration.site.name

// Define encryption settings
const algorithm = "aes-256-ctr"
const iv = randomBytes(16) // Initialization vector
const encryptionKey = process.env.ENCRYPTION_KEY as string // 32-byte key (for AES-256)

// Encrypt function
export function encrypt(text: string): string {
  const cipher = createCipheriv(algorithm, Buffer.from(encryptionKey), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`
}

// Decrypt function
export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":")
  const decipher = createDecipheriv(
    algorithm,
    Buffer.from(encryptionKey),
    Buffer.from(ivHex, "hex")
  )
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ])
  return decrypted.toString()
}

/**
 *
 * Regex for workspace slug
 */
export const slugRegex = /^[a-zA-Z0-9-]+$/

/**
 *
 * @param str
 * @returns
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Slugify a string
 */

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
}

export function absoluteUrl(path: string) {
  return `${NEXT_PUBLIC_APP_URL_ENV}${path}`
}


/**
 * Clear auth cookies
 * @param response - The response to clear the cookies from
 * @returns The response with the cookies cleared
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  Object.values(AUTH_COOKIES).forEach((cookie) => {
    response.cookies.set(cookie, "", {
      expires: new Date(0),
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    })
  })
  return response
}

/**
 * Check if a user is online (active within the last 4 minutes)
 * @param lastActiveDate - The last active date of the user
 * @returns True if the user is online, false otherwise
 */
export const isUserOnline = (lastActiveDate: Date | null | undefined): boolean => {
  if (!lastActiveDate) return false

  const now = new Date()
  const minutesSinceLastActive = differenceInMinutes(now, lastActiveDate)

  // Consider user online if active within the last 4 minutes
  return minutesSinceLastActive < 4
}

/**
 * Get the status of an invitation
 * @param status - The status of the invitation
 * @returns The status of the invitation
 */
export function getInvitationStatus(status: InvitationStatusTypesType) {
  switch (status) {
    case InvitationStatusTypes.PENDING:
      return "Pending"
    case InvitationStatusTypes.ACCEPTED:
      return "Accepted"
    case InvitationStatusTypes.REJECTED:
      return "Rejected"
    default:
      return "Pending"
  }
}

interface UserAgentInfo {
  os: string
  browser: string
  deviceType: "mobile" | "desktop" | "tablet" | "unknown"
}

/**
 * Parse user agent string to get OS and browser information
 * @param userAgent - The user agent string to parse
 * @returns Object containing OS, browser, and device type information
 */
export function parseUserAgent(userAgent: string): UserAgentInfo {
  // Default values
  let os = "Unknown"
  let browser = "Unknown"
  let deviceType: UserAgentInfo["deviceType"] = "unknown"

  // Device type detection
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent)) {
    deviceType = "tablet"
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      userAgent
    )
  ) {
    deviceType = "mobile"
  } else {
    deviceType = "desktop"
  }

  // OS detection
  if (userAgent.includes("Windows")) {
    os = "Windows"
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS"
  } else if (userAgent.includes("iPhone")) {
    os = "iOS"
  } else if (userAgent.includes("iPad")) {
    os = "iPadOS"
  } else if (userAgent.includes("Android")) {
    os = "Android"
  } else if (userAgent.includes("Linux")) {
    os = "Linux"
  }

  // Browser detection
  if (userAgent.includes("Firefox/")) {
    browser = "Firefox"
  } else if (userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) {
    browser = "Chrome"
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    browser = "Safari"
  } else if (userAgent.includes("Edge/") || userAgent.includes("Edg/")) {
    browser = "Edge"
  } else if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) {
    browser = "Opera"
  }

  return { os, browser, deviceType }
}
