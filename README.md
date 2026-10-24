# Ecommerce — Next.js + shadcn/ui + PostgreSQL/Prisma + Vitest + Stripe

Tienda online completa con catálogo de productos, carrito de compras persistido en base de
datos, checkout de pago con Stripe Checkout y perfiles de usuario con roles `ADMIN` / `USER`.

---

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 |
| UI | React / React DOM | 19.3.1 |
| Componentes | shadcn/ui (base Radix, estilo `radix-nova`) | 4.22.1 (CLI) |
| Estilos | Tailwind CSS | 4.x |
| Tipografía | Fraunces + Geist + Geist Mono (`next/font`) | — |
| Base de datos | PostgreSQL | 17.11 (local) |
| ORM | Prisma | 7.10.1 (`prisma-client` + driver adapter `pg`) |
| Autenticación | JWT propio con `jose` + `bcryptjs` | 6.2.13 / 3.0.3 |
| Pagos | Stripe (SDK de Node) | 23.0.1 |
| Validación | Zod | 4.6.7 |
| Tests | Vitest + Testing Library | 5.0.5 |

TypeScript está fijado en **5.9.3** (no 7.x) y Prisma en **7.10.1** (no la 8.0.0-rc): son las
versiones estables y las que usa el ejemplo oficial de Prisma con Next.js 16.

---

## Sistema de diseño — «Tinta y papel»

Toda la interfaz está construida con **shadcn/ui** (base Radix, `src/components/ui/`) sobre los
tokens definidos en `src/app/globals.css`. La dirección visual es editorial y cálida: papel crudo,
tinta casi negra y un único acento terracota para las acciones.

| Decisión | Valor |
|---|---|
| Color | `--background` papel `oklch(0.978 0.008 84)` · `--foreground` tinta `oklch(0.212 0.014 60)` · `--primary` arcilla `oklch(0.512 0.118 44)` |
| Semánticos | `--success` oliva (stock) · `--caution` ámbar (stock bajo) · `--destructive` ladrillo |
| Tipografía | `Fraunces` para titulares (`--font-heading`), `Geist` para texto, `Geist Mono` para cifras y códigos |
| Profundidad | Filetes de tinta (`--border`), sin sombras duras; sombra mínima solo en hover de tarjetas |
| Radio | `--radius: 0.5rem` con escala derivada (`sm` 0.3 · `md` 0.4 · `lg` 0.5 · `xl` 0.7 rem) |
| Patrones propios | `.stamp` (etiqueta en versalitas monoespaciadas) · `[data-numeric]` (cifras tabulares) |

Convenciones del proyecto:

- Ninguna página escribe `bg-white`, `text-gray-500` ni colores literales: todo pasa por tokens
  semánticos (`bg-card`, `text-muted-foreground`, `border-border`).
- Los componentes de shadcn/ui viven en `src/components/ui/` y **no se editan a mano**: se
  actualizan con `npx shadcn@latest add <componente>`.
- Los componentes de producto (`src/components/`) componen esos primitivos y son los únicos que
  llevan decisiones de layout.

---

## Requisitos

- **Node.js 22.12+ o 24+** (probado con 24.19.0)
- **npm 10+**
- **PostgreSQL 14+** (probado con 17.11)

### Instalar PostgreSQL en Windows

```powershell
winget install --id PostgreSQL.PostgreSQL.17 --exact --accept-package-agreements --accept-source-agreements
```

El instalador de EDB queda en modo desatendido. Si se queda esperando la contraseña del
superusuario, ejecuta el instalador directamente:

```powershell
# descarga: https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64.exe
.\postgresql-17.11-5-windows-x64.exe --mode unattended --unattendedmodeui none `
  --superpassword "<tu-clave-local>" --servicename postgresql-x64-17 --serverport 5432
```

Verifica que el servicio quedó arriba:

```powershell
Get-Service postgresql-x64-17
& "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -h localhost -p 5432
```

Crea las dos bases de datos:

```powershell
$env:PGPASSWORD = "<tu-clave-local>"
& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres -h localhost -p 5432 ecommerce
& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres -h localhost -p 5432 ecommerce_test
```

---

## Puesta en marcha

```bash
npm install

