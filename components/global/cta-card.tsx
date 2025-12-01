import Link from "next/link"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/global/icons"

type CtaCardProps = {
  color: "blue" | "green" | "purple" | "orange"
  href: string
  heading: string
  description: string
  icon: keyof typeof Icons
}

export function CtaCard({ color, href, heading, description, icon }: CtaCardProps) {
  const Icon = Icons[icon]
  return (
    <Link prefetch href={href}>
      <Card className="h-56 py-6 shadow-md hover:shadow-lg">
        <CardContent className="flex h-full flex-col justify-between pb-0">
          <div
            className={cn("flex size-9 items-center justify-center rounded-full", {
              "bg-blue-400/10": color === "blue",
              "bg-green-400/10": color === "green",
              "bg-purple-400/10": color === "purple",
              "bg-orange-400/10": color === "orange",
            })}
          >
            <Icon
              className={cn("size-5", {
                "text-blue-500": color === "blue",
                "text-green-500": color === "green",
                "text-purple-500": color === "purple",
                "text-orange-500": color === "orange",
              })}
            />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-base">{heading}</CardTitle>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
