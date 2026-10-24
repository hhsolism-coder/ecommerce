import { vi } from 'vitest'

/**
 * Mocks de Next applied to todos los archivos del proyecto de integración.
 *
 * `cookies()` devuelve un almacén en memoria y `redirect()` lanza como lo hace
 * Next en producción, de modo que las Server Actions se pueden ejecutar de verdad
 * fuera de un ciclo de request de Next.
 */
vi.mock('next/headers', async () => {
  const { cookieStore } = await import('./helpers/next-mock-state')
  return {
    cookies: async () => cookieStore,
    headers: async () => new Headers(),
  }
})

vi.mock('next/navigation', async () => {
  const { navigationState } = await import('./helpers/next-mock-state')
  return {
    redirect: (url: string) => {
      navigationState.redirectUrl = url
      throw new Error(`REDIRECT:${url}`)
    },
    notFound: () => {
      throw new Error('NOT_FOUND')
    },
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }
})

// `revalidatePath` exige un contexto de generación estática de Next: fuera de él
// lanza "static generation store missing". Acá solo se verifica que se llame.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))
