import { Check, X } from "lucide-react"

export function Problem() {
  return (
    <section className="mx-auto flex w-full flex-col items-center justify-center border-y py-16 md:py-32">
      {/* 💡 Problem Statement Tips:
        - Start with a relatable pain point
        - Use question format to engage readers
        - Keep it short and emotionally resonant
        - Focus on the core frustration
      */}
      <h2 className="mb-12 max-w-[25ch] text-center text-3xl font-semibold tracking-tight md:mb-20 md:text-5xl">
        How is this template different?
      </h2>

      <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-start md:gap-12">
        {/* 💡 Pain Points Tips:
          - List specific, relatable challenges
          - Use negative statements to highlight problems
          - Keep points brief and clear
          - Focus on common developer frustrations
          - Order from most to least impactful
        */}
        <div className="max-w-md rounded-lg bg-rose-100/30 p-8 text-rose-700 md:w-[27rem] md:p-12 dark:bg-rose-100/75 dark:text-rose-800">
          <h3 className="mb-4 text-lg font-bold">Other templates</h3>
          <ul className="list-inside list-disc space-y-1.5 text-sm font-medium">
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              No onboarding flow
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              Basic landing page
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              Basic authentication
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              Simple dashboard (if any)
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              Typically just API routes
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              No server actions / TRPC
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              No organizational support
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              No custom roles, members or invitations
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              No multi sessions
            </li>
            <li className="flex items-center gap-2">
              <X className="size-4 text-current opacity-75" />
              Missing documentation
            </li>
          </ul>
        </div>

        {/* 💡 Solution Tips:
          - Mirror pain points with solutions
          - Use positive, action-oriented language
          - Highlight unique selling points
          - Emphasize quick wins and benefits
          - Include specific features from README
        */}
        <div className="w-11/12 max-w-md rounded-lg bg-emerald-100/30 p-8 text-emerald-700 md:w-[27rem] md:p-12 dark:bg-emerald-100/75 dark:text-emerald-800">
          <h3 className="mb-4 text-lg font-bold">This template</h3>
          <ul className="list-inside list-disc space-y-1.5 text-sm font-medium">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Onboarding flow
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Multi-workspace support with invitations
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Built in notifications
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Members, roles and permissions (RBAC)
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Multi session and domain sessions
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Integrated Stripe payments and subscriptions
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Server Actions / API Routes / TRPC
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Lightweight with minimal dependencies
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Well documented
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-current opacity-75" />
              Plus much more...
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
