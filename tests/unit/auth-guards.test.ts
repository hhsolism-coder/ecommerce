import { beforeEach, describe, expect, it, vi } from 'vitest'

// El guard llama a `redirect()`, que en Next lanza una excepción especial.
// El mock reproduce ese comportamiento para poder assertar el destino.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(),
}))

import { getCurrentUser, isAdmin, requireAdmin, requireUser } from '@/lib/auth/guards'
import { getSessionUser } from '@/lib/auth/session'

const mockedGetSessionUser = vi.mocked(getSessionUser)

const admin = { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'ADMIN' as const }
const user = { id: 'user-1', email: 'user@test.local', name: 'User', role: 'USER' as const }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isAdmin', () => {
  it('reconoce el rol ADMIN', () => {
    expect(isAdmin(admin)).toBe(true)
  })

  it('rechaza al rol USER y a null', () => {
    expect(isAdmin(user)).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe('getCurrentUser', () => {
  it('devuelve el usuario cuando hay sesión', async () => {
    mockedGetSessionUser.mockResolvedValue(user)
    await expect(getCurrentUser()).resolves.toEqual(user)
  })

  it('devuelve null cuando no hay sesión', async () => {
    mockedGetSessionUser.mockResolvedValue(null)
    await expect(getCurrentUser()).resolves.toBeNull()
  })
})

describe('requireUser', () => {
  it('devuelve el usuario cuando la sesión es válida', async () => {
    mockedGetSessionUser.mockResolvedValue(user)
    await expect(requireUser('/cart')).resolves.toEqual(user)
  })

  it('redirige al login cuando no hay sesión', async () => {
    mockedGetSessionUser.mockResolvedValue(null)
    await expect(requireUser('/cart')).rejects.toThrow('REDIRECT:/login?next=%2Fcart')
  })
})

describe('requireAdmin', () => {
  it('permite el paso a un usuario ADMIN', async () => {
    mockedGetSessionUser.mockResolvedValue(admin)
    await expect(requireAdmin('/admin')).resolves.toEqual(admin)
  })

  it('deniega el paso a un usuario USER', async () => {
    mockedGetSessionUser.mockResolvedValue(user)
    await expect(requireAdmin('/admin')).rejects.toThrow('REDIRECT:/')
  })

  it('redirige al login cuando no hay sesión', async () => {
    mockedGetSessionUser.mockResolvedValue(null)
    await expect(requireAdmin('/admin/users')).rejects.toThrow(
      'REDIRECT:/login?next=%2Fadmin%2Fusers',
    )
  })
})
