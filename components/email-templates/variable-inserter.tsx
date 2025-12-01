"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"

import { useTemplateVariables } from "@/trpc/hooks/email-hooks"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

interface VariableInserterProps {
  eventId: string
  onInsert: (variable: string) => void
  onFocus?: () => void
}

export function VariableInserter({ eventId, onInsert, onFocus }: VariableInserterProps) {
  const t = useTranslations("emailTemplate")

  const { data: variables } = useTemplateVariables(eventId)

  const groups = useMemo(() => {
    if (!variables) return []

    return Object.entries(variables).map(([groupKey, vars]) => ({
      label: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
      variables: (vars as Array<{ key: string; description: string }>).map((v) => ({
        key: v.key,
        description: v.description,
      })),
    }))
  }, [variables])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onFocus}
        >
          <Icons.code className="mr-1.5 h-3 w-3" />
          {t("insertVariable")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.variables.map((v) => (
                  <CommandItem
                    key={v.key}
                    onSelect={() => onInsert(v.key)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <code className="text-xs font-mono text-primary">{v.key}</code>
                    <span className="text-xs text-muted-foreground">{v.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
