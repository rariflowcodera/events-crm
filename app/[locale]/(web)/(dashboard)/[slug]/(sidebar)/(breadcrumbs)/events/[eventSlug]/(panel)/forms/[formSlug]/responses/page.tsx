import { FormResponsesPageClient } from "./client"

interface FormResponsesPageProps {
  params: Promise<{
    locale: string
    slug: string
    eventSlug: string
    formSlug: string
  }>
}

export default async function FormResponsesPage({ params }: FormResponsesPageProps) {
  const { slug, eventSlug, formSlug } = await params

  return (
    <FormResponsesPageClient
      workspaceSlug={slug}
      eventSlug={eventSlug}
      formSlug={formSlug}
    />
  )
}

export async function generateMetadata({ params }: FormResponsesPageProps) {
  return {
    title: "Form Responses",
    description: "View and manage form responses",
    robots: "noindex, nofollow",
  }
}
