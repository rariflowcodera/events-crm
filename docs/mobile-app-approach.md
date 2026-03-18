# Mobile App Approach: Guest Features

> **Version**: 1.0 | **Date**: 2026-02-10 | **Status**: Proposal

---

## 1. Objective & Scope

Build a native mobile app focused exclusively on **guest-facing features**. The app provides event guests with a polished, native experience for RSVP, VAPP parking permits, and event information — all from a branded, downloadable app on the App Store and Google Play.

### In Scope

| Feature | Description |
|---------|-------------|
| **RSVP** | View event details, submit/amend RSVP responses via token-based access |
| **VAPP** | View and save Vehicle Access Parking Permits (see [Stage 38](./foundation-plan/38-vapp-feature.md)) |
| **Event Info** | Event name, date, venue, map, branding |
| **Wallet Passes** | Add VAPP/event passes to Apple Wallet and Google Wallet |
| **Push Notifications** | Event reminders, RSVP confirmations, updates |
| **Offline Access** | Cached passes viewable without network |
| **Bilingual** | Arabic/English with RTL support |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Admin dashboard | Remains web-only; complex UI unsuited for mobile |
| Guest management | Admin function, not guest-facing |
| Email template builder | Admin function |
| Analytics/reporting | Admin function |
| Staff check-in app | Separate future consideration |

### Why a Native App?

The [CRM Tech Brief](./CRM_Tech_Brief_Overview.md) identifies "Dedicated Guest and Admin Mobile Apps" as a foundational integration target. For guest features specifically:

- **App Store presence** provides legitimacy for high-profile government/corporate events
- **Push notifications** enable real-time event updates
- **Wallet integration** (Apple/Google) is only available to native apps
- **Offline passes** ensure access even in areas with poor connectivity (stadium parking)
- **Native feel** matches guest expectations for VIP-tier events

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Guest opens app via deep link from email/SMS containing RSVP token | Must |
| FR-2 | Display event details with event branding (logo, colors, background) | Must |
| FR-3 | Submit and amend RSVP responses with dynamic form fields | Must |
| FR-4 | View VAPP voucher with serial number, venue/match/access codes | Must |
| FR-5 | Download VAPP as PDF | Must |
| FR-6 | Add pass to Apple Wallet / Google Wallet | Should |
| FR-7 | Receive push notifications for event updates | Should |
| FR-8 | Cache event data and passes for offline viewing | Should |
| FR-9 | Full Arabic/English support with RTL layout | Must |
| FR-10 | Event-specific branding (fonts, colors, logos) applied dynamically | Must |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | KSA data residency — no data leaves Saudi Arabia | Mandatory |
| NFR-2 | App size under 30MB | Target |
| NFR-3 | Cold start to content under 2 seconds | Target |
| NFR-4 | Support iOS 15+ and Android 10+ | Mandatory |
| NFR-5 | Accessibility (VoiceOver/TalkBack) | Should |

---

## 3. Recommended Approach: Expo (React Native)

### Decision Matrix

| Criteria | Weight | Expo/RN | Capacitor | PWA | Flutter |
|----------|--------|---------|-----------|-----|---------|
| Code sharing with web codebase | 25% | 4 | 5 | 5 | 1 |
| Native wallet integration | 20% | 5 | 3 | 1 | 4 |
| Push notifications | 15% | 5 | 4 | 2 | 5 |
| App Store presence | 15% | 5 | 5 | 1 | 5 |
| Development speed | 15% | 4 | 4 | 5 | 3 |
| Offline support | 10% | 5 | 4 | 3 | 5 |
| **Weighted Score** | | **4.55** | **4.10** | **2.90** | **3.55** |

### Why Expo

1. **React Native foundation** — The web app is React/TypeScript. The team already knows React, JSX, hooks, and component patterns. Expo eliminates the need to learn a new language (Dart/Flutter) or paradigm.

