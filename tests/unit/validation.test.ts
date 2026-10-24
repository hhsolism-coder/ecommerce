import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '@/lib/validation/auth'
import { cartQuantitySchema, productSchema, updateOrderStatusSchema, updateUserRoleSchema } from '@/lib/validation/product'

describe('registerSchema', () => {
  it('acepta un registro válido', () => {
    const parsed = registerSchema.safeParse({
      name: 'Fabrizio',
      email: 'Fabrizio@Example.COM',
      password: 'contraseña123',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.email).toBe('fabrizio@example.com')
    }
  })

  it('rechaza un email inválido', () => {
    const parsed = registerSchema.safeParse({ name: 'Fabrizio', email: 'no-es-email', password: '12345678' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza contraseñas de menos de 8 caracteres', () => {
    const parsed = registerSchema.safeParse({ name: 'Fabrizio', email: 'a@b.cl', password: 'corta' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un nombre demasiado corto', () => {
    const parsed = registerSchema.safeParse({ name: 'A', email: 'a@b.cl', password: '12345678' })
    expect(parsed.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('acepta email y contraseña', () => {
    expect(loginSchema.safeParse({ email: 'a@b.cl', password: 'x' }).success).toBe(true)
  })

  it('exige contraseña', () => {
    expect(loginSchema.safeParse({ email: 'a@b.cl', password: '' }).success).toBe(false)
  })
})

describe('cartQuantitySchema', () => {
  it('acepta cantidades dentro del rango', () => {
    expect(cartQuantitySchema.safeParse(1).success).toBe(true)
    expect(cartQuantitySchema.safeParse('3').success).toBe(true)
  })

  it('rechaza cero, negativos y decimales', () => {
    expect(cartQuantitySchema.safeParse(0).success).toBe(false)
    expect(cartQuantitySchema.safeParse(-1).success).toBe(false)
    expect(cartQuantitySchema.safeParse(1.5).success).toBe(false)
  })

  it('rechaza cantidades por encima del máximo', () => {
    expect(cartQuantitySchema.safeParse(1000).success).toBe(false)
  })
})

describe('productSchema', () => {
  const valid = {
    name: 'Camiseta',
    description: 'Una descripción suficientemente larga',
    price: '19990',
    stock: '10',
    status: 'ACTIVE',
  }

  it('acepta un producto válido', () => {
    expect(productSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza un precio vacío', () => {
    expect(productSchema.safeParse({ ...valid, price: '' }).success).toBe(false)
  })

  it('rechaza stock negativo', () => {
    expect(productSchema.safeParse({ ...valid, stock: '-1' }).success).toBe(false)
  })

  it('rechaza un estado desconocido', () => {
    expect(productSchema.safeParse({ ...valid, status: 'RARO' }).success).toBe(false)
  })
})

describe('updateUserRoleSchema / updateOrderStatusSchema', () => {
  it('acepta solo roles conocidos', () => {
    expect(updateUserRoleSchema.safeParse({ userId: 'u1', role: 'ADMIN' }).success).toBe(true)
    expect(updateUserRoleSchema.safeParse({ userId: 'u1', role: 'SUPER' }).success).toBe(false)
  })

  it('acepta solo estados conocidos', () => {
    expect(updateOrderStatusSchema.safeParse({ orderId: 'o1', status: 'PAID' }).success).toBe(true)
    expect(updateOrderStatusSchema.safeParse({ orderId: 'o1', status: 'ENVIADO' }).success).toBe(false)
  })
})
