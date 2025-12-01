# Events Management CRM - Technical Foundation Evaluation

## Project Context

### Overview

We are building a scalable, enterprise-grade **Events Management CRM** designed for end-to-end event and guest management. The platform will serve multiple event organizers (B2B customers), each managing their own high-profile events with complex guest logistics.

### Target Use Cases

- Large-scale corporate events with VIP guest management
- Government/ministry-hosted conferences and summits
- Multi-day events requiring travel, accommodation, and itinerary coordination
- Events with tiered guest categories requiring differentiated service levels

### Key Requirements

| Requirement | Description |
|-------------|-------------|
| **Multi-Tenancy** | Multiple event customers operating independently on the platform |
| **Custom Domains** | Each customer gets their own subdomain or custom domain |
| **Saudi Arabia Hosting** | Data residency compliance - must be hosted in KSA or nearby region |
| **Guest Categorization** | Tiered guest categories (AAA, A, B, etc.) with different service levels |
| **RSVP Management** | Personalized, branded RSVP pages with pre-filled guest data |
| **Inventory Management** | Hotels, transportation, flights allocated by guest category |
| **Itinerary Distribution** | Multi-channel delivery (email, WhatsApp, mobile app) |
| **Team Workflows** | Approval processes, task assignments, activity logging |

### Technical Stack Decision

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL
- **ORM:** Drizzle
- **Hosting:** Self-hosted (AWS Bahrain/UAE or KSA data center) - NOT Vercel
- **Boilerplate:** The Boring Template (evaluated below)

---

## The Boring Template Evaluation

