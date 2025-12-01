// import { useRouter } from "next/navigation"
// import {
//   // deleteMemberAction,
//   leaveWorkspaceAction,
//   // updateMember,
// } from "@/server/actions/member-actions"
// import { useMutation } from "@tanstack/react-query"
// import { toast } from "sonner"

// import { createRoute } from "@/lib/routes"

// // export const useUpdateMember = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: updateMember,
// //     onSuccess: (res) => {
// //       toast.success(res.message)
// //     },
// //     onError: (err) => {
// //       toast.error(err.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return {
// //     isPending,
// //     server_updateMember: mutate,
// //   }
// // }

// // export const useDeleteMember = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: deleteMemberAction,
// //     onSuccess: (res) => {
// //       toast.success(res.message)
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_deleteMember: mutate }
// // }

// export const useLeaveWorkspace = () => {
//   const router = useRouter()

//   const { isPending, mutate } = useMutation({
//     mutationFn: leaveWorkspaceAction,
//     onSuccess: (res) => {
//       router.push(createRoute("callback").href)
//       toast.success(res.message, {
//         description: res.description,
//       })
//     },
//     onError: (err) => {
//       toast.error(err.message)
//     },
//     onSettled: () => {
//       router.refresh()
//     },
//   })

//   return {
//     isPending,
//     server_leaveWorkspace: mutate,
//   }
// }
