# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Events Management CRM** - A platform for managing high-profile events with complex guest logistics. Built on "The Boring Template" (Next.js 15), being transformed for KSA (Saudi Arabia) data residency compliance.

### Key Constraints
- All data must be hosted in Saudi Arabia
- Full Arabic/English bilingual support required
- Self-hosted infrastructure (no Vercel, no US-based cloud services)

### Foundation Plan
See `docs/foundation-plan/` for implementation plans:
- `00-overview.md` - Master plan with context and decisions
- `01-infrastructure.md` - PostgreSQL, Redis, SMTP migration
- `02-cleanup-rename.md` - Cleanup and Workspace→Organization rename
- `03-domain-schema-i18n.md` - Events domain schema + i18n setup
- `04-routers-rsvp.md` - tRPC routers + public RSVP pages

### Reference Documents
- `docs/events-crm-boring-template-evaluation.md` - Original evaluation
- `docs/CRM_Tech_Brief_Overview.md` - Phase 1 requirements

## Commands

### Development
```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format:fix   # Fix code formatting with Prettier
```

### Database (Drizzle ORM with PostgreSQL)
```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema directly (dev only)
npm run db:seed      # Seed database with initial data (user roles)
npm run db:setup     # Run migrations + seed
npm run db:studio    # Open Drizzle Studio GUI
```

### Local Development Services
```bash
docker-compose up -d  # Start PostgreSQL, Redis, Mailpit
# Mailpit UI: http://localhost:8025 (for testing emails)
```

## Architecture

### Domain Model (Target State)
```
Organization (event client/organizer)
└── Events
    ├── GuestCategories (AAA, A, B with service levels)
    ├── Guests → RSVPs
    ├── EmailTemplates → EmailLogs
    └── Branding
```

### Route Groups (app/)
- `[locale]/(marketing)/` - Public landing pages (with i18n)
- `[locale]/(web)/` - Authenticated app routes
  - `(auth)/` - Sign-in/sign-out pages
  - `(dashboard)/[slug]/` - Organization-scoped dashboard
  - `invite/[token]/` - Invitation acceptance
- `[locale]/rsvp/[token]/` - Public guest RSVP pages (no auth)
- `api/` - API routes including tRPC at `/api/trpc/[trpc]`

### Data Layer
- **Database**: `server/db/` - Drizzle schemas in `schemas/`, config in `config/database.ts`
- **tRPC**: `trpc/` - Type-safe API layer
  - `init.ts` - tRPC setup with `baseProcedure` and `protectedProcedure`
  - `routers/` - Domain routers (organizations, events, guests, etc.)
  - `hooks/` - React Query hooks for each router
- **Server Actions**: `server/actions/` - Server-side mutations

### Authentication
Better-Auth (`lib/auth.ts`) with Google/GitHub OAuth and magic link email.

### Infrastructure (KSA-Compliant)
- **Database**: Self-hosted PostgreSQL (replacing Neon.tech)
- **Cache/Rate Limit**: Self-hosted Redis with ioredis (replacing Upstash)
- **Email**: Generic SMTP with nodemailer (replacing Resend)
- **File Storage**: AWS S3 (Bahrain region me-south-1)

### i18n
- next-intl for Arabic/English
- Translation files in `messages/en.json` and `messages/ar.json`
- RTL support for Arabic (`dir="rtl"`)

### Key Libraries
- **UI**: Shadcn/Radix components in `components/ui/`
- **Forms**: React Hook Form + Zod validation (`lib/schemas.ts`)
- **State**: Zustand for client state, nuqs for URL state
- **Payments**: Stripe integration (`lib/stripe.ts`)

### Path Alias
`@/*` maps to project root (e.g., `@/lib/utils`, `@/components/ui/button`)

### Configuration
- `lib/config.ts` - App configuration including pricing
- `lib/constants.ts` - Rate limits and other constants
- `env.ts` - Environment variable validation

### Component Organization
- `components/ui/` - Shadcn base components
- `components/forms/` - Form components with validation
- `components/organization/` - Organization management (renamed from workspace)
- `components/rsvp/` - Public RSVP page components
- `components/providers/` - React context providers

### UI Patterns

#### Sheet Content Padding
When using the `Sheet` component, the `SheetHeader` has built-in padding (`p-4`), but content placed after the header does NOT have horizontal padding by default. Always add `px-4 pb-4` to content containers inside sheets:

```tsx
<SheetContent>
  <SheetHeader>
    <SheetTitle>Title</SheetTitle>
    <SheetDescription>Description</SheetDescription>
  </SheetHeader>

  {/* Add px-4 pb-4 to content containers */}
  <div className="space-y-6 px-4 pb-4">
    {/* Your content here */}
  </div>
</SheetContent>
```

Note: `DialogContent` already has `p-6` padding built-in, so this pattern is mainly needed for `Sheet` components.
