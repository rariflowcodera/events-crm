// import { useRouter } from "next/navigation"
// import {
//   // createBulkInvitationsAction,
//   // createInvitationAction,
//   // deleteInvitationAction,
//   deleteInvitationByIdAction,
// } from "@/server/actions/invitation-actions"
// import { useMutation } from "@tanstack/react-query"
// import { toast } from "sonner"

// // export const useCreateInvitation = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: createInvitationAction,
// //     onSuccess: (data) => {
// //       const { message, description } = data

// //       toast.success(message, {
// //         description,
// //       })
// //     },
// //     onError: (error: any) => {
// //       toast.error(error.message, {
// //         description: error.description,
// //       })
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_createInvite: mutate }
// // }

// // export const useDeleteInvitation = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: deleteInvitationAction,
// //     onSuccess: (data) => {
// //       const { message } = data
// //       toast.success(message)
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_deleteInvitation: mutate }
// // }

// // export const useUpdateInvitation = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: deleteInvitationByIdAction,
// //     onSuccess: (data) => {
// //       const { message } = data
// //       toast.success(message)
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_updateInvitation: mutate }
// // }

// // type useCreateBulkInvitationsProps = {
// //   resetForm: () => void
// // }

// // export const useCreateBulkInvitations = ({ resetForm }: useCreateBulkInvitationsProps) => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: createBulkInvitationsAction,
// //     onSuccess: (data) => {
// //       const { message } = data
// //       toast.success(message)
// //       resetForm()
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_createBulkInvitations: mutate }
// // }
