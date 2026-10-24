import { describe, expect, it } from 'vitest'
import { mergeCartItems, mergeCartItemsWithStock } from '@/lib/cart/merge'

describe('mergeCartItems', () => {
  it('suma las cantidades cuando el producto ya existe', () => {
    const merged = mergeCartItems(
      [{ productId: 'p1', quantity: 2 }],
      [{ productId: 'p1', quantity: 3 }],
    )

    expect(merged).toEqual([{ productId: 'p1', quantity: 5 }])
  })

  it('agrega los productos que no existen en el destino', () => {
    const merged = mergeCartItems(
      [{ productId: 'p1', quantity: 1 }],
      [{ productId: 'p2', quantity: 4 }],
    )

    expect(merged).toEqual([
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 4 },
    ])
  })

  it('nunca duplica una fila por producto', () => {
    const merged = mergeCartItems(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    )

    expect(merged).toHaveLength(2)
    expect(merged.find((item) => item.productId === 'p1')?.quantity).toBe(2)
    expect(merged.find((item) => item.productId === 'p2')?.quantity).toBe(2)
  })

  it('devuelve una lista vacía si no hay nada que fusionar', () => {
    expect(mergeCartItems([], [])).toEqual([])
  })
})

describe('mergeCartItemsWithStock', () => {
  it('acota la cantidad fusionada al stock disponible', () => {
    const merged = mergeCartItemsWithStock(
      [{ productId: 'p1', quantity: 5 }],
      [{ productId: 'p1', quantity: 5 }],
      new Map([['p1', 3]]),
    )

    expect(merged).toEqual([{ productId: 'p1', quantity: 3 }])
  })

  it('deja en 0 los productos sin stock registrado', () => {
    const merged = mergeCartItemsWithStock([], [{ productId: 'pX', quantity: 2 }], new Map())
    expect(merged).toEqual([{ productId: 'pX', quantity: 0 }])
  })
})
