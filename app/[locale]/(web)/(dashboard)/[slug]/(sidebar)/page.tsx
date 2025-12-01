import { RedirectType } from "next/navigation"

import { redirectToRoute } from "@/lib/routes"

type SlugPageProps = {
  params: Promise<{ slug: string }>
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params

  return redirectToRoute("dashboard", { slug }, RedirectType.replace)
}
