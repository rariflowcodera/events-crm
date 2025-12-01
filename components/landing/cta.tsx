import Link from "next/link"

import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section className="border-b py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-semibold text-balance lg:text-5xl">Start Building</h2>
          <p className="mt-4">
            Don&apos;t waste time, launch your SaaS in minutes instead of months.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="https://app.boringtemplate.com" target="_blank">
                <span>Demo</span>
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="https://docs.boringtemplate.com" target="_blank">
                <span>Documentation</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
