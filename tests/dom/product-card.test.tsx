import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from '@/components/product-card'

vi.mock('@/actions/cart', () => ({
  addToCartAction: vi.fn(async () => ({ ok: true })),
}))

const baseProduct = {
  id: 'prod-1',
  name: 'Camiseta de Algodón',
  slug: 'camiseta-algodon',
  priceCents: 18990,
  currency: 'usd',
  stock: 5,
  imageUrl: null,
  categoryName: 'Camisetas',
}

describe('ProductCard', () => {
  it('muestra el nombre, el precio y la categoría', () => {
    render(<ProductCard product={baseProduct} />)

    expect(screen.getByRole('link', { name: 'Camiseta de Algodón' })).toBeInTheDocument()
    // El separador decimal depende del locale (es-CL usa coma), por eso el patrón.
    expect(screen.getByText(/189[.,]90/)).toBeInTheDocument()
    expect(screen.getByText('Camisetas')).toBeInTheDocument()
  })

  it('muestra el stock disponible', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('5 disponibles')).toBeInTheDocument()
  })

  it('deshabilita el botón de agregar cuando no hay stock', () => {
    render(<ProductCard product={{ ...baseProduct, stock: 0 }} />)

    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })

  it('habilita el botón de agregar cuando hay stock', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled()
  })

  it('enlaza al detalle del producto', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByRole('link', { name: 'Camiseta de Algodón' })).toHaveAttribute(
      'href',
      '/products/camiseta-algodon',
    )
  })
})
