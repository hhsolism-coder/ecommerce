import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { resolveSessionUser, revokeUserSessions } from '@/lib/auth/session'
import { createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
})

describe('base de datos de integración', () => {
  it('apunta a la base de test, nunca a la de desarrollo', () => {
    expect(process.env.DATABASE_URL).toContain('ecommerce_test')
  })
})

describe('usuarios y contraseñas', () => {
  it('guarda el hash y verifica la contraseña', async () => {
    const passwordHash = await hashPassword('contraseña123')
    const user = await createUser({ passwordHash })

    expect(user.passwordHash).not.toBe('contraseña123')
    await expect(verifyPassword('contraseña123', user.passwordHash)).resolves.toBe(true)
    await expect(verifyPassword('incorrecta', user.passwordHash)).resolves.toBe(false)
  })

  it('no permite dos usuarios con el mismo email', async () => {
    await createUser({ email: 'duplicado@test.local' })
    await expect(createUser({ email: 'duplicado@test.local' })).rejects.toThrow()
  })
})

describe('resolveSessionUser', () => {
  it('devuelve el usuario de una sesión válida', async () => {
    const user = await createUser({ role: 'ADMIN' })
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    const resolved = await resolveSessionUser(session.id, user.id)

    expect(resolved).toMatchObject({ id: user.id, email: user.email, role: 'ADMIN' })
  })

  it('devuelve null si la sesión fue revocada', async () => {
    const user = await createUser()
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() },
    })

    await expect(resolveSessionUser(session.id, user.id)).resolves.toBeNull()
  })

  it('devuelve null si la sesión está expirada', async () => {
    const user = await createUser()
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    })

    await expect(resolveSessionUser(session.id, user.id)).resolves.toBeNull()
  })

  it('devuelve null si el sessionId y el userId no coinciden', async () => {
    const user = await createUser()
    const otro = await createUser({ email: 'otro@test.local' })
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    await expect(resolveSessionUser(session.id, otro.id)).resolves.toBeNull()
  })

  it('toma el rol de la base de datos, no el que tenía al emitir el token', async () => {
    const user = await createUser({ role: 'ADMIN' })
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    // El token se emitió cuando el usuario era ADMIN.
    expect((await resolveSessionUser(session.id, user.id))?.role).toBe('ADMIN')

    // El admin lo degrada: el rol efectivo cambia sin tocar la sesión.
    await prisma.user.update({ where: { id: user.id }, data: { role: 'USER' } })

    expect((await resolveSessionUser(session.id, user.id))?.role).toBe('USER')
  })
})

describe('revokeUserSessions', () => {
  it('revoca todas las sesiones activas del usuario', async () => {
    const user = await createUser()
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    await revokeUserSessions(user.id)

    const after = await prisma.session.findUnique({ where: { id: session.id } })
    expect(after?.revokedAt).not.toBeNull()
    await expect(resolveSessionUser(session.id, user.id)).resolves.toBeNull()
  })

  it('permite conservar una sesión concreta', async () => {
    const user = await createUser()
    const keep = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })
    const other = await prisma.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    })

    await revokeUserSessions(user.id, keep.id)

    expect((await prisma.session.findUnique({ where: { id: keep.id } }))?.revokedAt).toBeNull()
    expect((await prisma.session.findUnique({ where: { id: other.id } }))?.revokedAt).not.toBeNull()
  })
})
