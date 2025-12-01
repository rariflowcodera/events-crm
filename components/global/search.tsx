"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTheme } from "next-themes"

import { createRoute } from "@/lib/routes"
import { useCreateWorkspaceModal } from "@/hooks/use-create-workspace-modal"
import { useOS } from "@/hooks/use-os"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Icons } from "@/components/global/icons"

export function Search() {
  const params = useParams()
  const slug = params.slug as string
  const [open, setOpen] = useState(false)
  const { setTheme } = useTheme()

  const os = useOS()

  const { open: openCreateWorkspaceModal } = useCreateWorkspaceModal()

  const handleCreateWorkspace = () => {
    openCreateWorkspaceModal()
    setOpen(false)
  }

  // Simple keyboard shortcut for Cmd/Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <SidebarMenuButton
        className="text-muted-foreground relative size-8 max-w-8 min-w-8"
        onClick={() => setOpen(true)}
        tooltip={"Search"}
      >
        <Icons.search />
        <span className="sr-only">Search</span>
      </SidebarMenuButton>
      <CommandDialog open={open} onOpenChange={setOpen} className="md:min-w-2xl" title="Search">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={handleCreateWorkspace}>
              <Icons.plus />
              <span>New Workspace</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem asChild>
              <Link href={createRoute("settings-profile", { slug }).href}>
                <Icons.user />
                <span>Profile</span>
              </Link>
            </CommandItem>
            <CommandItem asChild>
              <Link href={createRoute("settings-workspace", { slug }).href}>
                <Icons.settings />
                <span>Workspace settings</span>
              </Link>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => setTheme("light")}>
              <Icons.sun />
              <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => setTheme("dark")}>
              <Icons.moon />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => setTheme("system")}>
              <Icons.laptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