# 1. Variables de entorno
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env y define DATABASE_URL, DATABASE_URL_TEST y AUTH_SECRET

# 2. Esquema + datos de demostración
npm run db:migrate
npm run db:seed

# 3. Levantar
npm run dev
```

La app queda en <http://localhost:3000>.

### Credenciales de demostración (solo local)

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@ecommerce.test` | `demo1234` |
| Usuario | `user@ecommerce.test` | `demo1234` |

> Estas credenciales existen únicamente en el seed de demostración. No sirven para ningún
> entorno real y no deben reutilizarse.

---

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL de desarrollo. |
| `DATABASE_URL_TEST` | Base `ecommerce_test` que usa la suite de integración. |
| `AUTH_SECRET` | Secreto HS256 del JWT. Mínimo 32 caracteres. |
| `APP_URL` | URL base para las redirecciones de Stripe. |
| `STRIPE_SECRET_KEY` | Clave privada de Stripe (modo test). |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe. |

Genera un `AUTH_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env*` está en `.gitignore` (salvo `.env.example` y `.env.test`, que sí se versionan).

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack). |
| `npm run build` | `prisma generate` + build de producción. |
| `npm start` | Sirve el build de producción. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Suite completa de Vitest (unit + integration + dom). |
| `npm run test:unit` | Solo pruebas unitarias. |
| `npm run test:integration` | Solo pruebas de integración (requiere PostgreSQL). |
| `npm run test:dom` | Solo pruebas de componentes. |
| `npm run test:coverage` | Suite + cobertura (umbral: 80% de líneas). |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo. |
| `npm run db:deploy` | Aplica migraciones (producción / CI). |
| `npm run db:seed` | Carga los datos de demostración. |
| `npm run db:studio` | Prisma Studio para inspeccionar la base. |
| `npm run scrape:products` | Scrapea datos reales e imágenes del catálogo (ver «Datos del catálogo»). |

---

## Datos del catálogo

`npm run scrape:products` completa los productos con datos reales y una galería de imágenes:

- **Fuentes:** [DummyJSON](https://dummyjson.com) y [EscuelaJS](https://api.escuelajs.co) aportan fichas de producto con varias fotos; [Openverse](https://openverse.org) aporta fotografías reales con licencia Creative Commons para los tipos de producto que esos catálogos no cubren.
- **Qué hace:** descarga cada imagen a `public/products/<slug>/`, deja la portada en `Product.imageUrl` y el resto en la tabla `ProductImage` (galería), y actualiza precio, stock y la ficha técnica de la descripción.
- **Idempotente:** se puede volver a ejecutar; reemplaza la galería del producto y vuelve a bajar las imágenes.

```bash
npm run scrape:products                      # catálogo completo
npm run scrape:products -- --dry-run         # muestra el plan sin escribir
npm run scrape:products -- --only=mochila-urban-canvas
```

Los precios, el stock y las fotos provienen de fuentes externas: son datos de demostración, no de una tienda real. La galería también se edita a mano desde **Admin → Productos → Editar** (una URL por línea).

---

## Probar el pago con Stripe

1. Crea una cuenta en <https://dashboard.stripe.com/test/apikeys> y copia las claves `sk_test_`
   y `pk_test_` a `.env`.
2. Instala la CLI de Stripe (opcional, solo para reenviar eventos en local):

   ```powershell
   winget install --id Stripe.StripeCli --exact
   stripe listen --events checkout.session.completed,payment_intent.payment_failed --forward-to localhost:3000/api/webhooks/stripe
   ```

   La CLI imprime un `whsec_...` para cada sesión: cópialo a `STRIPE_WEBHOOK_SECRET`. El evento
   `--events` es obligatorio en las versiones nuevas de la CLI; si se omite, no reenvía nada.

3. Con las claves de prueba, el botón **Pagar con Stripe** redirige a la pasarela de prueba,
   donde puedes usar la tarjeta `4242 4242 4242 4242` con cualquier fecha futura y CVC.

Sin claves configuradas la app **arranca igual**: el catálogo, el carrito y el panel admin
funcionan, y solo el checkout devuelve el mensaje "Stripe no está configurado".

> La CLI de Stripe se autentica con una *OAuth access key* (`oak_...`) que no es reutilizable
> como `STRIPE_SECRET_KEY`: la clave de API hay que copiarla del dashboard
> (<https://dashboard.stripe.com/test/apikeys>). Las claves que contienen `xxxx`, `placeholder`
> o `cambia` se consideran no configuradas (`src/lib/stripe.ts`).

### Webhook

`POST /api/webhooks/stripe` corre en runtime Node y procesa:

- `checkout.session.completed` → marca la orden como `PAID` y descuenta el stock.
- `payment_intent.payment_failed` → marca la orden como `FAILED`.

El procesamiento es **idempotente**: los eventos se reenvían todo el tiempo, así que la orden se
identifica por `stripeSessionId` (único en la base) y el stock solo se descuenta una vez.

---

## Arquitectura

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

### Decisiones de diseño

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
idempotente.

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

### Notas sobre Next.js 16

- `middleware.ts` está deprecado: la convención actual es **`proxy.ts`**, que exporta `proxy`.
- `cacheComponents` está **desactivado** a propósito (`next.config.ts`). La app lee cookies en el
  layout (sesión y contador del carrito) y `searchParams` en el catálogo; con Cache Components cada
  acceso dinámico exigiría un límite `<Suspense>` en cada ruta, y el caching avanzado está fuera
  del alcance de este proyecto.
- `prisma.config.ts` es **obligatorio** en la raíz con Prisma 7. Todos los comandos de Prisma se
  ejecutan desde la raíz del proyecto.

---

## Pruebas

185 pruebas en 21 archivos, con tres proyectos de Vitest:

| Proyecto | Entorno | Qué cubre |
|---|---|---|
| `unit` | node | Lógica pura: cálculos del carrito, fusión, JWT, bcrypt, dinero, slugs, schemas de zod. |
| `integration` | node + PostgreSQL real | Usuarios, sesiones, roles, carrito, pedidos, webhook de Stripe y todas las Server Actions. |
| `dom` | jsdom | Componentes con Testing Library. |

```bash
npm test              # todo
npm run test:coverage # con reporte de cobertura
```

La suite de integración usa la base `ecommerce_test` (cargada desde `.env.test`) y corre los
archivos **de a uno**, porque comparten la misma base de datos. `tests/global-setup.ts` aplica
las migraciones antes de empezar y se niega a correr si `DATABASE_URL` no apunta a una base de
test.

Las Server Actions se prueban de verdad: `tests/setup-next.ts` mockea `cookies()`, `redirect()` y
`revalidatePath()` para poder ejecutarlas fuera de un ciclo de request de Next, y los permisos se
verifican contra la base de datos real.

### Cobertura

Umbral configurado: **80%** de líneas sobre `src/lib/**` y `src/actions/**`. Cobertura actual:
**89.69%**.

---

## Funcionalidades

**Catálogo** — `/products` con búsqueda por nombre y descripción, filtro por categoría, paginación
de 12 por página y orden por fecha. `/products/[slug]` muestra el detalle con stock y precio, y una
**galería de imágenes** con miniaturas, flechas y crédito de la foto.

**Carrito** — para invitados y para usuarios autenticados, con cantidades limitadas por stock,
actualización optimista en la interfaz y fusión automática al iniciar sesión.

**Checkout** — Stripe Checkout alojado. La orden se crea antes de redirigir y se confirma por
webhook.

**Cuentas** — registro, inicio y cierre de sesión, perfil en `/account` con el historial de
pedidos.

**Panel admin** — `/admin` con métricas, `/admin/products` con CRUD completo, `/admin/orders` con
transiciones de estado (marcar pagado reserva el stock igual que el webhook de Stripe; al cancelar
se devuelve el stock solo si estaba reservado) y `/admin/users` para cambiar roles.

---

## Limitaciones conocidas

- Sin cupones ni descuentos, sin emails transaccionales, sin multi-idioma ni multi-moneda.
- El precio es único por producto; no hay variantes de talla ni color.
- La moneda es `usd` con formato `es-CL` (se muestra como `US$189,90`). Para usar CLP u otra
  moneda hay que cambiar el default del schema y el formateador en `src/lib/money.ts`.
- Los pedidos de invitado guardan el email vacío hasta que el webhook lo completa con el que
  recoge Stripe.
