# Feature PRD: Cupones en carrito y checkout

> Epic: **Descuentos y cupones** · Feature: **Cupones en carrito y checkout**
> Estado: aprobado para planificación · Última actualización: 2026-11-10

## 1. Resumen

El ecommerce hoy no soporta ninguna forma de descuento. El precio final de un pedido es
exactamente el subtotal del carrito, y el README lo lista como limitación conocida
(*"Sin cupones ni descuentos"*). Esta feature introduce el primer mecanismo de descuento
de la plataforma: **cupones de código**, creados por un administrador, que el cliente aplica
en el carrito y que se comparten con el checkout de Stripe.

El alcance es deliberadamente angosto: un solo cupón activo por carrito, descuento
porcentual o de monto fijo, aplicado sobre el subtotal, sin acumulación entre cupones y sin
descuentos por producto.

## 2. Valor de negocio

| Métrica | Antes | Meta |
|---|---|---|
| Tasa de conversión de carrito a pedido | línea base | +5 % en 60 días |
| Ticket promedio | línea base | +8 % (el cupón incentiva compras de mayor valor) |
| Cupones redimidos | 0 | ≥ 1 por semana en los primeros 30 días |
| Errores de cobro | 0 | 0 (el descuento nunca puede desincronizar el importe cobrado) |

## 3. Problema y oportunidad

El catálogo tiene precios fijos y el carrito no ofrece ningún incentivo de conversión más allá
del envío. Sin un mecanismo de promoción, la tienda no puede:

- lanzar campañas de posicionamiento sin editar código,
- reddish stock antiguo,
-(test) premiar a un segmento (por ejemplo, cupón de primera compra),
- internalizar el costo de una promoción sin tocar el catálogo.

## 4. Usuarios y permisos

| Actor | Puede |
|---|---|
| Visitante / `USER` | Aplicar y quitar un cupón en su carrito, ver el desglose del descuento |
| `ADMIN` | Crear, editar, activar, desactivar y consultar cupones en `/admin/coupons` |

El cupón **nunca** se aplica desde el cliente sin validación del servidor: el cliente envía
solo el código, y el importe del descuento lo decide el servidor.

## 5. Reglas de negocio

1. Un carrito tiene **como máximo un cupón aplicado**. Aplicar uno nuevo reemplaza al anterior.
2. Tipos de descuento soportados:
   - `PERCENT`: porcentaje entero de 1 a 100 sobre el subtotal.
   - `FIXED_AMOUNT`: monto fijo en centavos, nunca mayor que el subtotal.
3. El descuento **nunca puede ser negativo**: `totalCents = max(0, subtotalCents - discountCents)`.
4. El descuento se redondea a centavos con `Math.round`.
5. Un cupón puede tener:
   - `minSubtotalCents`: subtotal mínimo para que el cupón sea válido.
   - `maxDiscountCents`: tope absoluto del descuento (útil con `PERCENT`).
   - `startsAt` / `expiresAt`: ventana de vigencia.
   - `usageLimit`: número máximo de redenciones totales.
   - `perUserLimit`: número máximo de redenciones por usuario.
   - `active`: activación manual independiente de la ventana temporal.
6. Un cupón inválido **no** impide comprar: se muestra el motivo y el carrito sigue sin descuento.
7. El cupón aplicado sobrevive al inicio de sesión: al fusionar el carrito de invitado con el
   del usuario, el cupón se conserva **si sigue siendo válido** para el carrito fusionado; en
   caso contrario se descarta silenciosamente.
8. Al crear el pedido, el descuento queda **congelado** en la orden (`discountCents`,
   `couponCode`, `couponId`). Los totales de la orden nunca se recalculan.
9. El cupón se consume (incrementa `usedCount`) **en la misma transacción** que crea la orden.
   Si la orden no llega a crearse, el cupón no se consume.

## 6. Criterios de aceptación del épico

- [ ] Un administrador puede crear un cupón de porcentaje y uno de monto fijo.
- [ ] Un cliente puede aplicar un cupón válido desde el carrito y ver el desglose
      `subtotal → descuento → total`.
- [ ] Un cliente ve un mensaje accionable cuando el cupón es inválido, vencido, agotado,
      por debajo del mínimo o excede el límite por usuario.
- [ ] El importe cobrado por Stripe coincide **exactamente** con `order.totalCents`.
- [ ] El servidor recalcula el descuento; manipular el cliente no altera el importe.
- [ ] Los límites de uso se respetan bajo concurrencia (dos compras simultáneas del último
      uso de un cupón no lo redimen más de `usageLimit` veces).
- [ ] La suite completa pasa y la cobertura de `src/lib/**` y `src/actions/**` se mantiene
      sobre el umbral de 80 %.

## 7. Fuera de alcance

- Acumulación de varios cupones o cupones por producto/categoría.
- Descuentos automáticos (sin código) o reglas de «carrito abandoned».
- Programa de lealtad o puntos.
- Envío de emails transaccionales con el cupón.
- Multi-moneda del descuento (el cupón se aplica en la moneda del carrito).
- Historial de canjes en el panel admin más allá del contador `usedCount` visible.

## 8. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El descuento del servidor difiere del aplicado por Stripe | Cobrar de más o de menos | El importe se congela en la orden y el webhook verifica que el total de Stripe coincida; si no, la orden queda `FAILED` |
| Condición de carrera en `usageLimit` | Cupón redimido más veces de lo permitido | Incremento condicional `usedCount < usageLimit` dentro de la transacción de creación de la orden |
| Acoplamiento del cupón a Stripe | Cupón propio de Stripe no refleja las reglas del negocio | Nuestra tabla `Coupon` es la fuente de verdad; el cupón de Stripe es un espejo efímero creado al generar la sesión |
| Regresión en el flujo de compra actual | Checkout roto para todos | La lógica de descuento es una función pura opcional: sin cupón, `totalCents === subtotalCents` como hoy |

## 9. Definición de Hecho (épico)

- [ ] Todas las historias de la feature entregadas
- [ ] Enablers técnicos completados
- [ ] Pruebas de integración del checkout con descuento en verde
- [ ] Cobertura ≥ 80 % en `src/lib/**` y `src/actions/**`
- [ ] Documentación actualizada (`docs/README.md`, `docs/arquitectura.md`)
- [ ] Revisión de diseño (UX) aprobada para la UI del carrito

## 10. Referencias del codebase

- `src/lib/cart/calc.ts` — `calculateCartTotals()` calcula `subtotalCents` y `totalCents`.
- `src/lib/orders.ts` — `createPendingOrder()` congela los totales en la orden.
- `src/actions/checkout.ts` — `startCheckoutAction()` arma los `line_items` de Stripe.
- `src/lib/cart/cart-service.ts` — `getCartWithItems()` rehidrata el carrito del servidor.
- `src/lib/cart/merge.ts` — fusión del carrito de invitado al iniciar sesión.
- `src/app/(shop)/cart/page.tsx` — UI del carrito y resumen de totales.
- `src/app/(admin)/admin/products/page.tsx` — patrón de CRUD del panel admin a replicar.
- `src/lib/validation/product.ts` — patrón de schemas Zod a replicar.
