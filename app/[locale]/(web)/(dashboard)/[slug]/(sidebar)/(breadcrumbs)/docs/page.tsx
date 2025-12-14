import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getDocsTree } from "@/lib/docs"
import { ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.docs.metadata

interface DocsIndexPageProps {
  params: Promise<{ slug: string }>
}

export default async function DocsIndexPage({ params }: DocsIndexPageProps) {
  const { slug } = await params
  const tree = await getDocsTree()

  // Redirect to first doc if available
  if (tree.length > 0) {
    const firstDoc = tree[0]
    redirect(`/${slug}/docs/${firstDoc.slug}`)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        No documentation available yet. Add <code>.mdoc</code> files to the{" "}
        <code>content/documentation</code> directory.
      </p>
    </div>
  )
}
