# Pruebas

> Volver a la [portada](../README.md) · [Índice de documentación](./README.md)

185 pruebas en 21 archivos, con tres proyectos de Vitest:

| Proyecto | Entorno | Qué cubre |
|---|---|---|
| `unit` | node | Lógica pura: cálculos del carrito, fusión, JWT, bcrypt, dinero, slugs, schemas de zod. |
| `integration` | node + PostgreSQL real | Usuarios, sesiones, roles, carrito, pedidos, webhook de Stripe y todas las Server Actions. |
| `dom` | jsdom | Componentes con Testing Library. |

```bash
npm test              # todo
npm run test:unit     # solo unitarias
npm run test:integration
npm run test:dom
npm run test:coverage # con reporte de cobertura
```

## Base de datos de test

La suite de integración usa la base `ecommerce_test` (cargada desde `.env.test`) y corre los
archivos **de a uno**, porque comparten la misma base de datos. `tests/global-setup.ts` aplica
las migraciones antes de empezar y se niega a correr si `DATABASE_URL` no apunta a una base de
test.

## Server Actions

Las Server Actions se prueban de verdad: `tests/setup-next.ts` mockea `cookies()`, `redirect()` y
`revalidatePath()` para poder ejecutarlas fuera de un ciclo de request de Next, y los permisos se
verifican contra la base de datos real.

## Cobertura

Umbral configurado: **80%** de líneas sobre `src/lib/**` y `src/actions/**`. Cobertura actual:
**89.69%**.

## Qué cubre el flujo de compra

| Archivo | Escenario |
|---|---|
| `tests/integration/actions-checkout.test.ts` | Los `line_items` se arman con los precios de la base; la orden queda `PENDING`; si Stripe falla, la orden se cierra en vez de quedar colgada. |
| `tests/integration/webhook.test.ts` | Firma inválida → 400; falta de configuración → 503; `checkout.session.completed` marca la orden pagada y descuenta stock; el reenvío es idempotente. |
| `tests/integration/orders.test.ts` | `markOrderPaid` descuenta stock una sola vez, cancela la orden sin stock y `cancelUnpaidOrder` cierra pedidos pendientes. |
| `tests/integration/actions-admin.test.ts` | «Marcar pagado» reserva el stock; cancelar un pedido pendiente no inventa stock; cancelar uno pagado lo devuelve. |
