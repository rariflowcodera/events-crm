"use client"

import { toast } from "sonner"

import { useClipboard } from "@/hooks/use-clipboard"
import { Button } from "@/components/ui/button"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Icons } from "@/components/global/icons"

type CopyButtonProps = {
  string?: string
  currentPath?: boolean
}

export function CopyButton({ currentPath = false, string }: CopyButtonProps) {
  const { copyStatus, copyToClipboard } = useClipboard()
  const isCopied = copyStatus === "success"
  const handleCopy = () => {
    try {
      copyToClipboard(currentPath ? window.location.href : string!)
      toast.success("Copied", {
        description: "Copied to clipboard",
      })
    } catch (error: any) {
      return toast.error(error?.message)
    }
  }

  return (
    <ActionTooltip label="Click to copy" delayDuration={400}>
      <Button disabled={isCopied} size={"icon"} variant="ghost" onClick={handleCopy} type="button">
        {isCopied ? (
          <Icons.check className="text-green-500" />
        ) : (
          <Icons.copy className="text-primary/60" />
        )}
      </Button>
    </ActionTooltip>
  )
}
