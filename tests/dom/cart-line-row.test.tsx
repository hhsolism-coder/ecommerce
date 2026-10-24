import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartLineRow, type CartLineView } from '@/components/cart/cart-line-row'

const line: CartLineView = {
  itemId: 'item-1',
  productId: 'prod-1',
  name: 'Camiseta',
  priceCents: 1000,
  currency: 'usd',
  quantity: 2,
  stock: 5,
}

describe('CartLineRow', () => {
  it('muestra el nombre, la cantidad y el subtotal de la línea', () => {
    render(<CartLineRow line={line} onQuantityChange={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByText('Camiseta')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad de Camiseta')).toHaveTextContent('2')
    expect(screen.getByText(/20[.,]00/)).toBeInTheDocument()
  })

  it('emite la cantidad incrementada al sumar una unidad', async () => {
    const user = userEvent.setup()
    const onQuantityChange = vi.fn()
    render(<CartLineRow line={line} onQuantityChange={onQuantityChange} onRemove={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Agregar una unidad de Camiseta' }))

    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 3)
  })

  it('emite la cantidad decrementada al restar una unidad', async () => {
    const user = userEvent.setup()
    const onQuantityChange = vi.fn()
    render(<CartLineRow line={line} onQuantityChange={onQuantityChange} onRemove={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Quitar una unidad de Camiseta' }))

    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 1)
  })

  it('no permite restar por debajo de una unidad', () => {
    render(<CartLineRow line={{ ...line, quantity: 1 }} onQuantityChange={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Quitar una unidad de Camiseta' })).toBeDisabled()
  })

  it('no permite superar el stock disponible', () => {
    render(<CartLineRow line={{ ...line, quantity: 5, stock: 5 }} onQuantityChange={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Agregar una unidad de Camiseta' })).toBeDisabled()
  })

  it('llama al handler de eliminación con el id del ítem', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<CartLineRow line={line} onQuantityChange={vi.fn()} onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onRemove).toHaveBeenCalledWith('item-1')
  })
})
