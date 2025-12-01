import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarInset } from "@/components/ui/sidebar"
import { Breadcrumbs } from "@/components/global/breadcrumbs"

type MainLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function MainLayout({ children, params }: MainLayoutProps) {
  const { slug } = await params

  return (
    <SidebarInset aria-label="Main content" className="bg-os-background-100">
      <Breadcrumbs slug={slug} />
      <ScrollArea className="h-full flex-1">
        <div className="pb-20">{children}</div>
      </ScrollArea>
    </SidebarInset>
  )
}
