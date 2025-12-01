import { Icons } from "@/components/global/icons"

type FormMessageProps = {
  message?: string
}

export const FormError = ({ message }: FormMessageProps) => {
  if (!message) return null

  return (
    <div className="flex items-center gap-x-2 rounded-md bg-destructive/35 p-3 text-sm text-red-600">
      <Icons.alertTriangle className="size-4" />
      <p>{message}</p>
    </div>
  )
}
