# Implementation Plan — Cupones en carrito y checkout

> Epic: **Descuentos y cupones** · Feature: **Cupones en carrito y checkout**
> Derivado del [Technical Breakdown](./technical-breakdown.md)
> Formato: pasos deterministas, ejecutables por una persona o por un agente.

## Contexto de ejecución

- **Repositorio**: `github.com/hhsolism-coder/ecommerce` · rama `main`
- **Stack**: Next.js 16.4.2 (App Router), React 19.3.1, Prisma 7.10.1, PostgreSQL 17,
  Zod 4.6.7, Stripe SDK 23.0.1, Vitest 5.0.5
- **Comandos de verificación**: `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:coverage`
- **Regla de oro**: el importe nunca viaja del cliente al servidor. El cliente envía el
  **código**; el servidor decide el descuento.

---

## Fase 0 — Fundamentos de datos

**Objetivo**: que el modelo de datos soporte cupones, sin tocar el comportamiento actual.

**Archivos**

- Crear: `prisma/migrations/<timestamp>_add_coupons/migration.sql` (generado por Prisma)
- Modificar: `prisma/schema.prisma`
- Modificar: `scripts/seed.ts`

**Pasos**

1. Agregar `enum DiscountType { PERCENT, FIXED_AMOUNT }`.
2. Agregar `model Coupon` con los campos definidos en el breakdown técnico.
3. Agregar `model CouponRedemption` con `orderId` `@unique`.
4. Agregar `couponId` a `Cart` (relación opcional, `onDelete: SetNull`).
5. Agregar `discountCents Int @default(0)`, `couponId String?` y `couponCode String?` a `Order`.
6. Ejecutar `npm run db:migrate`.
7. En el seed, crear dos cupones de demostración: `BIENVENIDO10` (10 %) y
   `ENVIOGRATIS` (monto fijo equivalente a un envío).

**Criterios de aceptación**

- [ ] `npm run db:migrate` corre sin `prisma` en error y sin perder datos.
- [ ] `npm run db:seed` deja los dos cupones activos y visibles en Prisma Studio.
- [ ] `npm run typecheck` pasa.

**Verificación**: `npm run db:migrate && npm run db:seed && npm run typecheck`

---

## Fase 1 — Motor de cálculo (función pura)

**Objetivo**: calcular el descuento sin I/O, testeable de forma aislada.

**Archivos**

- Crear: `src/lib/cart/coupon-calc.ts`
- Crear: `tests/unit/coupon-calc.test.ts`

**Pasos**

1. Implementar `calculateDiscount(subtotalCents, rule): DiscountResult` con el orden de reglas
   del breakdown (tope, clamp a 0, nunca negativo).
2. Implementar `normalizeCouponCode(code)`: `trim()` + mayúsculas.
3. Escribir las pruebas: porcentaje, monto fijo, `maxDiscountCents`, redondeo, subtotal 0,
   descuento mayor que el subtotal, valores negativos.

**Criterios de aceptación**

- [ ] `calculateDiscount` no toca la base de datos ni el sistema de archivos.
- [ ] `totalCents` nunca es negativo.
- [ ] Sin cupón, el resultado es `discountCents: 0` y el total igual al subtotal.
- [ ] `npm run test:unit` pasa sin tocar los tests existentes de carrito.

---

## Fase 2 — Servicio de validación (servidor)

**Objetivo**: una única función que decide si un cupón se puede aplicar.

**Archivos**

- Crear: `src/lib/cart/coupon-service.ts`
- Crear: `tests/integration/coupon-service.test.ts`
- Modificar: `src/lib/validation/coupon.ts` (nuevo)

**Pasos**

1. Crear los schemas Zod en `src/lib/validation/coupon.ts` (código, tipo, valores, fechas).
2. Implementar `validateCoupon(code, context)` con el orden de reglas del breakdown.
3. Implementar los mensajes accionables por motivo de rechazo (texto en español, para la UI).
4. Probar cada motivo de rechazo contra la base real de test.

**Criterios de aceptación**

- [ ] Cada motivo de rechazo tiene un mensaje accionable y distinguible.
- [ ] La validación se hace contra la base, no contra datos del cliente.
- [ ] `npm run test:integration` pasa.

---

## Fase 3 — Aplicar y quitar el cupón en el carrito

**Objetivo**: que el cliente pueda aplicar un cupón y ver el desglose.

**Archivos**

- Modificar: `src/actions/cart.ts`
- Crear: `src/components/cart/coupon-form.tsx`
- Modificar: `src/app/(shop)/cart/page.tsx`
- Modificar: `src/components/cart/cart-summary.tsx`
- Modificar: `src/lib/cart/merge.ts` (preservar el cupón al fusionar)
- Modificar: `tests/dom/cart-summary.test.tsx`

**Pasos**

1. Implementar `applyCouponAction(code)`: obtener carrito del servidor → calcular subtotal →
   `validateCoupon` → guardar `couponId` → `revalidatePath('/cart')`.
2. Implementar `removeCouponAction()`: limpiar `couponId` → `revalidatePath('/cart')`.
3. Crear `CouponForm` con input, botón, estado de error y estado de éxito.
4. Ampliar el resumen a tres filas: subtotal, descuento (con código y quitar) y total.
5. En `merge.ts`, conservar el cupón solo si sigue siendo válido sobre el subtotal fusionado.
6. Cubrir con pruebas de DOM el caso con descuento y sin descuento.

**Criterios de aceptación**

- [ ] El cliente solo envía el código; el importe lo calcula el servidor.
- [ ] Un cupón inválido muestra el motivo y no impide comprar.
- [ ] El carrito de invitado y el de usuario muestran la misma UI.
- [ ] El total que ve el cliente coincide con el que se cobra.

