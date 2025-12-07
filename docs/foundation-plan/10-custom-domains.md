# Events CRM Foundation - Custom Domain Support

> **Status**: Planning | **Created**: 2024-12-07

## Overview

This document outlines the implementation plan for custom domain support for event RSVP pages. Each event can have its own custom domain, allowing guests to access RSVP forms via branded URLs like `https://afc2027.sa/rsvp/{token}`.

### Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Domain Scope** | Per event (not per workspace) |
| **RSVP URL Format** | `https://custom-domain.sa/rsvp/{token}` |
| **Fallback** | Main app URLs continue to work |
| **Language Switching** | Query param `?lang=ar` on custom domains |
| **DNS Setup** | Customer CNAMEs to main app |
| **SSL** | Auto-provisioned via Caddy on-demand TLS |

### Example URLs

| Type | URL |
|------|-----|
| Main app | `https://events.yourdomain.sa/en/rsvp/abc123` |
| Custom domain | `https://afc2027.sa/rsvp/abc123` |
| Custom domain (Arabic) | `https://afc2027.sa/rsvp/abc123?lang=ar` |

---

## Architecture

### Current State

```
Guest Request: https://main-app.sa/en/rsvp/{token}
       │
       ▼
┌─────────────────┐
│   middleware.ts │  ← next-intl only
└────────┬────────┘
         ▼
┌─────────────────────────────────┐
│  app/[locale]/rsvp/[token]/     │
│         page.tsx                │
└─────────────────────────────────┘
```

### Target State

```
Guest Request
       │
       ├── https://main-app.sa/en/rsvp/{token}
       │              │
       │              ▼
       │   ┌─────────────────────────┐
       │   │ Standard next-intl      │
       │   │ routing                 │
       │   └────────────┬────────────┘
       │                ▼
       │   ┌─────────────────────────┐
       │   │ app/[locale]/rsvp/      │
       │   │    [token]/page.tsx     │
       │   └─────────────────────────┘
       │
       └── https://custom-domain.sa/rsvp/{token}
                      │
                      ▼
          ┌─────────────────────────┐
          │ middleware.ts           │
          │ - Detect custom domain  │
          │ - Extract locale from   │
          │   ?lang= query param    │
          │ - Set x-custom-domain   │
          │   header                │
          └────────────┬────────────┘
                       ▼
          ┌─────────────────────────┐
          │ Rewrite to:             │
          │ /[locale]/rsvp-custom/  │
          │    [token]/page.tsx     │
          └────────────┬────────────┘
                       ▼
          ┌─────────────────────────┐
          │ Domain validation via   │
          │ lib/domain.ts           │
          │ (Redis cached lookup)   │
          └────────────┬────────────┘
                       ▼
          ┌─────────────────────────┐
          │ Render RSVP page with   │
          │ custom domain context   │
          └─────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema Updates

**File:** `server/db/schemas/event.ts`

The `customDomain` field already exists. Add verification fields:

```typescript
// Existing field
customDomain: text("custom_domain").unique(),

// New fields to add
customDomainVerified: boolean("custom_domain_verified").default(false),
customDomainVerifiedAt: timestamp("custom_domain_verified_at", { mode: "date" }),
customDomainVerificationToken: text("custom_domain_verification_token"),
```

Add index for domain lookups:

```typescript
// In table indexes
index("event_custom_domain_idx").on(table.customDomain),
```

**Migration:**
```bash
npm run db:generate
npm run db:migrate
```

---

### Phase 2: Domain Lookup Service

**New File:** `lib/domain.ts`

```typescript
import { redis } from "@/lib/redis"
import { db } from "@/server/db/config/database"
import { events } from "@/server/db/schemas"
import { eq, and } from "drizzle-orm"

const DOMAIN_CACHE_PREFIX = "domain:"
const DOMAIN_CACHE_TTL = 300 // 5 minutes

export interface DomainLookupResult {
  eventId: string
  workspaceId: string
  eventName: string
  customDomain: string
  verified: boolean
}

