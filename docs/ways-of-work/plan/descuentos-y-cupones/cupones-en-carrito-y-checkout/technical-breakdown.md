# Technical Breakdown — Cupones en carrito y checkout

> Epic: **Descuentos y cupones** · Feature: **Cupones en carrito y checkout**
> Derivado del [PRD](../cupones-en-carrito-y-checkout.md)

## 1. Resumen técnico

Se agrega un motor de descuentos que se apoya en tres piezas: un **modelo de datos** que
guarda los cupones y su uso, un **motor de cálculo puro** que decide el descuento y una
**integración con Stripe** que aplica ese descuento en la sesión de pago. El principio que
gobierna el diseño es el mismo que ya usa el resto del proyecto: **el servidor es la fuente
de verdad; el cliente solo manda el código**.

## 2. Modelo de datos (Prisma)

```prisma
enum DiscountType {
  PERCENT
  FIXED_AMOUNT
}

model Coupon {
  id               String       @id @default(cuid())
  code             String       @unique
  type             DiscountType
  percent          Int?         // 1..100, solo para PERCENT
  amountCents      Int?         // > 0, solo para FIXED_AMOUNT
  minSubtotalCents Int?
  maxDiscountCents Int?
  startsAt         DateTime?
  expiresAt        DateTime?
  usageLimit       Int?
  perUserLimit     Int?
  usedCount        Int          @default(0)
  active           Boolean      @default(true)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  cart      Cart?
  redemptions CouponRedemption[]

  @@index([active, expiresAt])
}

model CouponRedemption {
  id           String   @id @default(cuid())
  couponId     String
  coupon       Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  userId       String?
  orderId      String   @unique
  amountCents  Int
  createdAt    DateTime @default(now())

  @@index([couponId, userId])
}
```

Cambios sobre modelos existentes:

```prisma
model Cart {
  // ... campos actuales
  couponId String?
  coupon   Coupon? @relation(fields: [couponId], references: [id], onDelete: SetNull)
}

model Order {
  // ... campos actuales
  discountCents Int       @default(0)
  couponId     String?
  couponCode   String?
}
```

**Decisiones:**

- `Cart.couponId` es una referencia, no un texto: al fusionar carritos o invalidar un cupón
  se puede saber exactamente cuál era.
- `Order.couponId` + `couponCode` **congelan** el descuento aplicado. `couponCode` se duplica
  a propósito: si el cupón se elimina o renombra, el histórico de la orden sigue siendo legible.
- `CouponRedemption.orderId` es `@unique`: una orden no puede redimir dos veces el mismo
  cupón, y garantiza que el contador no se doblemente incremente al reprocesar el webhook.
- El precio sigue siendo `Int` en centavos, igual que `priceCents`. **No se introduce `Float`**.

## 3. Motor de cálculo (función pura)

Nuevo archivo `src/lib/cart/coupon-calc.ts`. Sin I/O, para poder testearlo de forma aislada
igual que `src/lib/cart/calc.ts`.

```ts
export type CouponRule = {
  type: 'PERCENT' | 'FIXED_AMOUNT'
  percent?: number | null
  amountCents?: number | null
  maxDiscountCents?: number | null
}

export type DiscountResult = {
  discountCents: number
  totalCents: number
  applied: boolean
}

/** Calcula el descuento sobre un subtotal ya conocido. Nunca devuelve un total negativo. */
export function calculateDiscount(subtotalCents: number, rule: CouponRule): DiscountResult
```

Reglas:

1. `subtotalCents <= 0` → sin descuento.
2. `PERCENT`: `discount = Math.round(subtotalCents * percent / 100)`.
3. `FIXED_AMOUNT`: `discount = min(amountCents, subtotalCents)`.
4. Se aplica `maxDiscountCents` como tope absoluto si viene definido.
5. `discount = max(0, min(discount, subtotalCents))`.
6. `totalCents = subtotalCents - discountCents`.

`calculateCartTotals()` **no cambia de firma**: se le sigue pasando el subtotal ya
descontado. Así se mantiene la invariantemente correcta `totalCents === subtotalCents`
cuando no hay cupón, y la suite existente (`tests/unit/cart-calc.test.ts`) sigue verde sin
modificaciones.

