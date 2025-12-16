import { getDocsNavTree } from "@/lib/docs"
import { DocsNavigation, DocsExportButton } from "@/components/docs"

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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Docs Header with Export Button */}
        <div className="flex shrink-0 items-center justify-end border-b px-4 py-2">
          <DocsExportButton />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
