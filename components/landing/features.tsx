import Image from "next/image"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/global/icons"

interface FeatureItemProps {
  feature:
    | "Authentication"
    | "Database"
    | "Advanced Functionality"
    | "Payment"
    | "Security"
    | "Application"
  heading: string
  description: string
  logo?: string
  icon: keyof typeof Icons
  video?: string
  color: "black" | "emerald" | "blue" | "zinc" | "purple" | "sky"
  features: {
    icon: keyof typeof Icons | undefined
    name: string
  }[]
}

/* 💡 Feature Writing Tips:
  - Lead with benefits, not technical details
  - Keep descriptions concise and clear
  - Group related features together
  - Use action verbs in headings
  - Highlight unique selling points
*/

export function Features() {
  return (
    <section className="min-h-96 p-3" id="features">
      <div className="mx-auto flex w-full flex-col gap-20 md:max-w-7xl">
        {features.map((feature) => {
          const Icon = Icons[(feature.icon as keyof typeof Icons) || "arrowRight"]
          return (
            <div
              className={cn("flex w-full flex-col gap-8 md:grid md:grid-cols-2", {
                "mx-auto max-w-2xl items-center justify-center md:flex md:flex-col": !feature.video,
              })}
              key={feature.feature}
            >
              {feature.video && (
                <div className="border-primary/10 bg-layout size-full h-80 overflow-hidden rounded-3xl border-4 p-2.5 md:h-96">
                  <video
                    className="size-full object-cover"
                    src={feature.video}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
              )}
              <div className="flex w-full flex-col gap-2">
                <h6
                  className={cn(
                    "flex items-center text-lg leading-tight font-semibold tracking-tight md:leading-tight",
                    {
                      "text-black-700": feature.color === "black",
                      "text-emerald-400": feature.color === "emerald",
                      "text-black-600": feature.color === "purple",
                      "text-blue-600": feature.color === "blue",
                      "text-sky-600": feature.color === "sky",
                    }
                  )}
                >
                  <Icon
                    className={cn("mr-2 size-7 rounded-sm p-1", {
                      "bg-black-700/10 text-black-700": feature.color === "black",
                      "bg-emerald-400/10 text-emerald-400": feature.color === "emerald",
                      "bg-purple-700/10 text-purple-700": feature.color === "purple",
                      "bg-zinc-700/10 text-zinc-700": feature.color === "zinc",
                      "bg-blue-600/10 text-blue-600": feature.color === "blue",
                      "bg-sky-600/10 text-sky-600": feature.color === "sky",
                    })}
                  />
                  {feature.feature}
                </h6>
                <span className="text-xl font-semibold">{feature.heading}</span>
                <p className="text-primary/80 text-sm leading-relaxed">{feature.description}</p>

                <div className="mt-2 flex flex-col gap-4">
                  {feature.logo && (
                    <Image
                      src={feature.logo}
                      alt={feature.logo}
                      width={35}
                      height={35}
                      className="object-contain select-none"
                    />
                  )}

                  <div className="grid w-full grid-cols-2 items-center gap-2 md:flex md:flex-wrap">
                    {feature.features.map((item) => {
                      const Icon = Icons[(item.icon as keyof typeof Icons) || "arrowRight"]
                      return (
                        <div
                          className="flex w-full items-center gap-2 rounded-lg border bg-transparent p-2 md:w-48"
                          key={item.name}
                        >
                          {Icon && (
                            <Icon
                              className={cn("size-4", {
                                "text-black-700": feature.color === "black",
                                "text-emerald-400": feature.color === "emerald",
                                "text-violet-600": feature.color === "purple",
                                "text-blue-600": feature.color === "blue",
                                "text-sky-600": feature.color === "sky",
                              })}
                            />
                          )}
                          <p className="text-primary/80 text-sm font-medium">{item.name}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export const features: FeatureItemProps[] = [
  {
    feature: "Authentication",
    heading: "The most comprehensive authentication",
    description:
      "Built on Better-auth with OAuth, Cross domain sessions, email & passwords. Production-ready authentication in minutes with social logins and role-based access control.",
    logo: "https://res.cloudinary.com/dowiygzq3/image/upload/v1740732044/163827765_qn4qmt.png",
    video:
      "https://arbeita.s3.eu-north-1.amazonaws.com/Kevin%E2%80%99s+video-60fps-inline-subtitles-2.mp4",
    color: "black",
    icon: "users",
    features: [
      {
        icon: "wand",
        name: "Magic Links",
      },
      {
        icon: "shieldCheck",
        name: "OAuth 2.0",
      },
      {
        icon: "users",
        name: "Social Auth",
      },
      {
        icon: "shield",
        name: "JWT & Sessions",
      },
      {
        icon: "lock",
        name: "RBAC Ready",
      },
      {
        icon: "zap",
        name: "Zero Config",
      },
      {
        icon: "database",
        name: "Multi-Provider",
      },
      {
        icon: "check",
        name: "Multi sessions",
      },
    ],
  },
  {
    feature: "Database",
    heading: "Serverless PostgreSQL Database",
    description:
      "Built on Neon's serverless PostgreSQL, offering infinite scalability and branching. Enjoy automatic backups, point-in-time recovery, and zero maintenance overhead.",
    logo: "https://res.cloudinary.com/dzdbsfkka/image/upload/v1732127270/neontech_logo_cvq2uo.png",
    video:
      "https://arbeita.s3.eu-north-1.amazonaws.com/Kevin%E2%80%99s+video-60fps-inline-subtitles-3.mp4",
    color: "emerald",
    icon: "database",
    features: [
      {
        icon: "database",
        name: "Serverless",
      },
      {
        icon: "git",
        name: "Branching",
      },
      {
        icon: "infinity",
        name: "Auto-scaling",
      },
      {
        icon: "clock",
        name: "Point-in-time",
      },
      {
        icon: "shield",
        name: "Auto backups",
      },
      {
        icon: "zap",
        name: "Zero downtime",
      },
      {
        icon: "check",
        name: "Multi-region",
      },
      {
        icon: "server",
        name: "Edge cache",
      },
    ],
  },
  {
    feature: "Advanced Functionality",
    heading: "Production-Ready Workspace Features",
    description:
      "Launch with production-ready workspace features including organization management, member roles, and automated onboarding. Everything you need to build a scalable SaaS is built right in.",
    video:
      "https://arbeita.s3.eu-north-1.amazonaws.com/Kevin%E2%80%99s+video-60fps-inline-subtitles-4.mp4",
    color: "zinc",
    icon: "layers",
    features: [
      {
        icon: "users",
        name: "Organizations",
      },
      {
        icon: "userPlus",
        name: "Team Members",
      },
      {
        icon: "mail",
        name: "Invitations",
      },
      {
        icon: "rocket",
        name: "Onboarding",
      },
      {
        icon: "settings",
        name: "Custom roles",
      },
      {
        icon: "bell",
        name: "Notifications",
      },
      {
        icon: "layers",
        name: "Server Actions",
      },
      {
        icon: "zap",
        name: "TRPC",
      },
      {
        icon: "actions",
        name: "API Routes",
      },
    ],
  },
  {
    feature: "Payment",
    heading: "Flexible Payment Solutions",
    description:
      "Built-in subscription management and payment processing. Handle one-time payments, recurring subscriptions, and automated billing with ease.",
    video:
      "https://arbeita.s3.eu-north-1.amazonaws.com/Kevin%E2%80%99s+video+%F0%9F%AA%90-60fps-inline-subtitles-2.mp4",
    color: "purple",
    logo: "https://res.cloudinary.com/dowiygzq3/image/upload/v1732128267/Stripe_wordmark_-_blurple_small_eh6npj.png",
    icon: "creditCard",
    features: [
      {
        icon: "creditCard",
        name: "One-time Payments",
      },
      {
        icon: "clock",
        name: "Monthly/Yearly Plans",
      },
      {
        icon: "refresh",
        name: "Auto-billing",
      },
      {
        icon: "receipt",
        name: "Invoice Management",
      },
      {
        icon: "settings",
        name: "Flexible Pricing",
      },
      {
        icon: "shield",
        name: "Secure Checkout",
      },
    ],
  },
  {
    feature: "Security",
    heading: "Battle-Tested Security Built-in",
    description:
      "Built-in security for all API endpoints and server actions. Protect your application with auth checks and rate limiting powered by Upstash Redis, ensuring robust security at every layer.",
    color: "blue",
    icon: "shield",
    features: [
      {
        icon: "shield",
        name: "Auth Protected APIs",
      },
      {
        icon: "lock",
        name: "Secure Actions",
      },
      {
        icon: "timer",
        name: "Rate Limiting",
      },
      {
        icon: "database",
        name: "Redis Cache",
      },
      {
        icon: "shieldCheck",
        name: "CSRF Protection",
      },
      {
        icon: "server",
        name: "Edge Security",
      },
    ],
  },
  {
    feature: "Application",
    heading: "Production-Ready Dashboard & UI",
    description:
      "Launch with a complete TypeScript application including both landing page and dashboard. Packed with pre-built components, form validation, and routing logic - everything you need to build a professional SaaS.",
    color: "sky",
    logo: "https://res.cloudinary.com/dowiygzq3/image/upload/v1732129174/Typescript_logo_2020.svg_fo4mqz.png",
    icon: "blocks",
    features: [
      {
        icon: "layout",
        name: "Landing + Dashboard",
      },
      {
        icon: "code",
        name: "100% TypeScript",
      },
      {
        icon: "component",
        name: "UI Components",
      },
      {
        icon: "formInput",
        name: "Form Validation",
      },
      {
        icon: "route",
        name: "Routing Logic",
      },
      {
        icon: "sidebar",
        name: "Navigation Ready",
      },
    ],
  },
]
