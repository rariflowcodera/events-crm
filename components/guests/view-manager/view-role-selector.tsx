"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const ROLES = ["owner", "admin", "manager", "member"] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
}

interface ViewRoleSelectorProps {
  value?: string[]
  onChange: (roles: string[]) => void
}

const DEFAULT_ROLES = ["owner", "admin", "manager", "member"]

export function ViewRoleSelector({ value = DEFAULT_ROLES, onChange }: ViewRoleSelectorProps) {
  const handleChange = (role: Role, checked: boolean) => {
    if (checked) {
      onChange([...value, role])
    } else {
      onChange(value.filter((r) => r !== role))
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      {ROLES.map((role) => (
        <div key={role} className="flex items-center space-x-2">
          <Checkbox
            id={`role-${role}`}
            checked={value.includes(role)}
            disabled={role === "owner"} // Owner always has access
            onCheckedChange={(checked) => handleChange(role, !!checked)}
          />
          <Label
            htmlFor={`role-${role}`}
            className={role === "owner" ? "text-muted-foreground" : ""}
          >
            {ROLE_LABELS[role]}
          </Label>
        </div>
      ))}
    </div>
  )
}
