import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { loginAction, registerAction, logoutAction } from '@/actions/auth'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { hashPassword } from '@/lib/auth/password'
import { initialActionState } from '@/lib/action-state'
import { cookieStore, resetNextMocks } from '../helpers/next-mock-state'
import { createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
  resetNextMocks()
})

function formData(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

describe('registerAction', () => {
  it('crea el usuario, abre sesión y redirige a /account', async () => {
    await expect(
      registerAction(
        initialActionState,
        formData({ name: 'Nuevo Usuario', email: 'nuevo@test.local', password: 'contraseña123' }),
      ),
    ).rejects.toThrow('REDIRECT:/account')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'nuevo@test.local' } })
    expect(user.name).toBe('Nuevo Usuario')
    expect(user.role).toBe('USER')
    expect(user.passwordHash).not.toBe('contraseña123')

    // La cookie de sesión queda emitida y la fila Session existe en la base.
    expect(cookieStore.has(SESSION_COOKIE)).toBe(true)
    const sessions = await prisma.session.findMany({ where: { userId: user.id } })
    expect(sessions).toHaveLength(1)
    expect(sessions[0].revokedAt).toBeNull()
  })

  it('rechaza datos inválidos sin tocar la base de datos', async () => {
    const state = await registerAction(
      initialActionState,
      formData({ name: 'A', email: 'no-es-email', password: 'corta' }),
    )

    expect(state.ok).toBe(false)
    expect(state.errors).toBeDefined()
    await expect(prisma.user.count()).resolves.toBe(0)
  })

  it('rechaza un email ya registrado', async () => {
    await createUser({ email: 'duplicado@test.local' })

    const state = await registerAction(
      initialActionState,
      formData({ name: 'Otro', email: 'duplicado@test.local', password: 'contraseña123' }),
    )

    expect(state.ok).toBe(false)
    expect(state.message).toContain('Ya existe una cuenta')
  })
})

describe('loginAction', () => {
  it('inicia sesión con credenciales correctas', async () => {
    const user = await createUser({
      email: 'user@test.local',
      passwordHash: await hashPassword('contraseña123'),
    })

    await expect(
      loginAction(initialActionState, formData({ email: 'user@test.local', password: 'contraseña123' })),
    ).rejects.toThrow('REDIRECT:/account')

    expect(cookieStore.has(SESSION_COOKIE)).toBe(true)
    const sessions = await prisma.session.findMany({ where: { userId: user.id } })
    expect(sessions).toHaveLength(1)
  })

  it('rechaza una contraseña incorrecta sin abrir sesión', async () => {
    await createUser({
      email: 'user@test.local',
      passwordHash: await hashPassword('contraseña123'),
    })

    const state = await loginAction(
      initialActionState,
      formData({ email: 'user@test.local', password: 'incorrecta' }),
    )

    expect(state.ok).toBe(false)
    expect(state.message).toBe('Email o contraseña incorrectos.')
    expect(cookieStore.has(SESSION_COOKIE)).toBe(false)
  })

  it('no revela si el email existe o no', async () => {
    const state = await loginAction(
      initialActionState,
      formData({ email: 'nadie@test.local', password: 'lo-que-sea' }),
    )

    expect(state.message).toBe('Email o contraseña incorrectos.')
  })

  it('redirige a la ruta interna indicada en `next`', async () => {
    await createUser({
      email: 'user@test.local',
      passwordHash: await hashPassword('contraseña123'),
    })

    await expect(
      loginAction(
        initialActionState,
        formData({ email: 'user@test.local', password: 'contraseña123', next: '/carrito-interno' }),
      ),
    ).rejects.toThrow('REDIRECT:/carrito-interno')
  })

  it('ignora un `next` externo (evita redirecciones abiertas)', async () => {
    await createUser({
      email: 'user@test.local',
      passwordHash: await hashPassword('contraseña123'),
    })

    await expect(
      loginAction(
        initialActionState,
        formData({ email: 'user@test.local', password: 'contraseña123', next: 'https://sitio-malicioso.cl' }),
      ),
    ).rejects.toThrow('REDIRECT:/account')
  })
})

describe('logoutAction', () => {
  it('revoca la sesión y borra la cookie', async () => {
    const user = await createUser({
      email: 'user@test.local',
      passwordHash: await hashPassword('contraseña123'),
    })
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    // Se simula la cookie ya emitida por el login.
    const { signSessionToken } = await import('@/lib/auth/jwt')
    const token = await signSessionToken({ sub: user.id, sid: session.id, role: user.role })
    cookieStore.set(SESSION_COOKIE, token)

    await expect(logoutAction()).rejects.toThrow('REDIRECT:/')

    const after = await prisma.session.findUniqueOrThrow({ where: { id: session.id } })
    expect(after.revokedAt).not.toBeNull()
    expect(cookieStore.has(SESSION_COOKIE)).toBe(false)
  })
})