We evaluated [The Boring Template](https://docs.boringtemplate.com/) as a foundation for accelerating development. This document outlines which features provide value, which need modification, and which should be removed.

### Template Features Overview

The Boring Template includes:

- Next.js 15 App Router with tRPC, Server Actions, and API Route Handlers
- TailwindCSS with Shadcn UI components
- Better-auth for authentication (OAuth, magic links, session management)
- Drizzle ORM with PostgreSQL (Neon.tech)
- Workspace/Organizations with multi-tenant support
- Member invitations and role-based access control
- Stripe integration for payments
- AWS S3 for file storage
- Resend for email services
- Upstash Redis for rate limiting
- React Hook Form for form handling

---

## Feature-by-Feature Analysis

### ✅ KEEP - High Value for Events CRM

| Boring Template Feature | Why It's Valuable for Events CRM |
|------------------------|----------------------------------|
| **Authentication (Better-auth)** | Essential - OAuth, magic links, session management all needed |
| **Workspace/Organizations** | Maps directly to "Event Customer/Organizer" concept |
| **Member Invitations** | Customers need to invite their team members |
| **RBAC (Role-Based Access Control)** | Critical - event managers vs coordinators vs view-only staff |
| **Stripe Integration** | Required for billing customers for platform usage |
| **Drizzle ORM + PostgreSQL** | Our required stack, already configured |
| **tRPC Setup** | Type-safe APIs will accelerate development |
| **Email Service (Resend)** | Foundation for invitation/RSVP emails |
| **Rate Limiting (Upstash Redis)** | Protects RSVP endpoints from abuse |
| **AWS S3 File Storage** | Guest documents, itinerary PDFs, event assets |
| **React Hook Form** | RSVP forms need robust form handling |
| **TypeScript Configuration** | Keep the strict typing setup |
| **Environment Setup Patterns** | Well-structured env management |

### ⚠️ MODIFY - Useful Foundation But Needs Adaptation

| Feature | Current State | Required Changes |
|---------|---------------|------------------|
| **Workspace Model** | Generic "workspace" | Rename/extend to "Event" or "EventOrganization" with event-specific fields |
| **Member Roles** | Generic roles (admin, member) | Extend to: Event Director, Guest Relations Manager, Travel Coordinator, etc. |
| **Dashboard** | Generic CRUD dashboard | Rebuild UI around guest lists, RSVP status, inventory allocation |
| **Settings System** | User/workspace settings | Add event-specific settings: branding, email templates, service tiers |
| **Database Schema** | Base tables only | Extend massively for guests, RSVPs, inventory, itineraries |
| **Landing Pages** | Generic SaaS landing | Rebrand for events industry with different value propositions |
| **Pricing Plans** | Generic tiers | Model around: number of events, guest capacity, features enabled |

### ❌ REMOVE - Unnecessary or Will Replace

| Feature | Reason for Removal |
|---------|-------------------|
| **Items CRUD Example** | Demo code only - replace with Guests/Events |
| **Notifications System** | Will build event-specific notifications (RSVP reminders, itinerary updates) - generic system won't fit |
| **Feedback System** | Not relevant to core product |
| **User Onboarding Flow** | Generic onboarding won't match event setup wizard requirements |
| **Generic Landing Page Content** | Replace entirely with events-focused messaging |
| **Keyboard Shortcuts** | Nice-to-have, remove to reduce initial complexity |

---

## New Features to Build

The following represents the core Events domain that must be built from scratch:

### Guest Management
- Guest categories (AAA, A, B, etc.)
- Guest profiles (name, title, position, organization)
- Accompanying persons / personal assistants
- Bulk import from Excel/CSV
- Category-based service eligibility rules

### Invitation System
- Dynamic email templates by guest category
- Visual template builder UI
- Signature customization per inviting entity (Ministry, Federation, etc.)
- Mass send with personalization tokens
- Send tracking and analytics dashboard

### RSVP System
- Personalized RSVP pages with pre-filled guest data
- Category-adaptive question flows
- Public RSVP endpoints (no authentication required for guests)
- RSVP confirmation emails
- Real-time response tracking dashboard

### Inventory Management
- Hotels (names, room types, allocation pools)
- Transportation (car models, drivers, schedules)
- Flights (class categories, booking management)
- Auto-allocation engine by guest category
- Availability tracking and overbooking alerts

### Itinerary System
- Visual itinerary builder
- Guest-specific program choices and preferences
- PDF generation with branding
- WhatsApp delivery integration
- Mobile-friendly itinerary web view

### Multi-Tenant Custom Domains
- Subdomain routing middleware (Next.js)
- Custom domain management UI
- SSL certificate provisioning (Let's Encrypt + Caddy)
- Tenant-specific branding (logos, colors, fonts)

### Team Workflow
- Task assignments (Travel Agent actions, GRM approvals)
- Approval workflows with audit trail
- Activity logging for all guest interactions
- Document release management and versioning

---

## Codebase Distribution Estimate

```
Total Codebase Projection
──────────────────────────────────────────────────────
│ Boring Template (kept as-is)      │████████░░░░░░░│  ~25%
│ Boring Template (modified)        │████░░░░░░░░░░░│  ~15%
│ Events Domain (new build)         │████████████░░░│  ~50%
│ Multi-tenant/Domains (new build)  │██░░░░░░░░░░░░░│  ~10%
──────────────────────────────────────────────────────
```

---

## Development Time Savings from Boilerplate

The Boring Template provides approximately **4-6 weeks of development time saved** on infrastructure:

| Component | Estimated Time Saved |
|-----------|---------------------|
| Authentication system | 1-2 weeks |
| Stripe integration | 1 week |
| Workspace/RBAC foundation | 1 week |
| tRPC + Drizzle setup | 3-5 days |
| Email/S3/Redis integration | 3-5 days |

**Note:** 60-70% of the application (the Events domain) will be built from scratch regardless of boilerplate choice.

---

## Implementation Approach

### Phase 1: Fork and Strip

1. **Fork the Boring Template repository**

2. **Immediately delete:**
   ```
   /app/(dashboard)/items/          # Example CRUD - not needed
   /app/(dashboard)/notifications/  # Will rebuild event-specific
   /app/(dashboard)/feedback/       # Not needed
   ```

3. **Remove but keep structure:**
   - Landing page content (keep layout components)
   - Onboarding flow (will rebuild for events)

### Phase 2: Rename and Refactor

1. **Domain language alignment:**
   - "Workspace" → "Organization" or "EventClient"
   - Extend member roles for event-specific permissions

2. **Database schema extension:**
   - Keep base user/workspace/member tables
   - Add events domain tables (see schema design)

### Phase 3: Keep Untouched

The following should remain as-is from the template:

- Authentication system (Better-auth)
- Stripe integration and webhook handling
- tRPC router infrastructure
- Drizzle configuration and migrations setup
- Core utilities and hooks
- Rate limiting configuration
- S3 file upload utilities

### Phase 4: Build Events Domain

Using AI-driven development (Claude Code), build the events-specific features following the patterns established in the template:

- Follow existing tRPC router patterns for new routers
- Use established Drizzle schema patterns for new tables
- Maintain consistent error handling and validation approaches
- Extend existing UI component patterns with Shadcn

---

## Hosting Architecture (Saudi Arabia Compliant)

Since Vercel cannot be used (KSA data residency requirement), the self-hosted architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Events Platform Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Caddy/     │    │   Next.js    │    │  PostgreSQL  │      │
│  │   Nginx      │───▶│   App        │───▶│  (Primary)   │      │
│  │   (SSL +     │    │   (Docker)   │    │              │      │
│  │   Routing)   │    │              │    └──────────────┘      │
│  └──────────────┘    └──────────────┘           │              │
│         │                   │                    │              │
│         │                   ▼                    ▼              │
│         │            ┌──────────────┐    ┌──────────────┐      │
│         │            │    Redis     │    │   AWS S3     │      │
│         │            │  (Sessions/  │    │  (Files/     │      │
│         │            │   Cache)     │    │   Assets)    │      │
│         │            └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    DNS Configuration                    │    │
│  │  *.platform.com    →  A Record → Server IP             │    │
│  │  client.com (CNAME) →  platform.com                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Hosting: AWS Bahrain/UAE (now) or AWS KSA (2026)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Open Questions / Next Steps

1. **Database Schema Design** - Detailed schema for Events domain needed
2. **Multi-tenant Routing** - Finalize subdomain vs path-based routing approach
3. **Custom Domain SSL** - Choose between Caddy (automatic) or cert-manager
4. **WhatsApp Integration** - Evaluate Twilio vs WhatsApp Business API direct
5. **Mobile Strategy** - PWA vs React Native for guest-facing itinerary app
6. **Inventory Allocation Algorithm** - Rules engine design for auto-allocation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial evaluation document |
