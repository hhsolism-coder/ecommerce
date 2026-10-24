import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('hashPassword / verifyPassword', () => {
  it('hashea la contraseña y la verifica correctamente', async () => {
    const hash = await hashPassword('contraseña-secreta')

    expect(hash).not.toBe('contraseña-secreta')
    expect(hash.startsWith('$2')).toBe(true)
    await expect(verifyPassword('contraseña-secreta', hash)).resolves.toBe(true)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('contraseña-secreta')
    await expect(verifyPassword('otra-cosa', hash)).resolves.toBe(false)
  })

  it('produce un hash distinto en cada llamada (salt aleatorio)', async () => {
    const [first, second] = await Promise.all([hashPassword('misma'), hashPassword('misma')])
    expect(first).not.toBe(second)
  })

  it('devuelve false ante un hash corrupto en vez de lanzar', async () => {
    await expect(verifyPassword('lo-que-sea', 'no-es-un-hash')).resolves.toBe(false)
  })
})
