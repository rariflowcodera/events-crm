"use client"

import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Icons } from "@/components/global/icons"

export function UserButtonThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenuItem
      onClick={(e) => e.preventDefault()}
      className="flex cursor-default items-center justify-between text-sm focus:bg-transparent"
    >
      <span>Theme</span>
      <RadioGroup
        defaultValue={theme}
        onValueChange={setTheme}
        className="flex items-center gap-x-1 rounded-full border"
      >
        <ActionTooltip label="System">
          <div className="flex items-center">
            <RadioGroupItem
              value="system"
              id="system"
              className={cn(
                "flex size-6 items-center justify-center border border-transparent transition-colors hover:bg-muted",
                {
                  "border-border": theme === "system",
                }
              )}
              icon={
                <Icons.laptop
                  className={cn("size-3.5 text-muted-foreground", {
                    "text-primary": theme === "system",
                  })}
                />
              }
            />

            <Label htmlFor="system" className="sr-only">
              System theme
            </Label>
          </div>
        </ActionTooltip>

        <ActionTooltip label="Light">
          <div className="flex items-center">
            <RadioGroupItem
              value="light"
              id="light"
              className={cn(
                "flex size-6 items-center justify-center border border-transparent transition-colors hover:bg-muted",
                {
                  "border-border": theme === "light",
                }
              )}
              icon={
                <Icons.sun
                  className={cn("size-3.5 text-muted-foreground", {
                    "text-primary": theme === "light",
                  })}
                />
              }
            />

            <Label htmlFor="light" className="sr-only">
              Light theme
            </Label>
          </div>
        </ActionTooltip>

        <ActionTooltip label="Dark">
          <div className="flex items-center">
            <RadioGroupItem
              value="dark"
              id="dark"
              className={cn(
                "flex size-6 items-center justify-center border border-transparent transition-colors hover:bg-muted",
                {
                  "border-border": theme === "dark",
                }
              )}
              icon={
                <Icons.moon
                  className={cn("size-3.5 text-muted-foreground", {
                    "text-primary": theme === "dark",
                  })}
                />
              }
            />

            <Label htmlFor="dark" className="sr-only">
              Dark theme
            </Label>
          </div>
        </ActionTooltip>
      </RadioGroup>
    </DropdownMenuItem>
  )
}