2. **Expo SDK** — Managed workflow handles native build complexity. No need for Xcode/Android Studio for day-to-day development. `eas build` produces store-ready binaries from CI.

3. **Shared validation schemas** — Zod schemas from `lib/schemas.ts` can be imported directly into the mobile app. Same validation logic, zero drift.

4. **tRPC compatibility** — The existing tRPC client (`@trpc/client`) works in React Native. The mobile app calls the same API endpoints the web uses, with full TypeScript inference.

5. **Wallet SDKs** — `react-native-passkit-wallet` (Apple) and Google Wallet REST API have mature Expo-compatible libraries.

6. **EAS Build** — Expo Application Services provides cloud builds, OTA updates, and app store submission tooling. No need to manage native build infrastructure.

7. **RTL support** — React Native has built-in RTL support via `I18nManager.forceRTL()`, and Expo's `expo-localization` handles locale detection.

---

## 4. Architectural Impact on Existing System

### 4.1 Existing API Readiness

The current tRPC API surface already provides most of what the mobile app needs. These public procedures require **no authentication** (token-based):

| Router | Procedure | Mobile Use | Status |
|--------|-----------|-----------|--------|
| `publicVapp.getByToken` | Fetch VAPP data by guest token | VAPP screen | Exists |
| `publicForms.getFormByToken` | Fetch RSVP form config by token | RSVP form | Exists |
| `publicForms.submitForm` | Submit RSVP response | RSVP submission | Exists |

> See [ARCHITECTURE.md](./ARCHITECTURE.md) Section 11 for full API documentation.

### 4.2 New API Endpoints Needed

| Endpoint | Type | Purpose |
|----------|------|---------|
| `publicGuest.getEventInfo` | Query | Return event details (name, date, venue, map URL, branding) for a given guest token — a lightweight endpoint the mobile home screen needs |
| `publicGuest.registerPushToken` | Mutation | Store Expo push token against the guest record for notifications |
| `api/wallet/apple/[token]` | REST (GET) | Generate `.pkpass` file for Apple Wallet |
| `api/wallet/google/[token]` | REST (GET) | Return Google Wallet JWT for "Add to Google Wallet" flow |

These endpoints follow the existing public/token-based pattern — no session cookies needed.

### 4.3 Schema Changes

Minimal additions to the existing schema:

```sql
-- Add push notification token storage to guests table
ALTER TABLE guests ADD COLUMN push_token TEXT;
ALTER TABLE guests ADD COLUMN push_platform TEXT; -- 'ios' | 'android'
```

```typescript
// server/db/schemas/guest.ts - new fields
pushToken: text("push_token"),
pushPlatform: text("push_platform"),  // 'ios' | 'android'
```

No other schema changes required. The mobile app consumes existing data structures.

### 4.4 Push Notification Infrastructure

Push notifications are sent via the existing BullMQ job queue (see [ARCHITECTURE.md](./ARCHITECTURE.md) Section 3.4):

```
BullMQ Queue: "push-notification"
├── Worker sends to Expo Push Service (handles APNs/FCM routing)
├── Triggered by: event status changes, RSVP reminders, updates
└── Delivery tracking via existing email_log pattern (reuse or extend)
```

**Expo Push Service** acts as a proxy — push payloads go to `https://exp.host/--/api/v2/push/send`, which routes to APNs/FCM. No direct Apple/Google push infrastructure needed.

---

## 5. App Design

### 5.1 Screen Map

```
Deep Link Entry (events-crm://guest/{token})
│
├── Home Screen
│   ├── Event Name + Branding
│   ├── Event Date & Time
│   ├── Venue + Map Link
│   └── Quick Actions: [RSVP] [VAPP] [Add to Wallet]
│
├── RSVP Screen
│   ├── Dynamic form (mirrors web RSVP)
│   ├── Category-specific fields
│   ├── Companion info section
│   ├── Submit / Amend button
│   └── Confirmation state
│
├── VAPP Screen
│   ├── Voucher display (serial, venue, match, access codes)
│   ├── Event branding background
│   ├── [Download PDF] button
│   └── [Add to Wallet] button
│
├── Wallet Pass (native OS)
│   └── Apple Wallet / Google Wallet pass
│
└── Settings
    ├── Language toggle (EN/AR)
    └── Push notification preferences
```

