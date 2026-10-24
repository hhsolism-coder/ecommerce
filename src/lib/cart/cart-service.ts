import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth/session'
import { calculateCartTotals, effectiveQuantity, type CartLine, type CartTotals } from './calc'
import { mergeCartItemsWithStock } from './merge'

export const CART_COOKIE = 'cart_token'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export type CartWithItems = {
  id: string
  lines: CartLine[]
  totals: CartTotals
}

/** Hash SHA-256 del token de invitado: en la BD nunca se guarda el token en claro. */
export function hashCartToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateCartToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Identidad del dueño del carrito: usuario autenticado o invitado (por cookie).
 * Solo LECTURA: se puede llamar desde un Server Component.
 */
async function resolveCartOwner(): Promise<{ userId: string } | { guestHash: string } | null> {
  const user = await getSessionUser()
  if (user) return { userId: user.id }

  const store = await cookies()
  const token = store.get(CART_COOKIE)?.value
  if (!token) return null

  return { guestHash: hashCartToken(token) }
}

/**
 * Carrito del visitante actual. No crea nada: si no hay carrito, devuelve `null`.
 * Seguro para Server Components (no escribe cookies).
 */
export async function getCartWithItems(): Promise<CartWithItems | null> {
  const owner = await resolveCartOwner()
  if (!owner) return null

  const cart = await prisma.cart.findFirst({
    where: owner,
    include: { items: { include: { product: true }, orderBy: { id: 'asc' } } },
  })

  if (!cart) return null
  return buildCartPayload(cart)
}

function buildCartPayload(cart: {
  id: string
  items: Array<{
    id: string
    quantity: number
    product: { id: string; name: string; priceCents: number; stock: number; currency: string }
  }>
}): CartWithItems {
  const lines: CartLine[] = cart.items.map((item) => ({
    itemId: item.id,
    productId: item.product.id,
    name: item.product.name,
    priceCents: item.product.priceCents,
    quantity: item.quantity,
    stock: item.product.stock,
    currency: item.product.currency,
  }))

  return { id: cart.id, lines, totals: calculateCartTotals(lines) }
}

/**
 * Obtiene (o crea) el carrito del usuario autenticado.
 * Para invitados requiere el token de cookie; si no existe, lo emite.
 * Solo usar dentro de Server Actions o Route Handlers (escribe cookies).
 */
export async function getOrCreateCart(): Promise<{ id: string; userId: string | null }> {
  const user = await getSessionUser()

  if (user) {
    const existing = await prisma.cart.findFirst({ where: { userId: user.id } })
    if (existing) return { id: existing.id, userId: user.id }
    const created = await prisma.cart.create({ data: { userId: user.id } })
    return { id: created.id, userId: user.id }
  }

  const store = await cookies()
  let token = store.get(CART_COOKIE)?.value
  if (!token) {
    token = generateCartToken()
    store.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_COOKIE_MAX_AGE,
    })
  }

  const guestHash = hashCartToken(token)
  const existing = await prisma.cart.findUnique({ where: { guestHash } })
  if (existing) return { id: existing.id, userId: null }

  const created = await prisma.cart.create({ data: { guestHash } })
  return { id: created.id, userId: null }
}

/**
 * Agrega un producto al carrito, validando stock y estado en el servidor.
 */
export async function addItemToCart(
  cartId: string,
  productId: string,
  quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { ok: false, error: 'El producto no existe.' }
  if (product.status !== 'ACTIVE') return { ok: false, error: 'El producto no está disponible.' }
  if (product.stock <= 0) return { ok: false, error: 'El producto está agotado.' }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  })

  const requested = (existing?.quantity ?? 0) + quantity
  const finalQuantity = effectiveQuantity(requested, product.stock)

  if (finalQuantity <= 0) return { ok: false, error: 'La cantidad supera el stock disponible.' }
  if (finalQuantity < requested) {
    return { ok: false, error: `Solo quedan ${product.stock} unidades disponibles.` }
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: finalQuantity } })
  } else {
    await prisma.cartItem.create({ data: { cartId, productId, quantity: finalQuantity } })
  }

  return { ok: true }
}

/**
 * Fija la cantidad de una línea del carrito.
 */
export async function setCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: { product: true } })
  if (!item) return { ok: false, error: 'El producto no está en el carrito.' }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } })
    return { ok: true }
  }

  const finalQuantity = effectiveQuantity(quantity, item.product.stock)
  if (finalQuantity <= 0) return { ok: false, error: 'El producto está agotado.' }
  if (finalQuantity < quantity) {
    return { ok: false, error: `Solo quedan ${item.product.stock} unidades disponibles.` }
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: finalQuantity } })
  return { ok: true }
}

/**
 * Elimina una línea del carrito.
 */
export async function removeCartItem(cartId: string, itemId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } })
  if (!item) return { ok: false, error: 'El producto no está en el carrito.' }
  await prisma.cartItem.delete({ where: { id: itemId } })
  return { ok: true }
}

/**
 * Vacía el carrito.
 */
export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } })
}

/**
 * Fusiona el carrito de invitado con el del usuario al iniciar sesión.
 *
 * - Si el usuario no tenía carrito, se transfiere el de invitado.
 * - Si ya tenía uno, se suman las cantidades por producto y se elimina el carrito de invitado.
 */
export async function mergeGuestCartIntoUserCart(userId: string): Promise<void> {
  const store = await cookies()
  const token = store.get(CART_COOKIE)?.value
  if (!token) return

  const guestHash = hashCartToken(token)
  const guestCart = await prisma.cart.findUnique({ where: { guestHash }, include: { items: true } })
  if (!guestCart) return

  const userCart = await prisma.cart.findFirst({ where: { userId }, include: { items: true } })

  if (!userCart) {
    await prisma.cart.update({ where: { id: guestCart.id }, data: { userId, guestHash: null } })
    store.delete(CART_COOKIE)
    return
  }

  const products = await prisma.product.findMany({
    where: { id: { in: guestCart.items.map((item) => item.productId) } },
    select: { id: true, stock: true },
  })
  const stockByProduct = new Map(products.map((product) => [product.id, product.stock]))

  const merged = mergeCartItemsWithStock(
    userCart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    guestCart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    stockByProduct,
  )

  for (const item of merged) {
    if (item.quantity <= 0) continue
    const existing = userCart.items.find((candidate) => candidate.productId === item.productId)
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: item.quantity } })
    } else {
      await prisma.cartItem.create({ data: { cartId: userCart.id, productId: item.productId, quantity: item.quantity } })
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } })
  store.delete(CART_COOKIE)
}
