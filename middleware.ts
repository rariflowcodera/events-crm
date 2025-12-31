import { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

// Create the intl middleware for main app routing
const intlMiddleware = createIntlMiddleware(routing)

/**
 * Get list of main application domains from environment
 * Custom domains are any domain not in this list
 */
function getMainAppDomains(): string[] {
  const domains: string[] = []

  // Add domains from MAIN_APP_DOMAINS env var
  if (process.env.MAIN_APP_DOMAINS) {
    domains.push(
      ...process.env.MAIN_APP_DOMAINS.split(",").map((d) =>
        d.trim().toLowerCase()
      )
    )
  }

  // Add domain from NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
      domains.push(url.host.toLowerCase())
    } catch {
      // Invalid URL, skip
    }
  }

  // Always include localhost variants for development
  domains.push("localhost:3000", "localhost", "127.0.0.1:3000", "127.0.0.1")

  // Include common development domains
  if (process.env.NODE_ENV === "development") {
    domains.push("0.0.0.0:3000", "0.0.0.0")
  }

  // Remove duplicates
  return [...new Set(domains)]
}

/**
 * Check if a host is the main application domain
 */
function isMainAppDomain(host: string): boolean {
  const mainDomains = getMainAppDomains()
  const normalizedHost = host.toLowerCase().trim()

  return mainDomains.some(
    (domain) =>
      normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
  )
}

/**
 * Handle requests to custom domains
 * Rewrites RSVP requests to the custom domain RSVP handler
 */
function handleCustomDomain(
  request: NextRequest,
  host: string,
  pathname: string
): NextResponse {
  // Extract locale from query param (custom domains use ?lang=ar)
  const lang = request.nextUrl.searchParams.get("lang")
  const locale = lang === "ar" ? "ar" : "en"

  // Handle RSVP routes: /rsvp/{token}
  const rsvpMatch = pathname.match(/^\/rsvp\/([a-zA-Z0-9-]+)\/?$/)

  if (rsvpMatch) {
    const token = rsvpMatch[1]

    // Rewrite to custom domain RSVP handler
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/rsvp-custom/${token}`

    const response = NextResponse.rewrite(url)
    // Pass custom domain info to the page via headers
    response.headers.set("x-custom-domain", host)
    response.headers.set("x-locale", locale)
    return response
  }

  // Handle VAPP routes: /vapp/{token}
  const vappMatch = pathname.match(/^\/vapp\/([a-zA-Z0-9-]+)\/?$/)

  if (vappMatch) {
    const token = vappMatch[1]

    // Rewrite to custom domain VAPP handler
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/vapp-custom/${token}`

    const response = NextResponse.rewrite(url)
    response.headers.set("x-custom-domain", host)
    response.headers.set("x-locale", locale)
    return response
  }

  // Handle email preview routes: /email/{token}
  const emailMatch = pathname.match(/^\/email\/([a-zA-Z0-9-]+)\/?$/)

  if (emailMatch) {
    const token = emailMatch[1]

    // Rewrite to custom domain email handler
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/email-custom/${token}`

    const response = NextResponse.rewrite(url)
    response.headers.set("x-custom-domain", host)
    response.headers.set("x-locale", locale)
    return response
  }

  // Handle root path - show invalid domain page
  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/rsvp-custom/invalid`

    const response = NextResponse.rewrite(url)
    response.headers.set("x-custom-domain", host)
    return response
  }

  // Handle document routes: /d/{documentId}
  // These pass through to the route handler with custom domain header
  const docMatch = pathname.match(/^\/d\/([a-zA-Z0-9-]+)\/?$/)

  if (docMatch) {
    // Pass through to document route handler with custom domain info
    const response = NextResponse.next()
    response.headers.set("x-custom-domain", host)
    return response
  }

  // Handle other paths that might be RSVP-related
  // e.g., /expired, /thank-you
  const staticPages = ["expired", "thank-you", "invalid"]
  const pageMatch = pathname.match(/^\/([a-z-]+)\/?$/)

  if (pageMatch && staticPages.includes(pageMatch[1])) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/rsvp-custom/${pageMatch[1]}`

    const response = NextResponse.rewrite(url)
    response.headers.set("x-custom-domain", host)
    return response
  }

  // For any other path on custom domain, show invalid page
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}/rsvp-custom/invalid`

  const response = NextResponse.rewrite(url)
  response.headers.set("x-custom-domain", host)
  return response
}

export default async function middleware(
  request: NextRequest
): Promise<NextResponse> {
  const host = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // Check if this is a custom domain request
  const isCustom = !isMainAppDomain(host)

  if (isCustom) {
    // Custom domain: route to custom RSVP handler
    return handleCustomDomain(request, host, pathname)
  }

  // Main app domain: handle /d/ document routes without locale prefix
  if (pathname.match(/^\/d\/[a-zA-Z0-9-]+\/?$/)) {
    return NextResponse.next()
  }

  // Main app domain: use standard next-intl routing
  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/...)
  // - Next.js internals (/_next/...)
  // - Short form URLs (/f/...) - these bypass i18n to remain locale-agnostic
  // - Static files (files with extensions like .png, .jpg, etc.)
  // Note: /d/ document routes are included so custom domains can set headers
  matcher: ["/((?!api|_next|f/|.*\\..*).*)"],
}
