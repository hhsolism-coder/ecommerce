import { createCookieStore } from './cookie-store'

/**
 * Estado compartido entre el setup de mocks y los archivos de test.
 * Vive en su propio módulo para que la fábrica de `vi.mock` (que se evalúa
 * perezosamente) y el test compartan exactamente la misma instancia.
 */
export const cookieStore = createCookieStore()

export const navigationState = {
  redirectUrl: null as string | null,
}

export function resetNextMocks() {
  cookieStore.getAll().forEach(({ name }) => cookieStore.delete(name))
  navigationState.redirectUrl = null
}
