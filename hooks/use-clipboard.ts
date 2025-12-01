import { useState } from "react"

export function useClipboard() {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle")

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("success")
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      setCopyStatus("error")
    } finally {
      setTimeout(() => {
        setCopyStatus("idle")
      }, 3000)
    }
  }

  return { copyToClipboard, copyStatus }
}
