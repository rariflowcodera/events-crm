"use client"

import { ReactNode, Suspense } from "react"
import { TRPCProvider } from "@/trpc/client"
import { Analytics } from "@vercel/analytics/react"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { configuration } from "@/lib/config"
import { Toaster } from "@/components/ui/toaster"
import { ModalProvider } from "@/components/providers/modal-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"

function NuqsProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </Suspense>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TRPCProvider>
      <Analytics />
      <ThemeProvider attribute="class" defaultTheme={configuration.site.defaultTheme} enableSystem>
        <NuqsProvider>
          <ModalProvider />
          <Toaster position="bottom-center" richColors />
          {children}
        </NuqsProvider>
      </ThemeProvider>
    </TRPCProvider>
  )
}
