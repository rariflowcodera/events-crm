import { Icons } from "@/components/global/icons"

export default function InvitationLoading() {
  return (
    <main className="flex h-screen w-full items-center justify-center gap-x-2">
      <Icons.loader className="size-4 animate-spin" />
      <h1 className="font-medium">Loading invitation...</h1>
    </main>
  )
}
