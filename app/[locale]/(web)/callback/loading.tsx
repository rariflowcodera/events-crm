import { Icons } from "@/components/global/icons"

export default function CallbackLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Icons.loader className="size-4 animate-spin" />
    </div>
  )
}
