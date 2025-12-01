import { Metadata } from "next"

import { ROUTES } from "@/lib/routes"
import { By } from "@/components/landing/by"
import { CallToAction } from "@/components/landing/cta"
import { Faq } from "@/components/landing/faq"
import { Features } from "@/components/landing/features"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { Hero } from "@/components/landing/hero"
import { PricingComparator } from "@/components/landing/pricing-comparator"
import { Problem } from "@/components/landing/problem"
import { Testimonials } from "@/components/landing/testimonials"

export const metadata: Metadata = ROUTES.home.metadata

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Problem />
      <FeaturesGrid />
      <Features />
      <Faq />
      <Testimonials />
      <PricingComparator />
      <By />
      <CallToAction />
    </main>
  )
}
