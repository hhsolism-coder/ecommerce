import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartSummary } from '@/components/cart/cart-summary'

describe('CartSummary', () => {
  it('muestra el subtotal, el total y la cantidad de productos', () => {
    render(
      <CartSummary
        subtotalCents={18990}
        totalCents={18990}
        itemCount={2}
        onCheckout={vi.fn()}
      />,
    )

    // El importe aparece dos veces: en el subtotal y en el total.
    expect(screen.getAllByText(/189[.,]90/)).toHaveLength(2)
    expect(screen.getByText('Productos (2)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagar con Stripe' })).toBeEnabled()
  })

  it('deshabilita el botón de pago cuando el carrito está vacío', () => {
    render(<CartSummary subtotalCents={0} totalCents={0} itemCount={0} onCheckout={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Pagar con Stripe' })).toBeDisabled()
  })

  it('lanza el checkout al pulsar el botón', async () => {
    const user = userEvent.setup()
    const onCheckout = vi.fn()
    render(
      <CartSummary subtotalCents={1000} totalCents={1000} itemCount={1} onCheckout={onCheckout} />,
    )

    await user.click(screen.getByRole('button', { name: 'Pagar con Stripe' }))

    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('muestra el error recibido', () => {
    render(
      <CartSummary
        subtotalCents={1000}
        totalCents={1000}
        itemCount={1}
        error="Stripe no está configurado."
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Stripe no está configurado.')
  })

  it('deshabilita el botón mientras hay una operación en curso', () => {
    render(
      <CartSummary
        subtotalCents={1000}
        totalCents={1000}
        itemCount={1}
        pending
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Redirigiendo al pago…' })).toBeDisabled()
  })
})
