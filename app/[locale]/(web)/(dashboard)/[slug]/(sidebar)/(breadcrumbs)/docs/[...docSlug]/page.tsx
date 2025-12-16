import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getDocBySlug, extractToc } from "@/lib/docs"
import { DocsContentRenderer, DocsToc } from "@/components/docs"

// Force dynamic rendering - these pages are under authenticated routes
// which use headers() for auth, incompatible with static generation
export const dynamic = "force-dynamic"

interface DocPageProps {
  params: Promise<{ slug: string; docSlug: string[] }>
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { docSlug } = await params
  const docPath = docSlug.join("/")
  const doc = await getDocBySlug(docPath)

  if (!doc) {
    return { title: "Not Found" }
  }

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { docSlug } = await params
  const docPath = docSlug.join("/")
  const doc = await getDocBySlug(docPath)

  if (!doc) {
    notFound()
  }

  const tocItems = extractToc(doc.content)

  return (
    <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-[1fr_200px]">
      {/* Main content */}
      <div>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">{doc.frontmatter.title}</h1>
          {doc.frontmatter.description && (
            <p className="mt-2 text-muted-foreground">{doc.frontmatter.description}</p>
          )}
        </header>
        <DocsContentRenderer content={doc.content} />
      </div>

      {/* Table of contents */}
      {tocItems.length > 0 && (
        <aside className="hidden lg:block">
          <DocsToc items={tocItems} />
        </aside>
      )}
    </div>
  )
}
