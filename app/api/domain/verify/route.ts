import { NextRequest, NextResponse } from "next/server"
import { getEventByCustomDomain } from "@/lib/domain"

/**
 * Domain verification endpoint for reverse proxy SSL certificate provisioning
 *
 * This endpoint is called by reverse proxies (Caddy, nginx with Let's Encrypt)
 * to verify if a custom domain should be issued an SSL certificate.
 *
 * Usage with Caddy on-demand TLS:
 * ```caddyfile
 * {
 *   on_demand_tls {
 *     ask http://localhost:3000/api/domain/verify
 *   }
 * }
 * ```
 *
 * Returns:
 * - 200 OK: Domain is verified and should receive SSL
 * - 404 Not Found: Domain is not configured or not verified
 * - 400 Bad Request: Missing domain parameter
 */
export async function GET(request: NextRequest) {
  // Get domain from query parameter
  const domain = request.nextUrl.searchParams.get("domain")

  if (!domain) {
    return NextResponse.json(
      { error: "Domain parameter is required", allowed: false },
      { status: 400 }
    )
  }

  try {
    // Look up the domain in our database
    const event = await getEventByCustomDomain(domain)

    if (event && event.verified) {
      // Domain is verified - allow SSL certificate
      return NextResponse.json(
        {
          allowed: true,
          eventId: event.eventId,
          eventName: event.eventName,
        },
        { status: 200 }
      )
    }

    // Domain not found or not verified
    return NextResponse.json(
      { allowed: false, error: "Domain not verified" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Domain verification error:", error)
    return NextResponse.json(
      { allowed: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
