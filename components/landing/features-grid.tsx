import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "Tailwind CSS v4",
    description:
      "Tailwind CSS v4.0 is an all-new version of the framework optimized for performance and flexibility.",
  },
  {
    title: "Shadcn UI",
    description:
      "Built with Radix UI and ShadCN UI components. Enjoy a consistent and modern design system.",
  },
  {
    title: "Authentication",
    description:
      "Secure authentication with password, magic link, and social logins. Boost conversions while protecting user data.",
  },
  {
    title: "Email verification",
    description:
      "Robust verification that enhances security and reduces fraud. Ensures reliable user communication.",
  },
  {
    title: "Multi sessions",
    description:
      "Maintain multiple active sessions across devices with seamless switching. Perfect for teams.",
  },
  {
    title: "Workspaces",
    description:
      "Organize with dedicated workspaces that scale with user needs. From solo founders to enterprise teams.",
  },
  {
    title: "Members",
    description:
      "Easily invite and collaborate with team members. Maintain granular control over permissions.",
  },
  {
    title: "Roles (RBAC)",
    description:
      "Role-based access control that simplifies security management. Ensures appropriate access levels.",
  },
  {
    title: "Workspace ownership transfer",
    description:
      "Smooth ownership transitions that maintain business continuity. Essential during team changes or acquisitions.",
  },
  {
    title: "Stripe Payments",
    description:
      "Stripe integration for subscriptions and one-time payments. Supports usage-based billing with minimal setup.",
  },
  {
    title: "Onboarding",
    description:
      "Guided flows that reduce time-to-value. Help users discover your product's potential.",
  },
  {
    title: "Settings",
    description: "Intuitive panels for users and workspaces. Put control in your customers' hands.",
  },
  {
    title: "Notifications",
    description: "Real-time alerts that keep users engaged. Stay informed about important updates.",
  },
  {
    title: "Dashboard",
    description:
      "Data-rich dashboards providing actionable insights. Improve engagement from day one.",
  },
  {
    title: "Admin",
    description:
      "Powerful admin panels for complete oversight. Control users and system operations easily.",
  },
  {
    title: "Analytics",
    description:
      "Built-in insights into user behavior. Track feature adoption and business metrics.",
  },
  {
    title: "API Routes",
    description:
      "Structured API routes for seamless integration. Connect with external services easily.",
  },
  {
    title: "Server Actions",
    description:
      "Secure server-side operations for lightning-fast experiences. Minimize client-side code.",
  },
  {
    title: "TRPC",
    description:
      "Typesafe APIs that eliminate boilerplate. Enjoy superior developer experience with type safety.",
  },
  {
    title: "React-query",
    description:
      "Leverage the combination of server-side and client fetching with caching and optimistic updates.",
  },
  {
    title: "Rate limiting",
    description:
      "Protect API endpoints from abuse. Ensure fair usage and maintain optimal performance.",
  },
  {
    title: "Documentation",
    description:
      "Searchable docs that help users maximize value. Reduce support needs and accelerate adoption.",
  },
  {
    title: "Landing",
    description:
      "Optimized landing pages that showcase your product. Turn visitors into paying customers.",
  },
  {
    title: "Mobile friendly",
    description:
      "Responsive design for premium experience on all devices. From desktop to smartphone.",
  },
  {
    title: "Lightweight",
    description:
      "Minimal dependencies for faster load times and better performance. Reduce bundle size and maintenance overhead.",
  },
  {
    title: "SEO friendly",
    description:
      "Built-in SEO optimizations for better search rankings. Drive organic traffic with semantic HTML and metadata.",
  },
  {
    title: "No Vendor lock-in",
    description:
      "Open architecture with standard technologies. Freedom to customize or migrate without restrictive dependencies.",
  },
]

export function FeaturesGrid() {
  return (
    <div className="mx-auto my-10 max-w-7xl space-y-10 border-b px-4 py-20">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-center text-3xl font-semibold">Features overview</h3>
        <p className="w-full text-center text-base md:w-[40ch] md:text-lg">
          List of features that will help you build your SaaS faster and more efficient.
        </p>
      </div>
      <div className="mb-24 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
        {features.map((feature) => (
          <Card className="bg-card/30 rounded-md" key={feature.title}>
            <CardHeader>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
