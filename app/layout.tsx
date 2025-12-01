import type { Metadata, Viewport } from "next"

import "@/styles/globals.css"

import { configuration } from "@/lib/config"

const title = configuration.site.openGraphTitle
const description = configuration.site.openGraphDescription

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export const metadata: Metadata = {
  title,
  description,
  icons: [`https://${configuration.site.domain}/favicon.ico`],
  openGraph: {
    title,
    description,
    images: [configuration.site.openGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [configuration.site.openGraphImage],
  },
  metadataBase: new URL(`https://${configuration.site.domain}`),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Root layout is a minimal shell - locale-specific layout handles the HTML structure
  return children
}
