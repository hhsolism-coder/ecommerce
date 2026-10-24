/**
 * Almacén de cookies falso para testear código que usa `cookies()` de Next.
 *
 * Se instala con `vi.mock('next/headers', ...)`. Ver `tests/helpers/hoisted.ts`.
 */
export type CookieStore = {
  get: (name: string) => { name: string; value: string } | undefined
  set: (name: string, value: string, options?: unknown) => void
  delete: (name: string) => void
  has: (name: string) => boolean
  getAll: () => { name: string; value: string }[]
  /** Lectura directa del mapa, para aserciones. */
  raw: () => Record<string, string>
}

export function createCookieStore(initial: Record<string, string> = {}): CookieStore {
  const map = new Map<string, string>(Object.entries(initial))

  return {
    get: (name) => (map.has(name) ? { name, value: map.get(name)! } : undefined),
    set: (name, value) => {
      map.set(name, value)
    },
    delete: (name) => {
      map.delete(name)
    },
    has: (name) => map.has(name),
    getAll: () => [...map.entries()].map(([name, value]) => ({ name, value })),
    raw: () => Object.fromEntries(map.entries()),
  }
}