---

## Fase 4 — Checkout y Stripe

**Objetivo**: cobrar el importe correcto y congelar el descuento en la orden.

**Archivos**

- Modificar: `src/actions/checkout.ts`
- Modificar: `src/lib/orders.ts` (`createPendingOrder`)
- Modificar: `src/app/api/webhooks/stripe/route.ts`
- Modificar: `tests/integration/actions-checkout.test.ts`
- Modificar: `tests/integration/orders.test.ts`
- Modificar: `tests/integration/webhook.test.ts`

**Pasos**

1. En `startCheckoutAction`: validar el cupón del carrito contra el subtotal **actual**.
2. Crear el cupón efímero en Stripe (`duration: 'once'`) y pasar `discounts: [{ coupon }]`.
3. Añadir `couponId`, `couponCode` y `discountCents` al `metadata` de la sesión.
4. En `createPendingOrder`: persistir `discountCents`, `couponId` y `couponCode`; el total
   se congela y no se recalcula.
5. Incrementar `usedCount` de forma condicional dentro de la misma transacción que crea la
   orden (`updateMany` con `usedCount < usageLimit`).
6. En el webhook: verificar que el total de Stripe coincide con `order.totalCents`; si no,
   marcar la orden `FAILED`.
7. Registrar la redención en `CouponRedemption` (idempotente: `orderId` es `@unique`).

**Criterios de aceptación**

- [ ] El importe cobrado por Stripe es exactamente `order.totalCents`.
- [ ] Sin cupón, el flujo de checkout actual no cambia en ningún aspecto.
- [ ] El webhook sigue siendo idempotente con cupón aplicado.
- [ ] Dos compras concurrentes del último uso de un cupón no lo redimen más de `usageLimit`.

---

## Fase 5 — Panel de administración

**Objetivo**: que el admin gestione los cupones sin tocar la base a mano.

**Archivos**

- Crear: `src/actions/admin/coupons.ts`
- Crear: `src/app/(admin)/admin/coupons/page.tsx`
- Crear: `src/app/(admin)/admin/coupons/new/page.tsx`
- Crear: `src/app/(admin)/admin/coupons/[id]/edit/page.tsx`
- Crear: `src/components/admin/coupon-form.tsx`
- Modificar: `src/app/(admin)/admin/layout.tsx` (enlace al nuevo apartado)
- Modificar: `tests/integration/actions-admin.test.ts`

**Pasos**

1. Implementar las Server Actions con `requireAdmin()` **dentro de cada acción** (no en la UI).
2. Implementar el listado con código, tipo, valor, vigencia y uso (`usedCount`/`usageLimit`).
3. Implementar alta, edición, activar/desactivar y eliminar.
4. Añadir el enlace en el layout del panel admin.
5. Probar que un usuario sin rol `ADMIN` recibe error en todas las acciones.

**Criterios de aceptación**

- [ ] Ninguna acción funciona sin `ADMIN`, verificado contra la base real.
- [ ] Desactivar un cupón impide nuevas aplicaciones sin tocar las órdenes ya creadas.
- [ ] El contador de usos es visible en el listado.

---

## Fase 6 — Cobertura y endurecimiento

**Objetivo**: que la suite proteja el flujo completo.

**Pasos**

1. Ejecutar `npm run test:coverage` y confirmar ≥ 80 % sobre `src/lib/**` y `src/actions/**`.
2. Verificar la suite de integración con la base `ecommerce_test` (los archivos corren de a uno).
3. Ejecutar `npm run lint` y `npm run typecheck`.
4. Probar manualmente el flujo completo con `BIENVENIDO10`:
   carrito → aplicar cupón → checkout → webhook → orden `PAID` → stock descontado una vez.

**Criterios de aceptación**

- [ ] `npm test` en verde.
- [ ] Cobertura ≥ 80 %.
- [ ] `npm run lint` y `npm run typecheck` sin errores.

---

## Fase 7 — Documentación

**Archivos**

- Modificar: `README.md` (quitar «sin cupones ni descuentos» de las limitaciones conocidas)
- Modificar: `docs/README.md` (enlace al plan)
- Crear: `docs/cupones.md` (reglas de negocio y flujo para quien toca el código)
- Modificar: `docs/arquitectura.md` (decisiones: cupón efímero de Stripe, descuento congelado)

**Criterios de aceptación**

- [ ] La documentación refleja el comportamiento nuevo.
- [ ] El README ya no lista los cupones como limitación.

---

## Orden de ejecución y paralelismo

```
Fase 0 (datos)  ──►  Fase 1 (cálculo)  ──►  Fase 2 (validación)
                                                │
                    ┌───────────────────────────┴──────────────┐
                    ▼                                          ▼
             Fase 3 (carrito/UI)                     Fase 5 (admin)
                    │                                          │
                    └──────────────► Fase 4 (checkout) ◄──────┘
                                        │
                                        ▼
                                 Fase 6 (pruebas)
                                        │
                                        ▼
                                 Fase 7 (documentación)
```

Fase 3 y Fase 5 pueden ejecutarse en paralelo: tocan archivos disjuntos
(`src/actions/cart.ts` + `src/components/cart/*` frente a `src/actions/admin/coupons.ts` +
`src/app/(admin)/admin/coupons/*`). Fase 4 depende de ambas.

## Definición de Hecho global

- [ ] Todas las fases cerradas con sus criterios de aceptación.
- [ ] `npm test`, `npm run lint`, `npm run typecheck` y `npm run test:coverage` en verde.
- [ ] El flujo de compra sin cupón no cambió (regresión cero).
- [ ] Documentación actualizada.
- [ ] El descuento aplicado nunca puede desincronizar el importe cobrado.
