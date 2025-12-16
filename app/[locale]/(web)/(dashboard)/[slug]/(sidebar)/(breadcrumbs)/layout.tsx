import { SidebarInset } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/global/breadcrumbs"

type MainLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function MainLayout({ children, params }: MainLayoutProps) {
  const { slug } = await params

  return (
    <SidebarInset aria-label="Main content" className="bg-os-background-100 flex flex-col h-full overflow-hidden">
      <Breadcrumbs slug={slug} />
      <div className="flex-1 overflow-auto min-h-0">{children}</div>
    </SidebarInset>
  )
}
