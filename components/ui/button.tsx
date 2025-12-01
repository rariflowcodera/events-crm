import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex active:scale-[.99] cursor-pointer gap-2  items-center justify-center whitespace-nowrap rounded-md text-sm font-medium  transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [%_svg]:shrink-0 ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 ring-offset-background  ",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-4 hover:ring-primary/10",
        important:
          " bg-red-500 text-primary-foreground dark:text-white  hover:bg-red-500/90 ring-red-500/10 dark:ring-red-500/10 hover:ring-4  hover:ring-red-500/10",
        destructive:
          "bg-red-500  dark:bg-red-500/10 border-red-500/30 border text-white dark:text-red-500 dark:hover:text-red-500 hover:text-white hover:bg-red-500/80 dark:hover:bg-red-500/20",
        outline:
          "border border-input bg-background hover:bg-accent/30 hover:text-accent-foreground",
        secondary: "bg-muted/60 text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-primary/[0.03] dark:hover:bg-primary/5 rounded-md hover:text-accent-foreground text-primary/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 px-2 py-0 has-[>svg]:px-2 text-xs",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md  px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
