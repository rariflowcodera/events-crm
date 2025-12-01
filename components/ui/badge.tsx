import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center  cursor-default justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 transition-[color,box-shadow]  focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm [a&]:hover:bg-destructive/90",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        green: "bg-green-500/10 text-green-600 border-transparent hover:bg-green-500/20",
        purple: "bg-violet-500/10 text-violet-600 border-transparent hover:bg-violet-500/10",
        low: "h-7 text-[11px] font-normal   cursor-default bg-green-400/5 text-green-600 border-transparent hover:bg-green-400/5",
        medium:
          "h-7 text-[11px] font-normal   cursor-default bg-yellow-400/5 text-yellow-600 border-transparent hover:bg-yellow-400/5",
        high: "h-7 text-[11px] font-normal   cursor-default bg-orange-400/5 text-orange-600 border-transparent hover:bg-orange-400/5",
        urgent:
          "h-7 text-[11px] font-normal   cursor-default bg-red-400/5 text-red-500 border-transparent hover:bg-red-400/5",
        subscription:
          "bg-purple-600/10 dark:bg-purple-500/10 h-7 text-purple-600 dark:text-purple-500 border-purple-600/10 dark:border-purple-500/10 hover:bg-purple-600/10 dark:hover:bg-purple-500/10 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
