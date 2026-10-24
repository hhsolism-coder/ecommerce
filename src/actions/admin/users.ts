'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { revokeUserSessions } from '@/lib/auth/session'
import { updateUserRoleSchema } from '@/lib/validation/product'
import { fieldErrorsFrom } from '@/lib/validation/errors'
import type { ActionState } from '@/lib/action-state'

export async function updateUserRoleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin('/admin/users')

  const parsed = updateUserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos.', errors: fieldErrorsFrom(parsed.error) }
  }

  const { userId, role } = parsed.data

  if (userId === admin.id) {
    return { ok: false, message: 'No puedes cambiar tu propio rol.' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { ok: false, message: 'El usuario no existe.' }

  await prisma.user.update({ where: { id: userId }, data: { role } })

  // El rol efectivo se lee de la base de datos, pero revocar las sesiones garantiza
  // que la cookie vieja no siga dando acceso a nada.
  await revokeUserSessions(userId)

  revalidatePath('/admin/users')

  return { ok: true, message: `El rol de ${user.name} ahora es ${role}.` }
}
