"use client"

import { useEffect } from "react"

const RELOAD_FLAG = "chunk-load-error-reload"
const CHUNK_ERROR_PATTERN = /Loading chunk [\d\w]+ failed|ChunkLoadError|Importing a module script failed/i

/**
 * Self-hosted deploys overwrite .next/static with new hashed chunk filenames.
 * A tab left open across a deploy can still reference an old hash that no
 * longer exists on disk, so a lazy chunk fetch 404s. Recover by reloading
 * once instead of leaving the user on a dead page.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    function reloadOnce() {
      if (sessionStorage.getItem(RELOAD_FLAG)) return
      sessionStorage.setItem(RELOAD_FLAG, "1")
      window.location.reload()
    }

    function handleError(event: ErrorEvent) {
      if (CHUNK_ERROR_PATTERN.test(event.message ?? "")) reloadOnce()
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message ?? String(event.reason ?? "")
      if (CHUNK_ERROR_PATTERN.test(message)) reloadOnce()
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [])

  return null
}
