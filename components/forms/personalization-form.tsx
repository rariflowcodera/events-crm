"use client"

import Image from "next/image"
import UiDark from "@/public/ui-dark.png"
import UiLight from "@/public/ui-light.png"
import UiSystem from "@/public/ui-system.png"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { CardContent, CardHeader } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Icons } from "@/components/global/icons"

type PersonalizationFormProps = {
  className?: string
}

const items = [
  { id: "light-mode", value: "light", label: "Light", image: UiLight },
  { id: "dark-mode", value: "dark", label: "Dark", image: UiDark },
  { id: "system-mode", value: "system", label: "System", image: UiSystem },
]

export function PersonalizationForm({ className }: PersonalizationFormProps) {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset className={cn("", className)}>
      <CardHeader>
        <legend className="text-foreground text-sm leading-none font-medium">Choose a theme</legend>
      </CardHeader>
      <CardContent>
        <RadioGroup className="flex gap-x-3" defaultValue={theme}>
          {items.map((item) => (
            <label key={item.id}>
              <RadioGroupItem
                id={item.id}
                value={item.value}
                className="peer sr-only after:absolute after:inset-0"
                onClick={() => setTheme(item.value)}
              />
              <Image
                src={item.image}
                alt={item.label}
                width={88}
                height={70}
                className="border-input shadow-primary/[.04] ring-offset-background peer-focus-visible:ring-ring/70 peer-data-[state=checked]:border-ring peer-data-[state=checked]:bg-accent relative cursor-pointer overflow-hidden rounded-lg border shadow-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50"
              />
              <span className="x-1 group peer-data-[state=unchecked]:text-muted-foreground/70 mt-2 flex items-center">
                <Icons.check
                  size={16}
                  strokeWidth={2}
                  className="in-[.group]:peer-data-[state=unchecked]:hidden"
                  aria-hidden="true"
                />
                <Icons.minus
                  size={16}
                  strokeWidth={2}
                  className="in-[.group]:peer-data-[state=checked]:hidden"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">{item.label}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </CardContent>
    </fieldset>
  )
}
