import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from '@/lib/slug'

describe('slugify', () => {
  it('convierte texto a formato URL', () => {
    expect(slugify('Camiseta de Algodón Premium')).toBe('camiseta-de-algodon-premium')
  })

  it('quita acentos', () => {
    expect(slugify('Café con Leche')).toBe('cafe-con-leche')
  })

  it('colapsa espacios y signos a guiones simples', () => {
    expect(slugify('  Hola   ///  Mundo!!  ')).toBe('hola-mundo')
  })

  it('devuelve cadena vacía para entrada sin caracteres válidos', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('uniqueSlug', () => {
  it('devuelve el slug base si está libre', async () => {
    const slug = await uniqueSlug('Camiseta Roja', async () => false)
    expect(slug).toBe('camiseta-roja')
  })

  it('añade un sufijo numérico si ya existe', async () => {
    const slug = await uniqueSlug('Camiseta Roja', async (candidate) => candidate === 'camiseta-roja')
    expect(slug).toBe('camiseta-roja-1')
  })

  it('usa un fallback cuando el texto no genera slug', async () => {
    const slug = await uniqueSlug('###', async () => false)
    expect(slug).toBe('producto')
  })
})
