import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fieldErrorsFrom } from '@/lib/validation/errors'
import { productSchema } from '@/lib/validation/product'

describe('fieldErrorsFrom', () => {
  it('devuelve el primer mensaje de error por campo', () => {
    const result = productSchema.safeParse({ name: 'A', description: 'corta', price: '', stock: '-1' })
    expect(result.success).toBe(false)
    if (result.success) return

    const errors = fieldErrorsFrom(result.error)

    expect(errors.name).toBeTruthy()
    expect(errors.description).toBeTruthy()
    expect(errors.price).toBeTruthy()
    expect(errors.stock).toBeTruthy()
  })

  it('devuelve un mapa vacío si el error no tiene errores de campo', () => {
    const schema = z.string().refine((value) => value === 'ok', 'valor inválido')
    const result = schema.safeParse('no')
    expect(result.success).toBe(false)
    if (result.success) return

    expect(fieldErrorsFrom(result.error)).toEqual({})
  })
})