### 5.2 Guest Flow

```
Email with token link
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│  App installed?  │─No─▶│  App Store page   │
│                  │     │  (deep link saved) │
└────────┬────────┘     └──────────────────┘
         │ Yes
         ▼
┌─────────────────┐
│  Token stored    │
│  locally         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Fetch event     │────▶│  Home screen      │
│  info via API    │     │  with branding    │
└─────────────────┘     └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  RSVP    │ │  VAPP    │ │  Wallet  │
              │  Form    │ │  Voucher │ │  Pass    │
              └──────────┘ └──────────┘ └──────────┘
```

### 5.3 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 52+ | Managed React Native |
| **Language** | TypeScript | Shared types with web |
| **Navigation** | Expo Router | File-based routing (matches Next.js mental model) |
| **API Client** | @trpc/client | Type-safe API calls to existing tRPC backend |
| **State** | TanStack Query (React Query) | Server state caching (same as web) |
| **Forms** | React Hook Form + Zod | Same validation as web |
| **i18n** | expo-localization + i18next | Arabic/English with RTL |
| **Storage** | expo-secure-store | Token persistence |
| **Push** | expo-notifications | Push notification handling |
| **Wallet** | react-native-passkit-wallet | Apple Wallet integration |
| **Styling** | NativeWind (Tailwind for RN) | Familiar Tailwind syntax |
| **PDF** | expo-print + expo-sharing | VAPP PDF download |
| **Deep Links** | expo-linking | Token-based app entry |

---

## 6. Shared Code Strategy

### What Can Be Shared (via package or direct import)

| Asset | Web Location | Sharing Method |
|-------|-------------|----------------|
| **Zod schemas** | `lib/schemas.ts` | Symlink or npm workspace package |
| **TypeScript types** | `server/db/schemas/*.ts` (type exports) | Shared types package |
| **tRPC router types** | `trpc/routers/_app.ts` (`AppRouter` type) | Direct import for client inference |
| **Validation logic** | `lib/rsvp.ts` (field configs, sections) | Shared package |
| **Constants** | `lib/constants.ts` | Shared package |
| **i18n keys** | `messages/en.json`, `messages/ar.json` | Copy + extend for mobile-specific keys |
| **Branding resolution** | `lib/branding/utils.ts` | Shared utility |

### What Cannot Be Shared

| Asset | Reason |
|-------|--------|
| React components (`components/`) | Web uses Radix/Shadcn; mobile needs React Native components |
| Tailwind styles | NativeWind syntax is similar but not identical |
| Server-side code (`server/`) | Mobile is client-only |
| Next.js routing (`app/`) | Mobile uses Expo Router |
| tRPC server procedures | Mobile only uses the client side |

### Recommended Sharing Approach: npm Workspaces

```json
// Root package.json
{
  "workspaces": ["packages/*", "mobile"]
}
```

Extract shared code into `packages/shared/`:

```
packages/
└── shared/
    ├── package.json
    ├── schemas.ts      ← re-exports from lib/schemas.ts
    ├── types.ts        ← event, guest, RSVP, VAPP types
    ├── constants.ts    ← shared constants
    ├── branding.ts     ← branding resolution logic
    └── i18n/
        ├── en.json     ← subset of messages/en.json
        └── ar.json     ← subset of messages/ar.json
```

This approach avoids duplicating validation logic while keeping the mobile app independently buildable.

---

## 7. Project Structure

### Proposed `mobile/` Directory

