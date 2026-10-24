import Stripe from 'stripe'

let cached: Stripe | null = null

/**
 * Patrones de los valores placeholder que trae `.env.example`.
 * Una clave con estos marcadores no sirve para hablar con Stripe: si la trataramos
 * como configurada, el checkout fallaría con un 401 de Stripe en vez de explicar
 * claramente que faltan las claves.
 */
const PLACEHOLDER_PATTERN = /placeholder|xxxx|changeme|cambia|tu-clave|replace_me/i

export function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true
  return PLACEHOLDER_PATTERN.test(value)
}

/**
 * ¿Hay claves de Stripe utilizables? Permite que la app arranque y se navegue
 * sin credenciales (catálogo, carrito, panel admin) y solo falle al pagar.
 */
export function isStripeConfigured(): boolean {
  return !isPlaceholderKey(process.env.STRIPE_SECRET_KEY)
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey || isPlaceholderKey(secretKey)) {
    throw new Error(
      'STRIPE_SECRET_KEY no está configurado. Copia .env.example a .env y agrega tus claves de prueba de Stripe.',
    )
  }
  cached ??= new Stripe(secretKey)
  return cached
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || isPlaceholderKey(secret)) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET no está configurado. Si usas la Stripe CLI, copia el valor `whsec_...` que imprime al iniciar.',
    )
  }
  return secret
}

export function getAppUrl(): string {
  // `||` (y no `??`) para que una variable definida pero vacía también caiga al default.
  return process.env.APP_URL || 'http://localhost:3000'
}
