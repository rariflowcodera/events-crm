// import { useRouter } from "next/navigation"
// import {
//   // createUserAction,
//   // deleteUserAction,
//   // initialEmailChangeAction,
//   // updateUserAction,
// } from "@/server/actions/user-actions"
// import { UserType } from "@/server/db/schema-types"
// import { useMutation } from "@tanstack/react-query"
// import { toast } from "sonner"

// import { ApiClient, UpdateUserRequest } from "@/lib/api-client"
// import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
// import { createRoute } from "@/lib/routes"

// // Server actions
// // export const useCreateUser = ({ isFromInvitation }: { isFromInvitation: boolean }) => {
// //   const router = useRouter()
// //   const { isPending, mutate } = useMutation({
// //     mutationFn: createUserAction,
// //     onSuccess: (data) => {
// //       if (isFromInvitation) {
// //         router.push(createRoute("callback").href)
// //       } else {
// //         router.push(
// //           data.hasWorkspace
// //             ? createRoute("onboarding-collaborate").href
// //             : createRoute("onboarding-workspace").href
// //         )
// //       }
// //       toast.success(data.message, {
// //         description: data.description,
// //       })
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE, {
// //         description: error?.description,
// //       })
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_createUser: mutate }
// // }

// // type useUpdateUserProps = {
// //   formReset: () => void
// // }

// // export const useUpdateUser = ({ formReset }: useUpdateUserProps) => {
// //   const router = useRouter()
// //   const { isPending, mutate } = useMutation({
// //     mutationFn: updateUserAction,
// //     onSuccess: (data) => {
// //       toast.success(data.message)
// //       formReset()
// //     },
// //     onError: (error) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_updateUser: mutate }
// // }

// type useInitialEmailChangeProps = {
//   setSuccess: (message: string | null) => void
//   setError: (message: string | null) => void
// }

// export const useInitialEmailChange = ({ setSuccess, setError }: useInitialEmailChangeProps) => {
//   const router = useRouter()

//   const { isPending, mutate, data } = useMutation({
//     mutationFn: initialEmailChangeAction,
//     onSuccess: (data) => {
//       toast.success(data.message)
//       setError(null)
//       setSuccess(data.message)
//       router.refresh()
//     },
//     onError: (error: any) => {
//       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
//       setSuccess(null)
//       setError(error?.message || GLOBAL_ERROR_MESSAGE)
//     },
//   })

//   return { isPending, server_initialEmailChange: mutate, data }
// }

// // export const useDeleteUser = () => {
// //   const router = useRouter()

// //   const { isPending, mutate } = useMutation({
// //     mutationFn: deleteUserAction,
// //     onSuccess: () => {
// //       toast.success("Deleted user successfully", {
// //         description: "You will be redirected to the homepage",
// //       })
// //       router.push(createRoute("sign-in").href)
// //     },
// //     onError: (error: any) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE, {
// //         description: error?.description,
// //       })
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return {
// //     isPending,
// //     server_deleteUser: mutate,
// //   }
// // }

// // // API client
// // export const useUpdateUserAPI = ({ formReset }: { formReset: () => void }) => {
// //   const router = useRouter()
// //   const { isPending, mutate } = useMutation({
// //     mutationFn: ({ id, values }: UpdateUserRequest) => ApiClient.updateUser({ id, values }),
// //     onSuccess: (data) => {
// //       toast.success(data.message)
// //       formReset()
// //     },
// //     onError: (error) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_updateUserAPI: mutate }
// // }

// // export const useDeleteUserAPI = () => {
// //   const router = useRouter()
// //   const { isPending, mutate } = useMutation({
// //     mutationFn: ({ id }: { id: UserType["id"] }) => ApiClient.deleteUser(id),
// //     onSuccess: (data) => {
// //       toast.success(data.message, {
// //         description: data.description,
// //       })
// //       router.push(createRoute("sign-in").href)
// //     },
// //     onError: (error) => {
// //       toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
// //     },
// //     onSettled: () => {
// //       router.refresh()
// //     },
// //   })

// //   return { isPending, server_deleteUserAPI: mutate }
// // }