```
mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (providers, theme)
│   ├── index.tsx                 # Entry: checks for stored token
│   ├── guest/
│   │   └── [token].tsx           # Deep link handler → fetches data
│   ├── home.tsx                  # Event home screen
│   ├── rsvp.tsx                  # RSVP form screen
│   ├── vapp.tsx                  # VAPP voucher screen
│   └── settings.tsx              # Language + notification prefs
│
├── components/
│   ├── ui/                       # Reusable UI primitives (RN equivalents)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Text.tsx
│   ├── EventHeader.tsx           # Branded event header
│   ├── VappVoucher.tsx           # VAPP voucher display
│   ├── RsvpForm.tsx              # Dynamic RSVP form
│   └── WalletButton.tsx          # Add to Wallet CTA
│
├── lib/
│   ├── api.ts                    # tRPC client setup
│   ├── storage.ts                # Secure token storage
│   ├── push.ts                   # Push notification registration
│   ├── wallet.ts                 # Apple/Google Wallet helpers
│   ├── i18n.ts                   # i18n setup
│   └── theme.ts                  # Dynamic theming from branding
│
├── assets/                       # Static assets (app icon, splash)
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── babel.config.js
├── tsconfig.json
├── package.json
└── README.md
```

### Monorepo Integration

```
events-crm/                       # Existing project root
├── app/                          # Next.js web app (unchanged)
├── components/                   # Web components (unchanged)
├── server/                       # Server code (unchanged)
├── trpc/                         # tRPC routers (unchanged)
├── lib/                          # Shared utilities
├── packages/
│   └── shared/                   # NEW: extracted shared code
├── mobile/                       # NEW: Expo app
├── docs/
├── package.json                  # Updated: workspaces field
└── turbo.json                    # Optional: Turborepo config
```

---

## 8. Apple Wallet & Google Wallet Integration

### 8.1 Apple Wallet (.pkpass)

**Approach**: Server-side `.pkpass` generation via the `passkit-generator` npm package.

```
Guest taps "Add to Apple Wallet"
        │
        ▼
GET /api/wallet/apple/{token}
        │
        ▼
Server generates .pkpass:
  ├── Pass type: eventTicket or generic
  ├── Fields: serial number, venue code, match code, access code
  ├── Barcode: QR code with guest token (for future check-in)
  ├── Colors: from event branding (primaryColor)
  ├── Logo: from resolved event branding
  └── Signed with Apple Developer certificate
        │
        ▼
Returns .pkpass binary
        │
        ▼
Mobile app opens via PassKit framework
```

**Requirements**:
- Apple Developer account with Pass Type ID certificate
- Pass signing certificate (`.p12` file) stored on server
- `passkit-generator` npm package on the server

**Pass Fields**:

| Field | Source | Position |
|-------|--------|----------|
| Serial Number | `guest.serialNumber` | Header |
| Event Name | `event.name` | Primary |
| Venue Code | `event.settings.vapp.venueCode` | Secondary |
| Match Code | `event.settings.vapp.matchCode` | Secondary |
| Access Code | `category.vappAccessCode` | Auxiliary |
| Category | `category.name` | Auxiliary |
| Date | `event.startDate` | Back |

### 8.2 Google Wallet (JWT-based)

**Approach**: Server generates a signed JWT, client opens Google Wallet intent.

```
Guest taps "Add to Google Wallet"
        │
        ▼
GET /api/wallet/google/{token}
        │
        ▼
Server generates JWT:
  ├── Object type: EventTicket or Generic
  ├── Fields: same as Apple Wallet
  ├── Barcode: QR code with guest token
  ├── Branding: hex colors from event branding
  └── Signed with Google Cloud service account key
        │
        ▼
Returns { saveUrl: "https://pay.google.com/gp/v/save/{jwt}" }
        │
        ▼
Mobile app opens URL via Linking
```

**Requirements**:
- Google Cloud project with Wallet API enabled
- Service account with "Wallet Object Issuer" role
- Issuer ID from Google Pay & Wallet Console

