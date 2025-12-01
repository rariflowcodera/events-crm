import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"

interface WorkspaceModalState {
  isOpen: boolean
  workspaceName: string
  workspaceLogo: string
  userName: string
  userImage: string
}

type InitialValues = Partial<Omit<WorkspaceModalState, "isOpen">>

export const useCreateWorkspaceModal = () => {
  const [state, setState] = useQueryStates({
    isOpen: parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    workspaceName: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    workspaceLogo: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    userName: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    userImage: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  })

  const open = (initialValues?: InitialValues) => {
    setState({
      isOpen: true,
      ...initialValues,
    })
  }

  const close = () => {
    setState({
      isOpen: false,
      workspaceName: "",
      workspaceLogo: "",
      userName: "",
      userImage: "",
    })
  }

  return {
    ...state,
    open,
    close,
    setState,
  }
}
