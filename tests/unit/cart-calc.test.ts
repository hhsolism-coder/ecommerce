import { describe, expect, it } from 'vitest'
import { calculateCartTotals, effectiveQuantity, MAX_ITEM_QUANTITY, type CartLine } from '@/lib/cart/calc'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'prod-1',
    name: 'Producto',
    priceCents: 1000,
    quantity: 1,
    stock: 10,
    ...overrides,
  }
}

describe('calculateCartTotals', () => {
  it('devuelve totales en cero para un carrito vacío', () => {
    expect(calculateCartTotals([])).toEqual({ subtotalCents: 0, totalCents: 0, itemCount: 0 })
  })

  it('suma precio por cantidad de cada línea', () => {
    const totals = calculateCartTotals([
      line({ priceCents: 18990, quantity: 2 }),
      line({ productId: 'prod-2', priceCents: 500, quantity: 3 }),
    ])

    expect(totals.subtotalCents).toBe(18990 * 2 + 500 * 3)
    expect(totals.totalCents).toBe(totals.subtotalCents)
    expect(totals.itemCount).toBe(5)
  })

  it('ignora líneas con cantidad cero', () => {
    const totals = calculateCartTotals([line({ priceCents: 1000, quantity: 0 })])
    expect(totals.subtotalCents).toBe(0)
    expect(totals.itemCount).toBe(0)
  })

  it('acota la cantidad al stock disponible del producto', () => {
    const totals = calculateCartTotals([line({ priceCents: 1000, quantity: 9, stock: 3 })])
    expect(totals.subtotalCents).toBe(3000)
    expect(totals.itemCount).toBe(3)
  })

  it('no cuenta productos agotados', () => {
    const totals = calculateCartTotals([line({ priceCents: 1000, quantity: 2, stock: 0 })])
    expect(totals.subtotalCents).toBe(0)
    expect(totals.itemCount).toBe(0)
  })
})

describe('effectiveQuantity', () => {
  it('devuelve 0 para cantidades no positivas', () => {
    expect(effectiveQuantity(0, 10)).toBe(0)
    expect(effectiveQuantity(-4, 10)).toBe(0)
  })

  it('acota al stock disponible', () => {
    expect(effectiveQuantity(5, 2)).toBe(2)
  })

  it('acota al máximo por línea', () => {
    expect(effectiveQuantity(500, 1000)).toBe(MAX_ITEM_QUANTITY)
  })

  it('devuelve 0 si no hay stock', () => {
    expect(effectiveQuantity(3, 0)).toBe(0)
  })
})
