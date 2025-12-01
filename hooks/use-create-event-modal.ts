import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"

interface EventModalState {
  isOpen: boolean
  workspaceSlug: string
}

type InitialValues = Partial<Omit<EventModalState, "isOpen">>

export const useCreateEventModal = () => {
  const [state, setState] = useQueryStates({
    createEvent: parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    workspaceSlug: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  })

  const open = (initialValues?: InitialValues) => {
    setState({
      createEvent: true,
      workspaceSlug: initialValues?.workspaceSlug || "",
    })
  }

  const close = () => {
    setState({
      createEvent: false,
      workspaceSlug: "",
    })
  }

  return {
    isOpen: state.createEvent,
    workspaceSlug: state.workspaceSlug,
    open,
    close,
    setState,
  }
}
