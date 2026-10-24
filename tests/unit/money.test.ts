import { describe, expect, it } from 'vitest'
import { discountFactor, formatMoney, parsePriceToCents } from '@/lib/money'

describe('formatMoney', () => {
  it('convierte centavos a un monto con símbolo', () => {
    const formatted = formatMoney(18990, 'usd', 'en-US')
    expect(formatted).toContain('189.90')
  })

  it('devuelve 0 ante valores no numéricos', () => {
    expect(formatMoney(Number.NaN, 'usd', 'en-US')).toContain('0.00')
  })
})

describe('parsePriceToCents', () => {
  it('convierte un número a centavos', () => {
    expect(parsePriceToCents(19.99)).toBe(1999)
  })

  it('convierte texto con punto decimal', () => {
    expect(parsePriceToCents('1299.50')).toBe(129950)
  })

  it('convierte texto con coma decimal', () => {
    expect(parsePriceToCents('1299,50')).toBe(129950)
  })

  it('usa el último separador como decimal cuando hay punto y coma', () => {
    expect(parsePriceToCents('1.299,50')).toBe(129950)
    expect(parsePriceToCents('1,299.50')).toBe(129950)
  })

  it('interpreta los puntos como separadores de miles cuando no hay decimales', () => {
    expect(parsePriceToCents('1.299')).toBe(129900)
    expect(parsePriceToCents('1.299.000')).toBe(129900000)
  })

  it('devuelve 0 para entradas inválidas', () => {
    expect(parsePriceToCents('abc')).toBe(0)
    expect(parsePriceToCents('')).toBe(0)
  })
})

describe('discountFactor', () => {
  it('devuelve 1 sin descuento', () => {
    expect(discountFactor(0)).toBe(1)
  })

  it('aplica el porcentaje de descuento', () => {
    expect(discountFactor(25)).toBe(0.75)
  })

  it('acota el porcentaje al rango válido', () => {
    expect(discountFactor(150)).toBe(0)
    expect(discountFactor(-10)).toBe(1)
  })
})
