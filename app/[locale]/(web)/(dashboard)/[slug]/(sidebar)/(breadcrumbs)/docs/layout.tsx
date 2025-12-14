import { getDocsNavTree } from "@/lib/docs"
import { DocsNavigation } from "@/components/docs"

interface DocsLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function DocsLayout({ children, params }: DocsLayoutProps) {
  const { slug } = await params
  const tree = await getDocsNavTree()

  return (
    <div className="flex h-full">
      {/* Docs Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <DocsNavigation tree={tree} slug={slug} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