/**
 * Look up event by custom domain with Redis caching
 */
export async function getEventByCustomDomain(
  domain: string
): Promise<DomainLookupResult | null> {
  const normalizedDomain = domain.toLowerCase().trim()
  const cacheKey = `${DOMAIN_CACHE_PREFIX}${normalizedDomain}`

  // Try cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed === null) return null // Cached "not found"
      return parsed as DomainLookupResult
    }
  } catch (error) {
    console.error("Redis cache read error:", error)
  }

  // Query database
  const event = await db.query.events.findFirst({
    where: and(
      eq(events.customDomain, normalizedDomain),
      eq(events.customDomainVerified, true)
    ),
    columns: {
      id: true,
      workspaceId: true,
      name: true,
      customDomain: true,
      customDomainVerified: true,
    },
  })

  const result: DomainLookupResult | null = event
    ? {
        eventId: event.id,
        workspaceId: event.workspaceId,
        eventName: event.name,
        customDomain: event.customDomain!,
        verified: event.customDomainVerified ?? false,
      }
    : null

  // Cache result (including null)
  try {
    await redis.setex(cacheKey, DOMAIN_CACHE_TTL, JSON.stringify(result))
  } catch (error) {
    console.error("Redis cache write error:", error)
  }

  return result
}

/**
 * Invalidate domain cache when domain is updated
 */
export async function invalidateDomainCache(domain: string): Promise<void> {
  const normalizedDomain = domain.toLowerCase().trim()
  const cacheKey = `${DOMAIN_CACHE_PREFIX}${normalizedDomain}`
  try {
    await redis.del(cacheKey)
  } catch (error) {
    console.error("Redis cache invalidation error:", error)
  }
}

/**
 * Check if a host is the main application domain
 */
export function isMainAppDomain(host: string): boolean {
  const mainDomains = process.env.MAIN_APP_DOMAINS?.split(",") || []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (appUrl) {
    mainDomains.push(new URL(appUrl).host)
  }

  return mainDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  )
}
```

---

### Phase 3: Middleware Updates

**File:** `middleware.ts`

Replace current middleware:

```typescript
import { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

// Main app domains (custom domains are anything else)
function getMainAppDomains(): string[] {
  const domains: string[] = []

  if (process.env.MAIN_APP_DOMAINS) {
    domains.push(...process.env.MAIN_APP_DOMAINS.split(",").map(d => d.trim()))
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      domains.push(new URL(process.env.NEXT_PUBLIC_APP_URL).host)
    } catch {}
  }

  // Always include localhost for development
  domains.push("localhost:3000", "localhost")

  return domains
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname
  const mainAppDomains = getMainAppDomains()

  // Check if this is a custom domain request
  const isCustomDomain = !mainAppDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  )

  if (isCustomDomain) {
    return handleCustomDomain(request, host, pathname)
  }

  // Main app: use standard next-intl routing
  return intlMiddleware(request)
}

async function handleCustomDomain(
  request: NextRequest,
  host: string,
  pathname: string
): Promise<NextResponse> {
  // Extract locale from query param
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
    response.headers.set("x-custom-domain", host)
    response.headers.set("x-locale", locale)
    return response
  }

  // Root path on custom domain - show invalid page
  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/rsvp-custom/invalid`

    const response = NextResponse.rewrite(url)
    response.headers.set("x-custom-domain", host)
    return response
  }

  // Static files, API routes - pass through
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
```

**Key Design Decision:** No database calls in middleware. Domain validation happens in the page component to avoid Edge Runtime limitations.

---

### Phase 4: Custom Domain RSVP Routes

**New File:** `app/[locale]/rsvp-custom/[token]/page.tsx`