### 8.3 Offline Pass Access

Once added to Apple/Google Wallet, passes are available offline natively through the OS wallet app. The mobile app also caches VAPP data locally via `expo-secure-store` for offline viewing within the app itself.

---

## 9. Timeline (4-Week Estimate with Claude Code)

### Week 1: Foundation

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Project setup: Expo init, monorepo config, shared package extraction | Buildable Expo app with tRPC client connected |
| 3 | Deep linking setup (`expo-linking`) + token storage | App opens from email link, stores token |
| 4 | i18n setup (Arabic/English + RTL) | Language switching works |
| 5 | Home screen with event data fetching | Event info displays with branding |

### Week 2: Core Features

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | RSVP form screen (dynamic fields, validation, submission) | RSVP works end-to-end |
| 3 | VAPP voucher screen (matches web design) | VAPP displays with branding |
| 4 | PDF download for VAPP (`expo-print`) | Guest can save/share VAPP |
| 5 | Offline caching + loading states | Cached data viewable offline |

### Week 3: Native Features

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Apple Wallet pass generation (server + mobile) | .pkpass added from app |
| 3 | Google Wallet pass generation (server + mobile) | Wallet intent works |
| 4 | Push notification registration + server endpoint | Token stored, test push received |
| 5 | Push notification handling (foreground/background) | Notifications route correctly |

### Week 4: Polish & Release

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Dynamic branding/theming (colors, fonts, logos) | Multi-event branding works |
| 2 | RTL polish + Arabic typography | Arabic layout pixel-perfect |
| 3 | App Store assets (icon, screenshots, metadata) | Store listing ready |
| 4 | EAS Build configuration + TestFlight/Internal Testing | Test builds distributed |
| 5 | App Store / Google Play submission | Apps submitted for review |

### Milestones

| Milestone | Target | Dependency |
|-----------|--------|------------|
| Internal alpha (TestFlight) | End of Week 2 | Core features complete |
| Wallet integration demo | End of Week 3 | Apple/Google certs obtained |
| Store submission | End of Week 4 | All features + QA pass |
| Store approval | Week 5 | Apple/Google review (2-7 days) |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Apple review rejection** | Medium | High | Follow Human Interface Guidelines strictly; prepare appeal documentation; submit early to allow re-submission time |
| **Google Wallet API approval delay** | Medium | Medium | Apply for Wallet API access early; use test passes during development; Google Wallet can be added post-launch via OTA update |
| **Apple Pass certificate setup** | Low | High | Generate certificates in first week; document the process; certificates last 3 years |
| **Deep link reliability** (Universal Links / App Links) | Medium | Medium | Implement fallback to web RSVP page if app not installed; test across iOS/Android versions |
| **Expo SDK breaking changes** | Low | Medium | Pin Expo SDK version; only upgrade after testing |
| **Arabic font rendering** | Medium | Low | Test Arabic typography early; use system Arabic fonts as fallback; NativeWind supports RTL |
| **KSA App Store availability** | Low | High | Both Apple App Store and Google Play are available in KSA; ensure app metadata includes Arabic |
| **Push notification opt-in rates** | Medium | Low | Prompt at contextually relevant moments (after RSVP), not on first launch |
| **Large event branding assets** | Low | Low | Cache images locally; use progressive loading; set max image dimensions |
| **Offline/online sync** | Low | Medium | Guest token and event data cached; RSVP submission queued if offline and retried |

---

## 11. Cost Implications

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Account | $99/year | Required for App Store + Wallet passes |
| Google Play Developer Account | $25 (one-time) | Required for Play Store |
| Google Cloud (Wallet API) | Free tier | Wallet API has no per-pass cost |
| Apple Wallet certificates | Included | Part of Apple Developer account |

### Ongoing Costs

