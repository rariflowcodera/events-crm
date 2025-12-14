# BossUp Documentation System - Technical Overview

## Core Technology Stack

**Primary CMS**: [Keystatic](https://keystatic.com/) - A Git-based headless CMS that stores content as `.mdoc` (Markdoc) files.

**Content Format**: [Markdoc](https://markdoc.dev/) - A Markdown-based authoring format by Stripe that compiles to React.

**Framework**: Next.js 15 App Router with React Server Components.

---

## Architecture Overview

```
.mdoc Files (content/documentation/)
         ↓
Keystatic Reader (reads from local, GitHub, or Cloud)
         ↓
KeystaticClient (filters, sorts, builds hierarchy)
         ↓
Markdoc Transform (AST → React)
         ↓
ContentRenderer Component
         ↓
HTML Page with Sidebar Navigation + Table of Contents
```

---

## Key Packages Required

```json
{
  "@keystatic/core": "^0.x",
  "@keystatic/next": "^0.x",
  "@markdoc/markdoc": "^0.x"
}
```

---

## 1. Keystatic Configuration

**File**: `packages/cms/keystatic/src/keystatic.config.ts`

```typescript
import { collection, config, fields } from '@keystatic/core';

export const keyStaticConfig = config({
  storage: KeystaticStorage, // local, github, or cloud
  collections: {
    documentation: collection({
      label: 'Documentation',
      slugField: 'title',
      path: 'content/documentation/**', // supports nested directories
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        label: fields.text({ label: 'Label' }), // custom nav label
        description: fields.text({ label: 'Description' }),
        content: fields.markdoc({ label: 'Content', options: {...} }),
        publishedAt: fields.date({ label: 'Published At' }),
        order: fields.number({ label: 'Order' }), // sorting
        status: fields.select({
          defaultValue: 'draft',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
        }),
        parent: fields.relationship({
          label: 'Parent',
          collection: 'documentation', // enables hierarchy
        }),
        collapsible: fields.checkbox({ label: 'Collapsible' }),
        collapsed: fields.checkbox({ label: 'Collapsed' }),
        categories: fields.array(fields.text({ label: 'Category' })),
        tags: fields.array(fields.text({ label: 'Tag' })),
        language: fields.text({ label: 'Language' }), // i18n
      },
    }),
  },
});
```

---

## 2. Content File Structure

**Directory**: `apps/web/content/documentation/`

```
documentation/
├── getting-started/
│   └── getting-started.mdoc    ← parent (index pattern)
├── agent-boss-score/
│   ├── agent-boss-score.mdoc   ← parent
│   ├── how-scoring-works.mdoc  ← child (auto-detected)
│   └── improving-your-score.mdoc
└── faq/
    └── faq.mdoc
```

**Sample .mdoc file frontmatter**:
```yaml
---
title: "Getting Started with BossUp"
description: "Discover where you stand..."
publishedAt: 2025-11-25
order: 0
status: "published"
parent: null  # or reference another doc's slug
collapsible: false
collapsed: false
---

Content in Markdoc format here...
```

---

## 3. CMS Client Implementation

**File**: `packages/cms/keystatic/src/keystatic-client.ts`

Key responsibilities:
- Reads all docs from Keystatic
- Filters by `status: 'published'`
- Auto-detects parent-child relationships from folder structure
- Sorts by `order` field
- Transforms Markdoc AST to React

```typescript
class KeystaticClient implements CmsClient {
  async getContentItems(options: GetContentItemsOptions) {
    const reader = await createKeystaticReader();
    const docs = await reader.collections[options.collection].all();

    // Filter by status, language, categories, tags
    const filtered = docs.filter(item => item.entry.status === 'published');

    // Auto-detect parent relationships from folder structure
    const itemsWithParents = processItems(filtered);

    // Map to ContentItem with rendered content
    return Promise.all(items.map(item => this.mapDocumentationPost(item)));
  }
}
```

**Parent Detection Logic**: If a file is at `parent-folder/parent-folder.mdoc`, it becomes the parent. Child docs are auto-associated based on folder nesting.

---

## 4. Markdoc Rendering

**File**: `packages/cms/keystatic/src/markdoc.tsx`

```typescript
import { transform, renderers } from '@markdoc/markdoc';

export async function renderMarkdoc(node: Node) {
  const content = transform(node, {
    tags: CustomMarkdocTags,    // Custom components
    nodes: MarkdocNodes,        // Heading ID generation
  });

  return renderers.react(content, React, {
    components: CustomMarkdocComponents,
  });
}
```

**Auto-generated heading IDs** (`markdoc-nodes.ts`):
```typescript
export const MarkdocNodes = {
  heading: {
    render: 'h1' | 'h2' | 'h3',
    attributes: {
      id: { type: String },
      level: { type: Number },
    },
    transform(node, config) {
      // Auto-generates slug-based IDs for TOC anchors
    },
  },
};
```

---

## 5. Navigation Tree Building

**File**: `apps/web/app/(marketing)/docs/_lib/utils.ts`

```typescript
export function buildDocumentationTree(pages: ContentItem[]) {
  const tree: ContentItem[] = [];

  pages.forEach((page) => {
    if (page.parentId) {
      const parent = pages.find((item) => item.slug === page.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(page);
        parent.children.sort((a, b) => a.order - b.order);
      }
    } else {
      tree.push(page);
    }
  });

  return tree.sort((a, b) => a.order - b.order);
}
```

---

## 6. Route Structure

**Layout** (`docs/layout.tsx`):
```typescript
async function DocsLayout({ children }) {
  const docs = await getDocs(resolvedLanguage);
  const tree = buildDocumentationTree(docs);

  return (
    <SidebarProvider>
      <DocsNavigation pages={tree} />
      {children}
    </SidebarProvider>
  );
}
```

**Dynamic Page** (`docs/[...slug]/page.tsx`):
```typescript
async function DocumentationPage({ params }) {
  const slug = params.slug.join('/');
  const page = await getPageBySlug(slug);
  const headings = extractHeadingsFromJSX(page.content);

  return (
    <div>
      <article>
        <h1>{page.title}</h1>
        <ContentRenderer content={page.content} />
      </article>
      <DocsTableOfContents data={headings} />
      {page.children.length > 0 && <DocsCards cards={page.children} />}
    </div>
  );
}
```

---

## 7. Navigation Component

**File**: `docs/_components/docs-navigation.tsx`

Uses recursive rendering with collapsible support:
```typescript
function Node({ node, level, prefix }) {
  const Container = node.collapsible
    ? DocsNavigationCollapsible
    : Fragment;

  return (
    <Container>
      {node.collapsible ? <CollapsibleTrigger /> : <DocsNavLink />}
      <Tree pages={node.children} level={level + 1} />
    </Container>
  );
}

export function DocsNavigation({ pages }) {
  return (
    <>
      <Sidebar>{/* Desktop */}
        <Tree pages={pages} level={0} prefix="/docs" />
      </Sidebar>
      <FloatingDocumentationNavigation>{/* Mobile */}
        <Tree pages={pages} level={0} prefix="/docs" />
      </FloatingDocumentationNavigation>
    </>
  );
}
```

---

## 8. Table of Contents Extraction

**File**: `docs/_lib/utils.ts`

```typescript
export function extractHeadingsFromJSX(jsx) {
  const headings = [];

  jsx.props.children.forEach((node) => {
    if (node.type === 'h1' || node.type === 'h2' || node.type === 'h3') {
      const text = getTextContent(node.props.children);
      const slug = generateSlug(text);
      headings.push({ text, level, href: `#${slug}`, children: [] });
    }
  });

  return headings; // Nested structure for TOC rendering
}
```

---

## 9. Environment Variables

```bash
CMS_CLIENT=keystatic
NEXT_PUBLIC_KEYSTATIC_CONTENT_PATH=./content
NEXT_PUBLIC_KEYSTATIC_STORAGE_KIND=local  # or 'github' or 'cloud'
```

---

## Key Features Summary

| Feature | Implementation |
|---------|---------------|
| Hierarchical navigation | `parent` field + auto-detection from folder structure |
| Collapsible sections | `collapsible` + `collapsed` fields |
| Ordering | `order` number field |
| Draft/publish workflow | `status` field with filtering |
| Table of contents | Auto-extracted from h1/h2/h3 headings |
| i18n support | `language` field with filtering |
| Mobile navigation | Floating menu component |
| Admin interface | Keystatic provides `/keystatic` admin UI |

---

## Summary

This system provides a fully Git-backed documentation platform with:
- A visual editor (Keystatic admin UI at `/keystatic`)
- Hierarchical navigation with collapsible sections
- Auto-generated table of contents
- All content stored as version-controlled `.mdoc` files
- Support for draft/publish workflows
- Internationalization capabilities
