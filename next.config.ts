import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `cacheComponents` queda desactivado a propósito: la app usa cookies en el layout
  // (sesión y contador del carrito) y en páginas con filtros por searchParams.
  // Con Cache Components cada acceso dinámico exigiría un límite <Suspense> en cada ruta.
  cacheComponents: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
