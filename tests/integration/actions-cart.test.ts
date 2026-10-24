import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { addToCartAction, removeCartItemAction, updateCartItemAction } from '@/actions/cart'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { signSessionToken } from '@/lib/auth/jwt'
import { CART_COOKIE } from '@/lib/cart/cart-service'
import { cookieStore, resetNextMocks } from '../helpers/next-mock-state'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
  resetNextMocks()
})

async function signInAs(user: { id: string; role: 'ADMIN' | 'USER' }) {
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
  })
  const token = await signSessionToken({ sub: user.id, sid: session.id, role: user.role })
  cookieStore.set(SESSION_COOKIE, token)
  return session
}

describe('addToCartAction', () => {
  it('crea un carrito de invitado y emite su cookie', async () => {
    const product = await createProduct({ stock: 5 })

    const result = await addToCartAction(product.id, 2)

    expect(result).toEqual({ ok: true })
    expect(cookieStore.has(CART_COOKIE)).toBe(true)

    const cart = await prisma.cart.findFirstOrThrow({ include: { items: true } })
    expect(cart.userId).toBeNull()
    expect(cart.guestHash).toBeTruthy()
    expect(cart.items[0].quantity).toBe(2)
  })

  it('usa el carrito del usuario autenticado', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 5 })

    await addToCartAction(product.id, 1)

    const cart = await prisma.cart.findFirstOrThrow({
      where: { userId: user.id },
      include: { items: true },
    })
    expect(cart.items).toHaveLength(1)
  })

  it('rechaza una cantidad inválida', async () => {
    const product = await createProduct({ stock: 5 })

    const result = await addToCartAction(product.id, 0)

    expect(result.ok).toBe(false)
    await expect(prisma.cartItem.count()).resolves.toBe(0)
  })

  it('rechaza un producto agotado', async () => {
    const product = await createProduct({ stock: 0 })

    const result = await addToCartAction(product.id, 1)

    expect(result.ok).toBe(false)
  })

  it('rechaza una cantidad mayor al stock', async () => {
    const product = await createProduct({ stock: 2 })

    const result = await addToCartAction(product.id, 5)

    expect(result.ok).toBe(false)
  })
})

describe('updateCartItemAction', () => {
  it('actualiza la cantidad de la línea', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 10 })
    await addToCartAction(product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow()
    const result = await updateCartItemAction(item.id, 4)

    expect(result).toEqual({ ok: true })
    const updated = await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(updated.quantity).toBe(4)
  })

  it('no puede tocar la línea de otro carrito', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 10 })

    const otro = await prisma.cart.create({ data: { guestHash: 'hash-otro-carrito' } })
    const item = await prisma.cartItem.create({
      data: { cartId: otro.id, productId: product.id, quantity: 1 },
    })

    const result = await updateCartItemAction(item.id, 5)

    expect(result.ok).toBe(false)
  })
})

describe('removeCartItemAction', () => {
  it('elimina la línea del carrito', async () => {
    const user = await createUser()
    await signInAs(user)
    const product = await createProduct({ stock: 10 })
    await addToCartAction(product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow()
    const result = await removeCartItemAction(item.id)

    expect(result).toEqual({ ok: true })
    await expect(prisma.cartItem.findUnique({ where: { id: item.id } })).resolves.toBeNull()
  })
})