```typescript
import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests, events } from "@/server/db/schemas"
import { RsvpPage } from "@/components/rsvp/rsvp-page"
import { getEventByCustomDomain } from "@/lib/domain"

interface Props {
  params: Promise<{ token: string; locale: string }>
}

export default async function RsvpCustomPage({ params }: Props) {
  const { token, locale } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    // Not via custom domain - redirect to standard RSVP
    redirect(`/${locale}/rsvp/${token}`)
  }

  // Validate domain
  const domainData = await getEventByCustomDomain(customDomain)

  if (!domainData || !domainData.verified) {
    notFound()
  }

  // Verify token belongs to this event
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      eq(guests.eventId, domainData.eventId)
    ),
    columns: { id: true, rsvpTokenExpiresAt: true },
  })

  if (!guest) {
    notFound()
  }

  // Check expiration
  if (guest.rsvpTokenExpiresAt && guest.rsvpTokenExpiresAt < new Date()) {
    redirect(`/${locale}/rsvp-custom/expired`)
  }

  return <RsvpPage token={token} locale={locale} customDomain={customDomain} />
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return { title: "RSVP", robots: "noindex, nofollow" }
  }

  const domainData = await getEventByCustomDomain(customDomain)

  return {
    title: `RSVP - ${domainData?.eventName || "Event"}`,
    description: "Confirm your attendance",
    robots: "noindex, nofollow",
  }
}
```

**New File:** `app/[locale]/rsvp-custom/expired/page.tsx`
- Copy from `app/[locale]/rsvp/expired/page.tsx`
- Adjust for custom domain context

**New File:** `app/[locale]/rsvp-custom/invalid/page.tsx`
- Error page for unverified/unconfigured domains

---

### Phase 5: Update RSVP Component

**File:** `components/rsvp/rsvp-page.tsx`

Add custom domain support:

```typescript
interface RsvpPageProps {
  token: string
  locale: string
  customDomain?: string  // NEW
}

export function RsvpPage({ token, locale, customDomain }: RsvpPageProps) {
  // ...existing code...

  // Update language toggle
  const handleLanguageToggle = () => {
    if (customDomain) {
      // Use query param for custom domains
      const newLocale = displayLocale === "en" ? "ar" : "en"
      window.location.href = `?lang=${newLocale}`
    } else {
      // Existing behavior for main app
      setDisplayLocale((prev) => (prev === "en" ? "ar" : "en"))
    }
  }

  // ...rest of component...
}
```

---

### Phase 6: Admin UI for Domain Management

**New File:** `components/events/event-custom-domain-card.tsx`

Features:
- Input field to add custom domain
- Domain format validation
- Verification status badge (Pending/Verified)
- DNS configuration instructions:
  - CNAME record: `custom-domain.sa → main-app.sa`
  - TXT record: `_events-verify.custom-domain.sa → {verification-token}`
- Verify button (checks DNS)
- Remove domain button

**Update:** `components/events/event-settings-tab.tsx`

Add the custom domain card to event settings.

---

### Phase 7: tRPC Router Updates

**File:** `trpc/routers/events.ts`

Add procedures:

#### `updateCustomDomain`

```typescript
updateCustomDomain: protectedProcedure
  .input(z.object({
    eventId: z.string().uuid(),
    customDomain: z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Check permissions
    // 2. Check domain not already in use
    // 3. Invalidate old domain cache if changing
    // 4. Generate verification token
    // 5. Update event with domain + token
    // 6. Return instructions
  })
```

#### `verifyCustomDomain`

```typescript
verifyCustomDomain: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Get event and domain
    // 2. DNS lookup for CNAME record → must point to main app
    // 3. DNS lookup for TXT record → must match verification token
    // 4. Mark as verified
    // 5. Invalidate cache
  })
```

#### `removeCustomDomain`

```typescript
removeCustomDomain: protectedProcedure
  .input(z.object({ eventId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Check permissions
    // 2. Invalidate cache
    // 3. Clear domain fields
  })
```

**File:** `trpc/hooks/events-hooks.ts`

Add hooks:
- `useUpdateEventCustomDomain()`
- `useVerifyEventCustomDomain()`
- `useRemoveEventCustomDomain()`

---

### Phase 8: Caddy SSL Verification Endpoint

