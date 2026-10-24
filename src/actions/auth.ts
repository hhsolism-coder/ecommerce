'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { createSession, destroySession, type SessionUser } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { mergeGuestCartIntoUserCart } from '@/lib/cart/cart-service'
import { loginSchema, registerSchema } from '@/lib/validation/auth'
import { fieldErrorsFrom } from '@/lib/validation/errors'
import type { ActionState } from '@/lib/action-state'

export async function registerAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisa los datos del formulario.',
      errors: fieldErrorsFrom(parsed.error),
    }
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, message: 'Ya existe una cuenta con ese email.', errors: { email: 'Email en uso' } }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'USER',
    },
  })

  await createSession(user.id, user.role)
  await mergeGuestCartIntoUserCart(user.id)

  redirect('/account')
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisa los datos del formulario.',
      errors: fieldErrorsFrom(parsed.error),
    }
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Mismo mensaje para "no existe" y "contraseña incorrecta": no revelamos qué emails están registrados.
  const invalid: ActionState = { ok: false, message: 'Email o contraseña incorrectos.' }
  if (!user) return invalid

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return invalid

  await createSession(user.id, user.role)
  await mergeGuestCartIntoUserCart(user.id)

  const next = formData.get('next')
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/account')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/')
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const { getSessionUser } = await import('@/lib/auth/session')
  return getSessionUser()
}
