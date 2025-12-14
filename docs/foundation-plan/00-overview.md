# Events CRM Foundation - Master Plan

> **Status**: Planning Complete | **Created**: 2024-11-29

## Project Context

We are transforming "The Boring Template" (Next.js 15 SaaS boilerplate) into an **Events Management CRM** for managing high-profile events with complex guest logistics. The platform will serve multiple event organizers (B2B) managing corporate events, government conferences, and multi-day summits.

### Key Constraints

| Constraint | Requirement |
|------------|-------------|
| **Data Residency** | All data hosted in Saudi Arabia (KSA compliance) |
| **Language Support** | Full Arabic/English bilingual from day one |
| **Self-Hosting** | No Vercel - must run on KSA infrastructure |
| **Scalability** | Architecture supports AFC Asian Cup 2027 scale |

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Email Service | Generic SMTP (nodemailer) | Works with any KSA-compliant SMTP provider |
| Database | Self-hosted PostgreSQL | Standard pg driver, no cloud lock-in |
| Cache/Rate Limit | Self-hosted Redis | ioredis, deployable anywhere |
| i18n | next-intl with full setup | RTL support, locale routing |
| Terminology | "Organization" (not Workspace) | Clearer domain language |
| Schema Scope | All tables now | Foreign keys designed correctly upfront |
| RSVP Pages | Include in foundation | End-to-end testing from start |

---

## Implementation Stages

Work is organized into 4 staged PRs for reviewability:

| Stage | Document | Scope | Estimate |
|-------|----------|-------|----------|
| 1 | [01-infrastructure.md](./01-infrastructure.md) | Replace cloud services with self-hostable alternatives | 2-3 hours |
| 2 | [02-cleanup-rename.md](./02-cleanup-rename.md) | Remove demo code, rename Workspace→Organization | 3-4 hours |
| 3 | [03-domain-schema-i18n.md](./03-domain-schema-i18n.md) | Create Events domain tables, setup i18n | 4-5 hours |
| 4 | [04-routers-rsvp.md](./04-routers-rsvp.md) | tRPC data layer, public RSVP pages | 4-5 hours |

**Total Estimated Effort**: ~15-17 hours

---

## Domain Model Overview

```
Organization (event client/organizer)
    └── Events
        ├── GuestCategories (AAA, A, B with service levels)
        ├── Guests
        │   └── RSVPs
        ├── EmailTemplates
        └── Branding

Future Phases (schema created now):
    ├── Inventory (hotels, flights, transport)
    ├── Itineraries
    ├── Workflows & Approvals
    └── Communications (WhatsApp)
```

---

## Phase 1 Features (What We're Building)

From the tech brief, Phase 1 requires:

- [x] Import guest list from Excel (name, position, entity, contacts, category)
- [x] Automated service allocation based on guest category
- [x] Personalized RSVP link generation per guest
- [x] Automated email with category-specific content
- [x] Guest profiles with all assigned info
- [x] Category-adaptive RSVP pages
- [x] Data collection and reporting
- [x] Brandable frontend/backend
- [x] Multi-event support with different branding/domains
- [x] Workspace (Organization) access control

---

## Technology Stack

### Keeping from Boilerplate
- Next.js 15 (App Router)
- TypeScript
- Drizzle ORM
- tRPC
- Better-Auth
- Shadcn UI / Radix
- React Hook Form + Zod
- TailwindCSS

### Replacing for KSA Compliance
| Current | Replacement |
|---------|-------------|
| Neon.tech (PostgreSQL) | Self-hosted PostgreSQL |
| Upstash Redis | Self-hosted Redis |
| Resend (Email) | Generic SMTP |

### Adding
- next-intl (i18n)
- nodemailer (SMTP)
- ioredis (Redis client)
- rate-limiter-flexible (rate limiting)

---

## Verification Checklist

After each stage:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run db:push` applies correctly
- [ ] Dev server starts without errors
- [ ] Authentication flow works

After all stages:
- [ ] Public RSVP page loads without auth
- [ ] RSVP submission works
- [ ] Admin dashboard shows guest data
- [ ] Arabic/English switching works
- [ ] RTL layout correct for Arabic

---

## Related Documents

### Foundation (Stages 1-4)
- [Stage 1: Infrastructure Migration](./01-infrastructure.md)
- [Stage 2: Cleanup & Rename](./02-cleanup-rename.md)
- [Stage 3: Domain Schema & i18n](./03-domain-schema-i18n.md)
- [Stage 4: tRPC Routers & RSVP](./04-routers-rsvp.md)

### Features (Stages 5+)
- [Stage 5: Admin Dashboard UI](./05-admin-dashboard.md)
  - 5A: Events List & Create Event
  - 5B: Event Detail with Tabs
  - 5C: Guests Table with CRUD
  - 5D: Excel Import & Categories
  - 5E: Panel-to-Page Refactor (mobile-friendly URL-based navigation)
- [Stage 6: Email Template Builder](./06-email-template-builder.md)
- [Stage 15: Google Maps Integration](./15-google-maps-integration.md)

## Reference Documents

- [**Architecture Document**](../ARCHITECTURE.md) - Complete system architecture, deployment guide, and API documentation
- `/docs/events-crm-boring-template-evaluation.md` - Original evaluation
- `/docs/CRM_Tech_Brief_Overview.md` - Phase 1 requirements