**New File:** `app/api/domain/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getEventByCustomDomain } from "@/lib/domain"

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")

  if (!domain) {
    return NextResponse.json({ error: "Domain required" }, { status: 400 })
  }

  const event = await getEventByCustomDomain(domain)

  if (event?.verified) {
    return NextResponse.json({ allowed: true }, { status: 200 })
  }

  return NextResponse.json({ allowed: false }, { status: 404 })
}
```

This endpoint is called by Caddy's on-demand TLS to verify if a domain should receive an SSL certificate.

---

### Phase 9: Environment Configuration

**File:** `.env.example`

```env
# Custom Domains
# Comma-separated list of main app domains
MAIN_APP_DOMAINS=events-crm.sa,www.events-crm.sa

# Domain lookup cache TTL in seconds (default: 300)
DOMAIN_CACHE_TTL=300
```

---

## Infrastructure Setup (v2.sa / Jelastic PaaS)

Your current hosting environment:
- **Platform**: v2.sa PaaS (Jelastic-based)
- **Environment**: `env-4098784.paas5.v2.sa`
- **Load Balancer**: NGINX 1.28.0
- **Application**: Node.js 25.2.1 (2 nodes)
- **Current SSL**: Built-in SSL via Shared Load Balancer (SLB)

### Step 1: Enable Public IP on Load Balancer

**Why Required**: Custom domains need to point directly to your environment. The Shared Load Balancer only works for `*.paas5.v2.sa` domains.

**In v2.sa Dashboard:**
1. Click on your **Load Balancer** node (Node ID: 35136)
2. Click **Settings** (gear icon)
3. Go to **Endpoints** or **Public IP**
4. Enable **Public IP**
5. Note the assigned IP address (e.g., `185.x.x.x`)

**Cost**: ~$3-5/month for Public IP (verify with v2.sa)

### Step 2: Install Let's Encrypt Add-on

**In v2.sa Dashboard:**
1. Click on your **Load Balancer** node
2. Go to **Add-ons** marketplace
3. Search for **Let's Encrypt Free SSL**
4. Install the add-on
5. Configure it to handle multiple domains

