# Arquitectura

> Volver a la [portada](../README.md) · [Índice de documentación](./README.md)

## Estructura de carpetas

```
src/
├── app/
│   ├── (shop)/            # home, catálogo, detalle, carrito, checkout
│   ├── (auth)/            # login y registro
│   ├── (account)/         # perfil y pedidos del usuario
│   ├── (admin)/           # panel de administración
│   └── api/webhooks/stripe/route.ts
├── actions/               # Server Actions (auth, cart, checkout, admin/*)
├── components/            # UI (producto, galería, carrito, formularios)
├── lib/
│   ├── auth/              # password, jwt, session, guards, cookie
│   ├── cart/              # calc, merge, cart-service
│   ├── db.ts              # PrismaClient + driver adapter pg
│   ├── money.ts, slug.ts, orders.ts, stripe.ts
│   └── validation/        # esquemas zod
└── proxy.ts               # redirección optimista de rutas protegidas

scripts/
└── scrape-products.ts     # scraping de datos reales + descarga de imágenes

public/
└── products/<slug>/       # imágenes descargadas por el scraper
```

## Decisiones de diseño

**Los precios son enteros de centavos.** `priceCents Int` en la base, nunca `Float`. El formulario
de admin trabaja en dólares y `parsePriceToCents()` aplica reglas explícitas para distinguir
punto y coma como separadores decimales o de miles.

**El carrito vive en la base de datos.** El servidor es la fuente de verdad: el checkout recalcula
los precios desde la base y el cliente nunca envía cantidades ni importes. Un carrito de invitado
se identifica con una cookie httpOnly `cart_token`; en la base solo se guarda su hash SHA-256. Al
iniciar sesión, el carrito de invitado se **fusiona** con el del usuario sumando cantidades por
producto.

**El rol se lee siempre de la base de datos, nunca del JWT.** El token demuestra la identidad; la
fila `Session` confirma que no fue revocada ni expiró; y el rol efectivo sale de la fila `User`.
Por eso degradar a un admin a `USER` surte efecto en la petición siguiente, sin cerrar sesión.
Cambiar un rol además revoca las sesiones activas del usuario.

**`proxy.ts` no toca la base de datos.** Solo comprueba la *presencia* de la cookie para redirigir
al login. La autorización real la aplican `requireUser()` y `requireAdmin()`, que se invocan
**dentro de cada Server Action de administración** — la UI nunca es la frontera de autorización.

**El pedido se crea al generar la sesión de Stripe** (estado `PENDING`/`UNPAID`) y el webhook lo
marca `PAID`. Así los carritos abandonados quedan visibles para el admin y el webhook es
idempotente. Si la sesión de Stripe no se puede crear, la orden se cierra (`CANCELLED`/`FAILED`)
en vez de quedar colgada.

**El stock se descuenta con una actualización condicional.** Dentro de una transacción,
`updateMany({ where: { stock: { gte: cantidad } }, data: { stock: { decrement: cantidad } } })`.
Dos compras concurrentes del último producto no pueden dejar el stock en negativo: una falla y la
orden queda `CANCELLED`/`FAILED`.

**El pago tiene una sola implementación.** `markOrderPaid()` en `src/lib/orders.ts` marca la orden
`PAID` y reserva el stock; la usan tanto el webhook de Stripe como el botón «Marcar pagado» del
panel admin. Por eso el stock nunca queda descuadrado: se devuelve al cancelar **solo** si el
pedido estaba pagado, es decir, si el stock estaba reservado de verdad.

**Precios de Stripe construidos desde la base.** Los `line_items` se generan con `price_data` y
los precios leídos de la base de datos, nunca de lo que envíe el cliente.

## Notas sobre Next.js 16

- `middleware.ts` está deprecado: la convención actual es **`proxy.ts`**, que exporta `proxy`.
- `cacheComponents` está **desactivado** a propósito (`next.config.ts`). La app lee cookies en el
  layout (sesión y contador del carrito) y `searchParams` en el catálogo; con Cache Components cada
  acceso dinámico exigiría un límite `<Suspense>` en cada ruta, y el caching avanzado está fuera
  del alcance de este proyecto.
- `prisma.config.ts` es **obligatorio** en la raíz con Prisma 7. Todos los comandos de Prisma se
  ejecutan desde la raíz del proyecto.

## Modelo de datos (resumen)

```
User ─┬─ Session
      ├─ Cart ─── CartItem ─┐
      └─ Order ── OrderItem ─┴─ Product ─┬─ Category
                                         └─ ProductImage
```

`ProductImage` es la galería: la primera imagen es la portada (`Product.imageUrl`) y las demás
forman la galería de la ficha, ordenadas por `position`.
