"use client"

import { useState } from "react"

type OS = "mac" | "other"

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    platform: string
  }
}

export function useOS(): OS {
  const [os] = useState<OS>(() => {
    if (typeof window === "undefined") return "other"

    const nav = navigator as NavigatorWithUserAgentData
    if (nav.userAgentData?.platform) {
      return nav.userAgentData.platform.toUpperCase().includes("MAC") ? "mac" : "other"
    }
    return navigator.userAgent.toUpperCase().includes("MAC") ? "mac" : "other"
  })

  return os
}
