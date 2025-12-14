# 18. System Documentation

**Status: COMPLETED**

## Overview

Add an in-dashboard documentation system to guide end users on how to use the Events CRM. Uses **Markdoc** for rendering `.mdoc` files that developers edit directly in code.

## Requirements

| Requirement | Decision |
|-------------|----------|
| Access | Dashboard only (authenticated users) |
| Language | English only (for now) |
| Content management | Developers edit `.mdoc` files directly (no admin UI) |
| Placement | Main sidebar alongside Dashboard, Events, Analytics |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Content format | Markdoc (`.mdoc` files) |
| Rendering | `@markdoc/markdoc` transforms to React |
| Typography | `@tailwindcss/typography` for prose styling |
| Navigation | Auto-built from folder structure |

## Dependencies

```bash
npm install @markdoc/markdoc @tailwindcss/typography gray-matter
```

All dependencies have been installed.

## Content Directory Structure

```
content/
  documentation/
    getting-started/
      getting-started.mdoc    # Parent (matches folder name) ✓
      creating-events.mdoc    # Child ✓
    managing-guests/
      managing-guests.mdoc    # Parent ✓
      importing-guests.mdoc   # Child ✓
    faq.mdoc                  # Standalone doc ✓
```

Sample content has been created for all items marked with ✓.

### Frontmatter Schema

```yaml
---
title: "Getting Started"
description: "Learn the basics of Events CRM"
order: 0                    # Sorting order
status: "published"         # "published" or "draft"
collapsible: true           # Show as collapsible section
collapsed: false            # Initial collapsed state
---

Content in Markdoc format here...
```

## Route Structure

```
/[locale]/(web)/(dashboard)/[slug]/docs/           # Docs index
/[locale]/(web)/(dashboard)/[slug]/docs/[...slug]  # Dynamic doc pages
```

## Implementation

### Phase 1: Setup ✓

1. ✓ Install dependencies (`@markdoc/markdoc`, `@tailwindcss/typography`, `gray-matter`)
2. ✓ Create `content/documentation/` directory
3. ✓ Add typography plugin to `styles/globals.css`

### Phase 2: Core Library ✓

Created `lib/docs/` with:

| File | Purpose | Status |
|------|---------|--------|
| `types.ts` | TypeScript interfaces for docs | ✓ |
| `markdoc-config.ts` | Custom tags, nodes (heading ID generation), React component mappings | ✓ |
| `docs-reader.ts` | Read `.mdoc` files from filesystem, parse frontmatter, transform with Markdoc | ✓ |
| `docs-toc.ts` | Extract h2/h3 headings for table of contents | ✓ |
| `index.ts` | Module exports | ✓ |

### Phase 3: Route Configuration ✓

Updated `lib/routes.ts`:
```typescript
// Added route entries
docs: {
  name: "docs",
  path: "/:slug/docs",
  metadata: { title: "Documentation" },
  metadataExtra: { name: "Docs", icon: "book" },
},
"docs-page": {
  name: "docs-page",
  path: "/:slug/docs/:docSlug*",
}
```

Updated `components/navigation/app-sidebar.tsx`:
```typescript
const dashboardRoutes = [
  ROUTES.dashboard,
  ROUTES.events,
  ROUTES.analytics,
  ROUTES.docs,  // Added docs to sidebar
]
```

Added `book` icon to `components/global/icons.tsx` (using `BookOpenIcon` from lucide-react).

### Phase 4: Components ✓

Created `components/docs/`:

| Component | Purpose | Status |
|-----------|---------|--------|
| `docs-navigation.tsx` | Left sidebar with recursive tree rendering, collapsible sections | ✓ |
| `docs-toc.tsx` | Right-side table of contents with scroll spy | ✓ |
| `docs-content-renderer.tsx` | Render Markdoc AST to React using prose styling | ✓ |
| `markdoc-components.tsx` | Custom React components for Heading, Link, Code, CodeBlock, Callout | ✓ |
| `index.ts` | Module exports | ✓ |

### Phase 5: Page Routes ✓

Created `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/`:

| File | Purpose | Status |
|------|---------|--------|
| `layout.tsx` | Docs-specific layout with navigation sidebar | ✓ |
| `page.tsx` | Index page (redirects to first doc) | ✓ |
| `[...docSlug]/page.tsx` | Dynamic doc page with content + TOC | ✓ |

### Phase 6: Sample Content ✓

Created initial documentation:
- ✓ `getting-started/getting-started.mdoc` - Welcome and overview
- ✓ `getting-started/creating-events.mdoc` - Event creation guide
- ✓ `managing-guests/managing-guests.mdoc` - Guest management guide
- ✓ `managing-guests/importing-guests.mdoc` - Excel import guide
- ✓ `faq.mdoc` - Frequently asked questions

## Architecture

```
.mdoc files (content/documentation/)
         ↓
docs-reader.ts (fs read + frontmatter parse)
         ↓
Markdoc transform (AST → React)
         ↓
docs-tree.ts (build navigation hierarchy)
         ↓
Layout with DocsNavigation + DocsToc + DocsContentRenderer
```

## Features

| Feature | Implementation |
|---------|----------------|
| Hierarchical navigation | Auto-detected from folder structure |
| Table of contents | Auto-extracted from h1/h2/h3 headings |
| Ordering | `order` field in frontmatter |
| Draft/publish | `status` field filtering |
| Collapsible sections | `collapsible` + `collapsed` fields |
| Scroll spy | Intersection Observer in TOC component |

## Files Created

| Path | Purpose | Status |
|------|---------|--------|
| `content/documentation/` | Content directory | ✓ |
| `lib/docs/types.ts` | TypeScript interfaces | ✓ |
| `lib/docs/markdoc-config.ts` | Markdoc configuration | ✓ |
| `lib/docs/docs-reader.ts` | File system reader | ✓ |
| `lib/docs/docs-toc.ts` | TOC extraction | ✓ |
| `lib/docs/index.ts` | Module exports | ✓ |
| `components/docs/docs-navigation.tsx` | Navigation component | ✓ |
| `components/docs/docs-toc.tsx` | TOC component | ✓ |
| `components/docs/docs-content-renderer.tsx` | Content renderer | ✓ |
| `components/docs/markdoc-components.tsx` | Custom Markdoc React components | ✓ |
| `components/docs/index.ts` | Module exports | ✓ |
| `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/layout.tsx` | Docs layout | ✓ |
| `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/page.tsx` | Docs index | ✓ |
| `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/[...docSlug]/page.tsx` | Dynamic page | ✓ |

## Files Modified

| Path | Change | Status |
|------|--------|--------|
| `lib/routes.ts` | Add `docs` and `docs-page` routes | ✓ |
| `components/navigation/app-sidebar.tsx` | Add docs to sidebar navigation | ✓ |
| `components/global/icons.tsx` | Add `book` icon (BookOpenIcon) | ✓ |
| `styles/globals.css` | Add `@tailwindcss/typography` plugin | ✓ |

## Reference

Based on approach documented in `docs/Documentation_Approach_Technical_Overview.md` (BossUp system), simplified for developer-only content management without Keystatic admin UI.

## How to Add New Documentation

1. Create a new `.mdoc` file in `content/documentation/`
2. Add frontmatter with required fields:
   ```yaml
   ---
   title: "Page Title"
   description: "Brief description"
   order: 0
   status: "published"
   ---
   ```
3. Write content using Markdown syntax
4. For parent sections (collapsible), use folder structure: `folder-name/folder-name.mdoc`
5. Child pages go in the same folder as separate `.mdoc` files

The navigation tree rebuilds automatically based on folder structure and `order` field.
