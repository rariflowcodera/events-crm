import { Metadata } from "next"

import { configuration } from "@/lib/config"
import { ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.terms.metadata

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <div className="prose prose-gray dark:prose-invert mx-auto flex flex-col gap-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Terms and Conditions</h1>
        </div>

        <div>
          <h2 className="font-semibold">1. Introduction</h2>
          <p>
            By using {configuration.site.name} template you confirm your acceptance of, and agree to
            be bound by, these terms and conditions.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">2. Agreement to Terms and Conditions</h2>
          <p>
            This Agreement takes effect on the date on which you first use the{" "}
            {configuration.site.name} template application.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">
            3. Unlimited Access Software License with Termination Rights
          </h2>
          <p>
            The {configuration.site.name} template Software License facilitates the acquisition of{" "}
            {configuration.site.name} template software through a single purchase, granting users
            unrestricted and perpetual access to its comprehensive functionalities. Tailored for
            independent creators, entrepreneurs, and small businesses, {configuration.site.name}{" "}
            template empowers users to create compelling web pages and online portfolios.
          </p>
          <p>
            This license entails a straightforward and flexible arrangement, exempting users from
            recurring fees or subscriptions. However, it is important to acknowledge that the
            licensor retains the right to terminate the license without conditions or prerequisites.
            This termination provision enables the licensor to exercise control over software
            distribution and utilization.
          </p>
          <p>
            Opting for the {configuration.site.name} template Software License enables users to
            enjoy the benefits of the software while recognizing the licensor&apos;s unrestricted
            termination rights, which provide adaptability and address potential unforeseen
            circumstances.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">4. Refunds</h2>
          <p>
            Due to the nature of digital products, the {configuration.site.name} template
            boilerplate cannot be refunded or exchanged once access is granted.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">5. Disclaimer</h2>
          <p>
            It is not warranted that {configuration.site.name} template will meet your requirements
            or that its operation will be uninterrupted or error free. All express and implied
            warranties or conditions not stated in this Agreement (including without limitation,
            loss of profits, loss or corruption of data, business interruption or loss of
            contracts), so far as such exclusion or disclaimer is permitted under the applicable law
            are excluded and expressly disclaimed. This Agreement does not affect your statutory
            rights.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">6. Warranties and Limitation of Liability</h2>
          <p>
            {configuration.site.name} template does not give any warranty, guarantee or other term
            as to the quality, fitness for purpose or otherwise of the software.{" "}
            {configuration.site.name} template shall not be liable to you by reason of any
            representation (unless fraudulent), or any implied warranty, condition or other term, or
            any duty at common law, for any loss of profit or any indirect, special or consequential
            loss, damage, costs, expenses or other claims (whether caused by{" "}
            {configuration.site.name} template&apos;s negligence or the negligence of its servants
            or agents or otherwise) which arise out of or in connection with the provision of any
            goods or services by {configuration.site.name} template.
          </p>
          <p>
            {configuration.site.name} template shall not be liable or deemed to be in breach of
            contract by reason of any delay in performing, or failure to perform, any of its
            obligations if the delay or failure was due to any cause beyond its reasonable control.
            Notwithstanding contrary clauses in this Agreement, in the event that{" "}
            {configuration.site.name} template are deemed liable to you for breach of this
            Agreement, you agree that {configuration.site.name} template&apos;s liability is limited
            to the amount actually paid by you for your services or software, which amount
            calculated in reliance upon this clause. You hereby release {configuration.site.name}{" "}
            template from any and all obligations, liabilities and claims in excess of this
            limitation.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">7. Responsibilities</h2>
          <p>
            {configuration.site.name} template is not responsible for what the user does with the
            user-generated content.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">8. Price Adjustments</h2>
          <p>
            As we continue to improve {configuration.site.name} template and expand our offerings,
            the price may increase. The discount is provided to help customers secure the current
            price without being surprised by future increases.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">9. General Terms and Law</h2>
          <p>
            This Agreement is governed by the laws of Singapore. You acknowledge that no joint
            venture, partnership, employment, or agency relationship exists between you and{" "}
            {configuration.site.name}
            template as a result of your use of these services. You agree not to hold yourself out
            as a representative, agent or employee of {configuration.site.name} template. You agree
            that {configuration.site.name}
            template will not be liable by reason of any representation, act or omission to act by
            you.
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Last updated: 21 June 2024</p>
        </div>
      </div>
    </main>
  )
}
