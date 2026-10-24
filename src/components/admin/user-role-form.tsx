'use client'

import { useActionState, useState } from 'react'
import { updateUserRoleAction } from '@/actions/admin/users'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function UserRoleForm({
  userId,
  currentRole,
  disabled = false,
}: {
  userId: string
  currentRole: string
  disabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(updateUserRoleAction, initialActionState)
  const [role, setRole] = useState(currentRole)

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Select value={role} onValueChange={setRole} disabled={disabled || pending}>
          <SelectTrigger
            className="h-8 w-28 bg-background text-xs"
            aria-label="Rol del usuario"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
          Guardar
        </Button>
      </div>

      {state.message ? (
        <span className={`text-xs ${state.ok ? 'text-success' : 'text-destructive'}`}>
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
