import { Metadata } from "next"

import { configuration } from "@/lib/config"
import { ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.privacy.metadata

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <div className="prose prose-gray dark:prose-invert mx-auto flex flex-col gap-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        </div>

        <div>
          Your privacy is important to us. It is {configuration.site.name} template&apos;s policy to
          respect your privacy regarding any information we may collect from you across our website,
          and other sites we own and operate.
          <br />
          <br />
          We only ask for personal information when we truly need it to provide a service to you. We
          collect it by fair and lawful means, with your knowledge and consent. We also let you know
          why we&apos;re collecting it and how it will be used.
          <br />
          <br />
          You can sign up with your Google account so your {configuration.site.name} template&apos;s
          account username will be prefilled with your name and your public profile picture.
          <br />
          <br />
          We only retain collected information for as long as necessary to provide you with your
          requested service. What data we store, we&apos;ll protect within commercially acceptable
          means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use
          or modification.
          <br />
          <br />
          We don&apos;t share any personally identifying information publicly or with third-parties,
          except when required to by law.
          <br />
          <br />
          We act in the capacity of a data controller and a data processor with regard to the
          personal data processed through {configuration.site.name} template and the services in
          terms of the applicable data protection laws, including the EU General Data Protection
          Regulation (GDPR).
          <br />
          <br />
          Our website may link to external sites that are not operated by us. Please be aware that
          we have no control over the content and practices of these sites, and cannot accept
          responsibility or liability for their respective privacy policies.
          <br />
          <br />
          You are free to refuse our request for your personal information, with the understanding
          that we may be unable to provide you with some of your desired services.
          <br />
          <br />
          Your continued use of our website will be regarded as acceptance of our practices around
          privacy and personal information. If you have any questions about how we handle user data
          and personal information, feel free to contact us.
          <br />
          <br />
          This policy is effective as of 25 November 2024.
        </div>
      </div>
    </main>
  )
}
