// import { useRouter } from "next/navigation"
// import {
//   archiveAllNotificationsAction,
//   // archiveNotificationAction,
//   updateNotificationAction,
// } from "@/server/actions/notification-actions"
// import { useMutation } from "@tanstack/react-query"
// import { toast } from "sonner"

// // export const useArchiveNotification = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: archiveNotificationAction,
// //     onSuccess: (res) => {
// //       toast.success(res?.message)
// //     },
// //     onError: (error) => {
// //       toast.error(error?.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_archiveNotification: mutate }
// // }

// // export const useArchiveAllNotifications = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: archiveAllNotificationsAction,
// //     onSuccess: () => {},
// //     onError: (error) => {
// //       toast.error(error.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return {
// //     isPending,
// //     server_archiveAllNotifications: mutate,
// //   }
// // }

// export const useUpdateNotification = () => {
//   const router = useRouter()

//   const { isPending, mutate } = useMutation({
//     mutationFn: updateNotificationAction,
//     onSuccess: (res) => {
//       toast.success(res?.message)
//     },
//     onError: (error) => {
//       toast.error(error?.message)
//     },
//     onSettled: () => {
//       router.refresh()
//     },
//   })

//   return { isPending, server_updateNotification: mutate }
// }
