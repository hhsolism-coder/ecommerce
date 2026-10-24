# Ecommerce — Next.js + shadcn/ui + PostgreSQL/Prisma + Vitest + Stripe

Tienda online completa con catálogo de productos, carrito de compras persistido en base de
datos, checkout de pago con Stripe Checkout y perfiles de usuario con roles `ADMIN` / `USER`.

> 📚 **Documentación** — la referencia detallada vive en [`docs/`](./docs/README.md):
> [Sistema de diseño](./docs/diseno.md) ·
> [Arquitectura](./docs/arquitectura.md) ·
> [Datos del catálogo](./docs/datos-catalogo.md) ·
> [Pago con Stripe](./docs/stripe.md) ·
> [Pruebas](./docs/pruebas.md)

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
| `npm run scrape:products` | Scrapea datos reales e imágenes del catálogo (ver [datos del catálogo](./docs/datos-catalogo.md)). |

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
