import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db'
import { addItemToCart, removeCartItem, setCartItemQuantity } from '@/lib/cart/cart-service'
import { createProduct, createUser, resetDatabase } from '../helpers/db'

beforeEach(async () => {
  await resetDatabase()
})

async function createCart() {
  const user = await createUser()
  return prisma.cart.create({ data: { userId: user.id } })
}

describe('addItemToCart', () => {
  it('agrega un producto al carrito', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 5 })

    const result = await addItemToCart(cart.id, product.id, 2)

    expect(result).toEqual({ ok: true })
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('suma la cantidad cuando el producto ya está en el carrito', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 5 })

    await addItemToCart(cart.id, product.id, 1)
    await addItemToCart(cart.id, product.id, 2)

    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
  })

  it('rechaza un producto inexistente', async () => {
    const cart = await createCart()
    const result = await addItemToCart(cart.id, 'no-existe', 1)
    expect(result.ok).toBe(false)
  })

  it('rechaza un producto agotado', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 0 })

    const result = await addItemToCart(cart.id, product.id, 1)

    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error')
  })

  it('rechaza un producto que no está activo', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 5, status: 'DRAFT' })

    const result = await addItemToCart(cart.id, product.id, 1)

    expect(result.ok).toBe(false)
  })

  it('rechaza superar el stock disponible', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 3 })

    const result = await addItemToCart(cart.id, product.id, 5)

    expect(result.ok).toBe(false)
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } })
    expect(items).toHaveLength(0)
  })
})

describe('setCartItemQuantity', () => {
  it('actualiza la cantidad de una línea', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 10 })
    await addItemToCart(cart.id, product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId: cart.id } })
    const result = await setCartItemQuantity(cart.id, item.id, 4)

    expect(result).toEqual({ ok: true })
    const updated = await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(updated.quantity).toBe(4)
  })

  it('elimina la línea cuando la cantidad llega a cero', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 10 })
    await addItemToCart(cart.id, product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId: cart.id } })
    await setCartItemQuantity(cart.id, item.id, 0)

    await expect(prisma.cartItem.findUnique({ where: { id: item.id } })).resolves.toBeNull()
  })

  it('acota la cantidad al stock disponible', async () => {
    const cart = await createCart()
    const product = await createProduct({ stock: 2 })
    await addItemToCart(cart.id, product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId: cart.id } })
    const result = await setCartItemQuantity(cart.id, item.id, 9)

    expect(result.ok).toBe(false)
    const unchanged = await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(unchanged.quantity).toBe(1)
  })

  it('no toca líneas de otro carrito', async () => {
    const cart = await createCart()
    const otroCart = await createCart()
    const product = await createProduct({ stock: 10 })
    await addItemToCart(otroCart.id, product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId: otroCart.id } })
    const result = await setCartItemQuantity(cart.id, item.id, 5)

    expect(result.ok).toBe(false)
  })
})

describe('removeCartItem', () => {
  it('elimina la línea del carrito', async () => {
    const cart = await createCart()
    const product = await createProduct()
    await addItemToCart(cart.id, product.id, 1)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId: cart.id } })
    const result = await removeCartItem(cart.id, item.id)

    expect(result).toEqual({ ok: true })
    await expect(prisma.cartItem.findUnique({ where: { id: item.id } })).resolves.toBeNull()
  })

  it('devuelve error si la línea no pertenece al carrito', async () => {
    const cart = await createCart()
    const result = await removeCartItem(cart.id, 'inexistente')
    expect(result.ok).toBe(false)
  })
})
