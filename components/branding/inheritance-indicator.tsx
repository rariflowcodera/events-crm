import { Badge } from "@/components/ui/badge"
import { Building2, Pencil } from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface InheritanceIndicatorProps {
  isInherited: boolean
  workspaceName?: string
}

// ============================================================================
// Component
// ============================================================================

export function InheritanceIndicator({
  isInherited,
  workspaceName,
}: InheritanceIndicatorProps) {
  if (isInherited) {
    return (
      <Badge variant="secondary" className="gap-1.5 font-normal">
        <Building2 className="h-3 w-3" />
        {workspaceName ? `Inherited from ${workspaceName}` : "Inherited"}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <Pencil className="h-3 w-3" />
      Custom
    </Badge>
  )
}
