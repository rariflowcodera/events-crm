"use client"

import { ReactNode } from "react"
import { NuqsAdapter } from "nuqs/adapters/next/app"

export function NuqsProvider({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
