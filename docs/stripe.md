# Pago con Stripe

> Volver a la [portada](../README.md) · [Índice de documentación](./README.md)

## Puesta en marcha local

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

## Webhook

`POST /api/webhooks/stripe` corre en runtime Node y procesa:

- `checkout.session.completed` → marca la orden como `PAID` y descuenta el stock.
- `payment_intent.payment_failed` → marca la orden como `FAILED`.

El procesamiento es **idempotente**: los eventos se reenvían todo el tiempo, así que la orden se
identifica por `stripeSessionId` (único en la base) y el stock solo se descuenta una vez.

Si Stripe no está configurado, el endpoint responde **503** (configuración incompleta) y no 400:
así Stripe reintenta en vez de contar el evento como mal firmado.

## Ciclo de vida de un pedido

| Momento | Estado del pedido | Stock |
|---|---|---|
| Se crea la sesión de Stripe | `PENDING` / `UNPAID` | intacto |
| Llega `checkout.session.completed` | `PAID` / `PAID` | descontado |
| Falla la creación de la sesión | `CANCELLED` / `FAILED` | intacto |
| El admin marca pagado a mano | `PAID` / `PAID` | descontado |
| El admin cancela un pedido pagado | `CANCELLED` | devuelto |
| El admin cancela un pedido pendiente | `CANCELLED` | intacto (nunca se descontó) |

La lógica de pago vive en una sola función, `markOrderPaid()` (`src/lib/orders.ts`), que comparten
el webhook y el panel admin. Ver [arquitectura.md](./arquitectura.md).

## Notas

- El checkout es **alojado por Stripe**: los datos de la tarjeta nunca pasan por esta tienda.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está en `.env.example` por completitud, pero la app no usa
  Stripe.js: no hace falta para el checkout alojado.
- El formato de precio es `US$189,90` (moneda `usd` con formato `es-CL`).
