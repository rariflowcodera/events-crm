// import { useRouter } from "next/navigation"
// import {
//   // updateOnboardingAction,
//   updateUserSettingsAction,
// } from "@/server/actions/user-settings-actions"
// import { useMutation } from "@tanstack/react-query"
// import { toast } from "sonner"

// import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// // import { createRoute } from "@/lib/routes"

// type useUpdateUserSettingsProps = {
//   resetForm: () => void
// }

// export const useUpdateUserSettings = ({ resetForm }: useUpdateUserSettingsProps) => {
//   const router = useRouter()

//   const { isPending, mutate } = useMutation({
//     mutationFn: updateUserSettingsAction,
//     onSuccess: (data) => {
//       const { message } = data
//       toast.success(message)
//       resetForm()
//     },
//     onError: (error: any) => {
//       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
//     },
//     onSettled: () => {
//       router.refresh()
//     },
//   })
//   return { isPending, server_updateUser: mutate }
// }

// // export const useUpdateOnboarding = ({ redirectUrl }: { redirectUrl?: string }) => {
// //   const router = useRouter()
// //   const { isPending, mutate } = useMutation({
// //     mutationFn: updateOnboardingAction,
// //     onSuccess: (data) => {
// //       const { message, description } = data

// //       toast.success(message, {
// //         description: description,
// //       })
// //       router.push(redirectUrl || createRoute("callback").href)
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_updateOnboarding: mutate }
// // }
