import { Metadata } from "next"

import { configuration } from "@/lib/config"
import { ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.license.metadata

export default function LicensePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <div className="prose prose-gray dark:prose-invert mx-auto flex flex-col gap-y-8">
        <div>
          <h1 className="text-3xl font-semibold">
            {configuration.site.name} Template Boilerplate License Agreement
          </h1>
        </div>

        <div>
          <h4 className="text-lg font-semibold">TL;DR;</h4>
          <h4 className="text-lg">
            <strong>Personal License: </strong>Build unlimited projects as an individual.
          </h4>
          <h4 className="text-lg">
            <strong>Team License: </strong>Build unlimited projects as a team.
          </h4>
        </div>

        <div>
          This License Agreement (&apos;Agreement&apos;) is entered into between{" "}
          {configuration.site.name} Template, represented by Kevin Nguyen, whose contact information
          is kevinminh.ng@gmail.com, and you, the user (&apos;Licensee&apos;), regarding the use of
          the {configuration.site.name} Template coding boilerplate (the &apos;Product&apos;)
          available at
          {process.env.NEXTAUTH_URL} (the &apos;Website&apos;). By downloading, accessing, or using
          the Product, Licensee agrees to be bound by the terms and conditions of this Agreement.
        </div>

        <span className="text-lg font-semibold">1. Grant of License</span>
        <div className="flex flex-col gap-y-8">
          <span className="font-semibold">1.1 Personal License</span>
          <span>
            Subject to the terms and conditions of this Agreement, {configuration.site.name}{" "}
            Template grants Licensee a non-exclusive, non-transferable, and non-sublicensable
            Personal License to use the
            {configuration.site.name} Template coding boilerplate for the following purposes:
          </span>
          <ul>
            <li>Create unlimited projects.</li>
            <li>Build and develop applications or websites for personal use or commercial use.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-y-8">
          <span className="font-semibold">1.2 Team License</span>
          <span>
            Subject to the terms and conditions of this Agreement, {configuration.site.name}{" "}
            Template grants Licensee a non-exclusive, non-transferable, and non-sublicensable Team
            License to use the {configuration.site.name}
            Template coding boilerplate for the following purposes:
          </span>
          <ul>
            <li>Create unlimited projects.</li>
            <li>Build and develop applications or websites as part of a team.</li>
            <li>Share the code with other members of the team.</li>
          </ul>
        </div>

        <span className="text-lg font-semibold">2. Restrictions</span>
        <div className="flex flex-col gap-y-8">
          <span>Licensee shall not:</span>
          <ul>
            <li>
              Resell or redistribute the {configuration.site.name} Template boilerplate as a
              standalone product.
            </li>
            <li>
              Remove, alter, or obscure any copyright, trademark, or other proprietary notices from
              the {configuration.site.name} Template boilerplate.
            </li>
            <li>
              Use the {configuration.site.name} Template boilerplate in any way that violates
              applicable laws, regulations, or third-party rights.
            </li>
            <li>
              Sub-license, rent, lease, or transfer the {configuration.site.name} Template
              boilerplate or any rights granted under this Agreement.
            </li>
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-y-10">
          <div className="grid gap-y-4">
            <span className="text-lg font-semibold">3. Ownership and Intellectual Property</span>
            <span>
              {configuration.site.name} Template retains all ownership and intellectual property
              rights in and to the
              {configuration.site.name} Template boilerplate. This Agreement does not grant Licensee
              any ownership rights in the {configuration.site.name} Template boilerplate.
            </span>
          </div>
          <div className="grid gap-y-4">
            <span className="text-lg font-semibold">4. Warranty and Disclaimer</span>
            <span>
              THE {configuration.site.name} TEMPLATE BOILERPLATE IS PROVIDED &apos;AS IS&apos;
              WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED
              TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
              NONINFRINGEMENT.
            </span>
          </div>
          <div className="grid gap-y-4">
            <span className="text-lg font-semibold">5. Limitation of Liability</span>
            <span>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {configuration.site.name} TEMPLATE
              SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO THE USE OR INABILITY TO USE THE{" "}
              {configuration.site.name} TEMPLATE BOILERPLATE, EVEN IF {configuration.site.name}{" "}
              TEMPLATE HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </span>
          </div>
          <div className="grid gap-y-4">
            <span className="text-lg font-semibold">6. Covering Law and Jurisdiction</span>
            <span>
              This Agreement shall be governed by and construed in accordance with the laws of
              Norway, without regard to its conflict of law principles. Any dispute arising out of
              or in connection with this Agreement shall be subject to the exclusive jurisdiction of
              the courts located in Norway.
            </span>
          </div>
          <div className="grid gap-y-4">
            <span className="text-lg font-semibold">7. Entire Agreement</span>
            <span>
              This Agreement constitutes the entire agreement between Licensee and{" "}
              {configuration.site.name} Template concerning the subject matter herein and supersedes
              all prior or contemporaneous agreements, representations, warranties, and
              understandings.
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span>Last updated: 2024-11-25</span>
          <span>{configuration.site.name} Template</span>
          <span>Contact Information: kevinminh.ng@gmail.com</span>
        </div>
      </div>
    </main>
  )
}
