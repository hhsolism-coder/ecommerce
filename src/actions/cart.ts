'use server'

import { revalidatePath } from 'next/cache'
import {
  addItemToCart,
  getOrCreateCart,
  removeCartItem,
  setCartItemQuantity,
} from '@/lib/cart/cart-service'
import { cartQuantitySchema } from '@/lib/validation/product'

export type CartActionResult = { ok: true } | { ok: false; error: string }

export async function addToCartAction(productId: string, quantity: number): Promise<CartActionResult> {
  const parsed = cartQuantitySchema.safeParse(quantity)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Cantidad inválida.' }
  }

  const cart = await getOrCreateCart()
  const result = await addItemToCart(cart.id, productId, parsed.data)

  if (result.ok) {
    revalidatePath('/cart')
    revalidatePath('/products')
  }

  return result
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<CartActionResult> {
  const cart = await getOrCreateCart()
  const result = await setCartItemQuantity(cart.id, itemId, quantity)

  if (result.ok) {
    revalidatePath('/cart')
  }

  return result
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  const cart = await getOrCreateCart()
  const result = await removeCartItem(cart.id, itemId)

  if (result.ok) {
    revalidatePath('/cart')
  }

  return result
}