| Item | Cost | Notes |
|------|------|-------|
| EAS Build (Expo) | Free tier: 30 builds/month | Paid plans from $99/month if more builds needed |
| Expo Push Service | Free | Expo's push proxy service is free |
| Apple Developer renewal | $99/year | Annual |
| Server compute for pass generation | Negligible | Runs on existing server infrastructure |

### Total First-Year Cost

| Scenario | Estimate |
|----------|----------|
| **Minimum** (free EAS tier) | ~$124 |
| **With paid EAS** (if build volume warrants) | ~$1,312/year |

No additional infrastructure costs — the mobile app uses the existing self-hosted API (PostgreSQL, Redis, SMTP) that already runs for the web app. KSA data residency compliance is maintained automatically since all data flows through the same backend.

---

## 12. Alternatives Considered

### 12.1 Progressive Web App (PWA)

| Aspect | Assessment |
|--------|------------|
| **Pros** | Zero new code infrastructure; works in mobile browsers; same codebase |
| **Cons** | No App Store presence; no Apple Wallet integration; no reliable push on iOS (Safari restrictions); cannot be branded as a "real app" for VIP guests; no offline reliability |
| **Verdict** | **Rejected** — Push notifications and wallet integration are hard requirements. App Store presence is important for legitimacy at government/corporate events. iOS Safari PWA support remains limited. |

### 12.2 Capacitor (Ionic)

| Aspect | Assessment |
|--------|------------|
| **Pros** | Wraps existing web code in native shell; maximum code reuse; access to native APIs via plugins |
| **Cons** | WebView-based — performance feels non-native; wallet plugins are less mature; debugging WebView issues is painful; Capacitor community smaller than React Native |
| **Verdict** | **Rejected** — For a simple app, the "wrapped WebView" feel is noticeable and undermines the premium experience expected at high-profile events. Wallet plugin ecosystem is less proven. |

### 12.3 Flutter

| Aspect | Assessment |
|--------|------------|
| **Pros** | Excellent native performance; strong wallet/push libraries; good RTL support; single codebase for iOS/Android |
| **Cons** | Dart language (no overlap with existing TypeScript codebase); cannot share Zod schemas, tRPC types, or validation logic; separate toolchain and learning curve; two very different codebases to maintain |
| **Verdict** | **Rejected** — The inability to share TypeScript types and Zod validation with the web app is a significant drawback. For a small team, maintaining TypeScript (web) + Dart (mobile) increases cognitive load and duplication. |

### 12.4 Native Swift + Kotlin

| Aspect | Assessment |
|--------|------------|
| **Pros** | Best possible performance; full native API access; no abstraction layer |
| **Cons** | Two separate codebases (Swift + Kotlin); no code sharing with web; 2x development effort; requires platform-specific expertise |
| **Verdict** | **Rejected** — Overkill for a guest-facing app with 4-5 screens. Development time doubles with no code sharing benefit. |

### Summary

```
                    Code Sharing    Native Feel    Wallet Support    Dev Speed
Expo/RN             ████████░░      ████████░░     ████████░░        ████████░░
Capacitor           ██████████      ████░░░░░░     ██████░░░░        ████████░░
PWA                 ██████████      ██░░░░░░░░     ░░░░░░░░░░        ██████████
Flutter             ██░░░░░░░░      ██████████     ████████░░        ██████░░░░
Native              ░░░░░░░░░░      ██████████     ██████████        ████░░░░░░
                                                              Winner: Expo/RN ✓
```

---

## 13. Verification Plan

### 13.1 Feature Verification Matrix

