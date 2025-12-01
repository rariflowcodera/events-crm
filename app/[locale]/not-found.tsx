import { RestrictedContent } from "@/components/global/restricted-content"

export default function NotFund() {
  return (
    <RestrictedContent
      title="404 - Page Not Found"
      description="The page you are looking for does not exist."
      ctaText="Go back to App"
    />
  )
}