## 4. Servicio de validación (servidor)

Nuevo archivo `src/lib/cart/coupon-service.ts`.

```ts
export type CouponValidation =
  | { ok: true; coupon: Coupon; discountCents: number }
  | { ok: false; reason: CouponRejectionReason; message: string }

export type CouponRejectionReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'BELOW_MINIMUM'
  | 'USAGE_LIMIT_REACHED'
  | 'PER_USER_LIMIT_REACHED'
  | 'ALREADY_APPLIED'

export async function validateCoupon(
  code: string,
  context: { subtotalCents: number; userId: string | null },
): Promise<CouponValidation>
```

Orden de validación (el primero que falla manda):

1. Código normalizado: `trim()` + mayúsculas. Búsqueda por `code` exacto.
2. Existe y `active === true`.
3. `startsAt` vencido → `NOT_STARTED`; `expiresAt` alcanzado → `EXPIRED`.
4. `subtotalCents >= minSubtotalCents` (si aplica) → si no, `BELOW_MINIMUM`.
5. `usedCount < usageLimit` (si aplica) → si no, `USAGE_LIMIT_REACHED`.
6. Redenciones del usuario < `perUserLimit` (si aplica) → si no, `PER_USER_LIMIT_REACHED`.
7. Se calcula el descuento con `calculateDiscount()`.

## 5. Integración con Stripe

El descuento se aplica en `src/actions/checkout.ts` (`startCheckoutAction`).

**Estrategia:** nuestra tabla `Coupon` es la fuente de verdad; para que Stripe aplique el
descuento se crea un **cupón efímero en Stripe** en el momento de generar la sesión:

```ts
const stripeCoupon = await stripe.coupons.create({
  duration: 'once',
  ...(rule.type === 'PERCENT'
    ? { percent_off: rule.percent }
    : { amount_off: rule.amountCents, currency: currency.toLowerCase() }),
})

session = await stripe.checkout.sessions.create({
  // ...lo actual
  discounts: [{ coupon: stripeCoupon.id }],
  metadata: {
    cartId: cart.id,
    orderId: order.id,
    userId: user?.id ?? '',
    couponId: coupon.id,
    couponCode: coupon.code,
    discountCents: String(discountCents),
  },
})
```

**Por qué este diseño y no otros:**

| Alternativa | Por qué se descarta |
|---|---|
| Enviar el descuento desde el cliente | El cliente manipula el importe. Inaceptable. |
| Un `line_item` negativo en Stripe | Stripe no admite `unit_amount` negativo de forma fiable y ensucia el `line_items`. |
| Un cupón de Stripe como fuente de verdad | Stripe no conoce `minSubtotalCents`, `perUserLimit` ni el historial de redenciones. |
| Aplicar el descuento solo en la orden | El importe cobrado por Stripe no coincidiría con `order.totalCents`. |

**Punto de control:** el webhook (`src/app/api/webhooks/stripe/route.ts` →
`processCheckoutCompleted`) verifica que el total de la sesión de Stripe coincida con
`order.totalCents`. Si no coinciden, la orden queda `FAILED` y se registra el descuadre.

## 6. Acciones de servidor

Nuevo archivo `src/actions/cart.ts` (ya existe: se le agregan dos acciones):

```ts
export async function applyCouponAction(code: string): Promise<{ ok: boolean; message: string }>
export async function removeCouponAction(): Promise<{ ok: boolean; message: string }>
```

`applyCouponAction`:
1. Obtiene el carrito del servidor (`getCartWithItems()`).
2. Calcula el subtotal con `calculateCartTotals()`.
3. Llama a `validateCoupon()` con el código **enviado por el cliente** y el subtotal del servidor.
4. Si es válido, guarda `couponId` en el carrito y `revalidatePath('/cart')`.
5. Si no, devuelve el mensaje accionable según el motivo del rechazo.

El cliente **nunca** envía un importe: solo el código.

## 7. Panel de administración

