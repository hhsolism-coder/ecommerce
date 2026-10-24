import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signSessionToken, verifySessionToken } from '@/lib/auth/jwt'

const SECRET = 'secreto-de-prueba-de-32-caracteres-minimo!!'

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', SECRET)
})

describe('signSessionToken / verifySessionToken', () => {
  it('firma y verifica un token con los datos de la sesión', async () => {
    const token = await signSessionToken({ sub: 'user-1', sid: 'session-1', role: 'ADMIN' })

    const payload = await verifySessionToken(token)

    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-1')
    expect(payload?.sid).toBe('session-1')
    expect(payload?.role).toBe('ADMIN')
  })

  it('rechaza un token firmado con otro secreto', async () => {
    const token = await signSessionToken({ sub: 'user-1', sid: 'session-1', role: 'USER' })

    vi.stubEnv('AUTH_SECRET', 'otro-secreto-de-prueba-de-32-caracteres-min!!')
    await expect(verifySessionToken(token)).resolves.toBeNull()
  })

  it('rechaza un token manipulado', async () => {
    const token = await signSessionToken({ sub: 'user-1', sid: 'session-1', role: 'USER' })
    const tampered = `${token.slice(0, -3)}abc`

    await expect(verifySessionToken(tampered)).resolves.toBeNull()
  })

  it('rechaza un token expirado', async () => {
    vi.useFakeTimers()
    try {
      const token = await signSessionToken({ sub: 'user-1', sid: 'session-1', role: 'USER' })
      // Avanzamos más allá de los 7 días de vigencia.
      vi.setSystemTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000))

      await expect(verifySessionToken(token)).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('devuelve null si el secreto no está configurado', async () => {
    vi.stubEnv('AUTH_SECRET', 'corto')
    await expect(verifySessionToken('cualquiera')).resolves.toBeNull()
  })
})