**Let's Encrypt Configuration:**
- Enable **Auto-renewal**
- Set to accept custom domains dynamically (we'll configure via API)

### Step 3: NGINX Configuration

The NGINX load balancer needs to accept requests for any hostname and pass the `Host` header to your Node.js app.

**Access NGINX config:**
1. Click on Load Balancer node
2. Click **Config** (file icon)
3. Navigate to `/etc/nginx/nginx.conf` or `/etc/nginx/conf.d/`

**Add/Update server block:**

```nginx
# /etc/nginx/conf.d/custom-domains.conf

# Upstream for Node.js app servers
upstream nodejs_app {
    server <node1-internal-ip>:3000;
    server <node2-internal-ip>:3000;
    # IPs shown in your v2.sa dashboard
}

# Server block for custom domains
server {
    listen 80;
    listen 443 ssl http2;

    # Accept ANY hostname (custom domains)
    server_name _;

    # SSL certificates managed by Let's Encrypt add-on
    # The add-on typically places certs here:
    ssl_certificate /var/lib/jelastic/SSL/jelastic.chain;
    ssl_certificate_key /var/lib/jelastic/SSL/jelastic.key;

    # Or for Let's Encrypt with multiple domains:
    # ssl_certificate /etc/letsencrypt/live/$ssl_server_name/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$ssl_server_name/privkey.pem;

    # Proxy settings
    location / {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;

        # CRITICAL: Pass the original hostname to Node.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Let's Encrypt Multi-Domain Setup

For dynamic custom domains, you have two approaches:

#### Option A: Manual Domain Addition (Simpler)
Each time a customer adds a custom domain:
1. Admin adds domain in v2.sa Let's Encrypt add-on
2. Wait for certificate generation (~1-2 minutes)
3. Mark domain as verified in app

#### Option B: API-Based Automation (Advanced)
Use v2.sa's API to automatically provision certificates:
```bash
# v2.sa API call to add domain to Let's Encrypt
curl -X POST "https://api.v2.sa/1.0/environment/binder/rest/adddomain" \
  -d "envName=env-4098784" \
  -d "session=<your-session>" \
  -d "domain=custom-event.sa"
```

### Step 5: Customer DNS Configuration

Customers need to add these DNS records:

| Type | Name | Value |
|------|------|-------|
| **A** | `@` or subdomain | `<Your Public IP>` |
| **TXT** | `_events-verify` | `{verification-token}` |

**Example for customer:**
```
Type: A
Name: rsvp (for rsvp.theirevent.com)
Value: 185.x.x.x (your Public IP)

Type: TXT
Name: _events-verify.rsvp
Value: abc123xyz789 (from your app)
```

### Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| Public IP | ~$3-5/month | Required for custom domains |
| Let's Encrypt | Free | Included with add-on |
| NGINX Config | Free | Just configuration changes |
| **Total Additional** | **~$3-5/month** | One-time increase |

### Alternative: Cloudflare Proxy (No Public IP Needed)

If you want to avoid the Public IP cost, you can use Cloudflare:

1. Customer adds domain to Cloudflare (free tier)
2. Cloudflare proxies traffic to your `env-4098784.paas5.v2.sa` domain
3. SSL is handled by Cloudflare (free)
4. Your app still detects the custom domain via `X-Forwarded-Host` header

**Pros**: No Public IP cost, DDoS protection, caching
**Cons**: Requires customer to use Cloudflare, adds complexity

---

## Files Summary

### Files to Modify

| File | Changes |
|------|---------|
| `server/db/schemas/event.ts` | Add verification fields + index |
| `middleware.ts` | Custom domain detection + rewrite |
| `components/rsvp/rsvp-page.tsx` | Add customDomain prop |
| `trpc/routers/events.ts` | Add 3 domain procedures |
| `trpc/hooks/events-hooks.ts` | Add 3 hooks |
| `components/events/event-settings-tab.tsx` | Add domain card |
| `.env.example` | Add domain env vars |

### Files to Create

| File | Purpose |
|------|---------|
| `lib/domain.ts` | Domain lookup + Redis caching |
| `app/[locale]/rsvp-custom/[token]/page.tsx` | Custom domain RSVP page |
| `app/[locale]/rsvp-custom/expired/page.tsx` | Expired token page |
| `app/[locale]/rsvp-custom/invalid/page.tsx` | Invalid domain page |
| `components/events/event-custom-domain-card.tsx` | Admin UI |
| `app/api/domain/verify/route.ts` | Caddy verification endpoint |

---

## Security Considerations

1. **Domain Hijacking Prevention**: TXT record verification ensures only domain owners can configure custom domains.

2. **Token Scoping**: Custom domain RSVP pages verify that the RSVP token belongs to the specific event for that domain.

3. **Cache Invalidation**: Domain cache is invalidated on any domain update to prevent stale routing.

4. **No Auth on RSVP**: RSVP pages remain public. Custom domains don't need to be added to Better-Auth trusted origins.

---

## Testing Checklist

### Main App (Unchanged Behavior)
- [ ] `https://main-app.sa/en/rsvp/{token}` works
- [ ] Language switching via URL path works
- [ ] Expired tokens redirect correctly

### Custom Domain Setup
- [ ] Add custom domain in event settings
- [ ] Verification token is generated
- [ ] DNS instructions are displayed
- [ ] Verification fails with helpful message when DNS not configured
- [ ] Verification succeeds when DNS is correct
- [ ] Domain removal works

### Custom Domain RSVP
- [ ] `https://custom-domain.sa/rsvp/{token}` works
- [ ] Language switching via `?lang=ar` works
- [ ] Token for different event returns 404
- [ ] Unverified domain returns 404
- [ ] Expired token redirects correctly

### Caching
- [ ] Domain lookup is cached in Redis
- [ ] Cache invalidates on domain update
- [ ] Cache invalidates on domain removal

---

## Related Documents

- [00-overview.md](./00-overview.md) - Master plan
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [04-routers-rsvp.md](./04-routers-rsvp.md) - tRPC routers & RSVP