| Feature | Test Method | Success Criteria |
|---------|------------|-----------------|
| **Deep linking** | Tap link in email on iOS + Android | App opens to correct event/guest screen |
| **RSVP form** | Submit RSVP with various field combinations | Response appears in admin dashboard; guest status updates |
| **RSVP amendment** | Re-open RSVP after submission | Previous responses pre-filled; amendment saves correctly |
| **VAPP display** | Open VAPP screen for guest with serial number | All codes display correctly; branding applied |
| **VAPP PDF** | Tap download on VAPP screen | PDF saves/shares with correct content |
| **Apple Wallet** | Tap "Add to Apple Wallet" on iOS device | Pass appears in Wallet app with correct fields |
| **Google Wallet** | Tap "Add to Google Wallet" on Android device | Pass appears in Google Wallet with correct fields |
| **Push notification** | Trigger event update from admin | Notification received on device; tapping opens correct screen |
| **Offline mode** | Enable airplane mode after loading | Cached event info and VAPP still viewable |
| **Arabic / RTL** | Switch language to Arabic | Layout mirrors correctly; Arabic text renders properly |
| **Multi-event** | Test with 2+ events with different branding | Each event shows its own branding (colors, logo, fonts) |

### 13.2 Device Testing Matrix

| Device | OS Version | Test Focus |
|--------|-----------|------------|
| iPhone 14/15 | iOS 17+ | Primary iOS target |
| iPhone SE | iOS 15 | Small screen + minimum OS |
| Samsung Galaxy S23 | Android 14 | Primary Android target |
| Samsung Galaxy A14 | Android 12 | Budget device performance |
| iPad (if supporting tablets) | iPadOS 17 | Layout scaling |

### 13.3 Integration Test Checklist

- [ ] tRPC client connects to production API from mobile
- [ ] Token-based auth works (no session cookies needed)
- [ ] RSVP submission from mobile appears in web admin dashboard
- [ ] Push token registration stores correctly in database
- [ ] Wallet pass generation endpoints return valid passes
- [ ] Deep links work from Gmail, Outlook, and Samsung Email apps
- [ ] App handles expired/invalid tokens gracefully
- [ ] RTL layout correct on all screens
- [ ] App works with slow network (3G simulation)
- [ ] App works fully offline after initial data load

### 13.4 Store Submission Checklist

- [ ] App icon (1024x1024) follows Apple/Google guidelines
- [ ] Screenshots for required device sizes (6.7", 6.1", 5.5" for iOS)
- [ ] Privacy policy URL (required by both stores)
- [ ] App description in English and Arabic
- [ ] Age rating questionnaire completed
- [ ] TestFlight / Internal Testing track validated
- [ ] No crashes in production build
- [ ] Analytics/tracking disclosure (App Tracking Transparency for iOS)

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture, API documentation, deployment guide
- [CRM Tech Brief](./CRM_Tech_Brief_Overview.md) — Phase 1 requirements, mentions "Dedicated Guest and Admin Mobile Apps"
- [Foundation Plan Overview](./foundation-plan/00-overview.md) — Master plan with technology decisions
- [Stage 38: VAPP Feature](./foundation-plan/38-vapp-feature.md) — Vehicle Access Parking Permit implementation (key mobile feature)
- [Stage 08: RSVP Form System](./foundation-plan/08-rsvp-form-system.md) — Dynamic RSVP form configuration
- [Stage 39: Short RSVP URLs](./foundation-plan/39-short-rsvp-urls.md) — URL shortening (relevant for deep links)

---

## Appendix A: tRPC Client Setup for React Native

```typescript
// mobile/lib/api.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@events-crm/shared/types"
import { getStoredToken } from "./storage"

const API_URL = process.env.EXPO_PUBLIC_API_URL // e.g., https://api.yourdomain.sa

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      // No auth headers needed — public endpoints use token in input
    }),
  ],
})
```

## Appendix B: Deep Link Configuration

```json
// mobile/app.json (excerpt)
{
  "expo": {
    "scheme": "events-crm",
    "ios": {
      "associatedDomains": ["applinks:yourdomain.sa"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourdomain.sa",
              "pathPrefix": "/rsvp/"
            },
            {
              "scheme": "https",
              "host": "yourdomain.sa",
              "pathPrefix": "/vapp/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```
