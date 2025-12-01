import Link from "next/link"
import { Layers, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

const tableData = [
  {
    feature: "Rate limiting",
    Shipfast: "Limited",
    boringtemplate: "All",
    opensource: "None",
  },
  {
    feature: "Validation",
    Shipfast: "Limited",
    boringtemplate: "All",
    opensource: "None",
  },
  {
    feature: "File uploads",
    Shipfast: "None",
    boringtemplate: "All",
    opensource: "None",
  },
  {
    feature: "Database",
    Shipfast: "MongoDB",
    boringtemplate: "PostgreSQL / Any",
    opensource: "None",
  },
  {
    feature: "ORM",
    Shipfast: "Prisma",
    boringtemplate: "Drizzle",
    opensource: "Prisma",
  },
  {
    feature: "Tailwind CSS",
    Shipfast: "V3",
    boringtemplate: "V4",
    opensource: "V3",
  },
  {
    feature: "UI",
    Shipfast: "Custom",
    boringtemplate: "Shadcn UI",
    opensource: "Shadcn UI",
  },
  {
    feature: "Authentication",
    Shipfast: "Next-auth",
    boringtemplate: "Better-auth",
    opensource: "Clerk",
  },
  {
    feature: "Multi-sessions",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
  {
    feature: "API routes",
    Shipfast: true,
    boringtemplate: true,
    opensource: true,
  },
  {
    feature: "Server actions",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
  {
    feature: "tRPC",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },

  {
    feature: "Workspaces / Organizations",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
  {
    feature: "Members",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
  {
    feature: "Roles & Permissions",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
  {
    feature: "Invitations",
    Shipfast: false,
    boringtemplate: true,
    opensource: false,
  },
]

export function PricingComparator() {
  return (
    <section id="compare" className="hidden border-y py-16 md:block md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="w-full overflow-auto lg:overflow-visible">
          <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5"></th>
                <th className="space-y-3">
                  <span className="block">Shipfast</span>

                  <Button asChild variant="outline" size="sm">
                    <Link href="https://shipfa.st/" target="_blank">
                      Read more
                    </Link>
                  </Button>
                </th>
                <th className="space-y-3">
                  <span className="block">Open-source</span>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href="https://github.com/michaelshimeles/nextjs-starter-kit"
                      target="_blank"
                    >
                      Read more
                    </Link>
                  </Button>
                </th>
                <th className="bg-muted space-y-3 rounded-t-(--radius) px-4">
                  <span className="block">Boring template</span>
                  <Button asChild size="sm">
                    <Link href="https://docs.boringtemplate.com" target="_blank">
                      See docs
                    </Link>
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody className="text-caption text-sm">
              <tr className="*:py-3">
                <td className="flex items-center gap-2 font-medium">
                  <Layers className="size-4" />
                  <span>Features</span>
                </td>
                <td></td>
                <td></td>
                <td className="bg-muted border-none px-4"></td>
              </tr>
              {tableData.slice(-13).map((row, index) => (
                <tr key={index} className="*:border-b *:py-3">
                  <td className="text-muted-foreground">{row.feature}</td>
                  <td>
                    {row.Shipfast === true ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      row.Shipfast
                    )}
                  </td>

                  <td>
                    {row.opensource === true ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      row.opensource
                    )}
                  </td>

                  <td className="bg-muted border-none px-4">
                    <div className="-mb-3 border-b py-3">
                      {row.boringtemplate === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.boringtemplate
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="*:pt-8 *:pb-3">
                <td className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4" />
                  <span>Security</span>
                </td>
                <td></td>
                <td></td>
                <td className="bg-muted border-none px-4"></td>
              </tr>
              {tableData.slice(0, 3).map((row, index) => (
                <tr key={index} className="*:border-b *:py-3">
                  <td className="text-muted-foreground">{row.feature}</td>
                  <td>
                    {row.Shipfast === true ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      row.Shipfast
                    )}
                  </td>

                  <td>
                    {row.opensource === true ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      row.opensource
                    )}
                  </td>

                  <td className="bg-muted border-none px-4">
                    <div className="-mb-3 border-b py-3">
                      {row.boringtemplate === true ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        row.boringtemplate
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="*:py-6">
                <td></td>
                <td></td>
                <td></td>
                <td className="bg-muted rounded-b-(--radius) border-none px-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