- `src/actions/admin/coupons.ts` — `createCouponAction`, `updateCouponAction`,
  `toggleCouponAction`, `deleteCouponAction`. Todas empiezan con `requireAdmin()`,
  siguiendo el patrón de `src/actions/admin/products.ts`.
- `src/app/(admin)/admin/coupons/page.tsx` — listado con código, tipo, valor, vigencia,
  usos (`usedCount` / `usageLimit`) y acciones.
- `src/app/(admin)/admin/coupons/new/page.tsx` y `[id]/edit/page.tsx` — formularios.
- `src/components/admin/coupon-form.tsx` — formulario reutilizable.

## 8. Validación (Zod)

Nuevo archivo `src/lib/validation/coupon.ts`, siguiendo `src/lib/validation/product.ts`:

- `couponCodeSchema`: `^[A-Z0-9-]{3,24}$` tras normalizar a mayúsculas.
- `couponCreateSchema`: discrimina por `type`:
  - `PERCENT` → `percent` entero 1..100, `amountCents` debe ser `null`.
  - `FIXED_AMOUNT` → `amountCents` entero > 0, `percent` debe ser `null`.
- Reglas cruzadas: `expiresAt > startsAt`; `maxDiscountCents` solo con `PERCENT`;
  `maxDiscountCents <= amountCents` si ambos aparecen.

## 9. Interfaz de usuario

- `src/components/cart/coupon-form.tsx` — input de código + botón «Aplicar», con estado de
  error y de éxito.
- `src/app/(shop)/cart/page.tsx` — el resumen (`src/components/cart/cart-summary.tsx`) pasa de
  dos filas (subtotal, total) a tres: **subtotal**, **descuento** (con el código aplicado y un
  enlace para quitarlo) y **total**.
- Empty state del carrito de invitado y del usuario: misma UI.

## 10. Migración y seed

```bash
npm run db:migrate
```

- La migración solo agrega tablas y columnas; **no toca datos existentes**.
- `npm run db:seed` agrega dos cupones de demostración (`BIENVENIDO10` y `ENVIOGRATIS`) para
  poder probar el flujo manualmente.

## 11. Pruebas

| Proyecto Vitest | Archivo | Qué cubre |
|---|---|---|
| `unit` | `tests/unit/coupon-calc.test.ts` (nuevo) | Porcentaje, monto fijo, topes, redondeo, subtotal 0, descuento mayor que el subtotal |
| `unit` | `tests/unit/validation.test.ts` (ampliar) | Schemas Zod de cupón: rangos, exclusividad de campos, fechas |
| `integration` | `tests/integration/coupon-service.test.ts` (nuevo) | Cada motivo de rechazo, límites de uso, decremento de `usedCount` |
| `integration` | `tests/integration/actions-checkout.test.ts` (ampliar) | `discounts` en la sesión de Stripe, `metadata`, `order.totalCents` congelado, cupón no aplicado → sin cambios |
| `integration` | `tests/integration/orders.test.ts` (ampliar) | Redención única, idempotencia del webhook con cupón |
| `dom` | `tests/dom/cart-summary.test.tsx` (ampliar) | Fila de descuento visible, código, total final |

Umbral de cobertura: se mantiene el 80 % sobre `src/lib/**` y `src/actions/**`.

## 12. Riesgos técnicos

| Riesgo técnico | Mitigación |
|---|---|
| El cupón de Stripe se crea pero la sesión falla | El cupón efímero queda sin usar (`duration: 'once'`); no hay impacto en stock ni en pedidos |
| Dos compras simultáneas agotan `usageLimit` | Incremento condicional `usedCount` dentro de la transacción de creación de la orden, con `updateMany` |
| El carrito de invitado con cupón se fusiona con el del usuario | `merge.ts` conserva el cupón solo si sigue siendo válido sobre el subtotal fusionado |
| Un cupón aplicado queda obsoleto si el admin lo desactiva | La validación se reevalúa en cada aplicación y en el checkout; la orden ya creada conserva su descuento congelado |
| La moneda del cupón fijo no coincide con la del carrito | `amountCents` se interpreta en la moneda del carrito; el cupón de Stripe se crea con esa misma moneda |
