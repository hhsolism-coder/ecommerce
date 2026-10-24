import { getCartWithItems } from '@/lib/cart/cart-service'
import { CartView } from '@/components/cart/cart-view'
import { Container } from '@/components/container'
import { PageHeader } from '@/components/page-header'

export const metadata = { title: 'Carrito' }

export default async function CartPage() {
  const cart = await getCartWithItems()
  const itemCount = cart?.totals.itemCount ?? 0

  return (
    <Container className="py-10 md:py-12">
      <PageHeader
        eyebrow="Tu pedido"
        title="Carrito"
        description={
          itemCount > 0
            ? `${itemCount} producto${itemCount === 1 ? '' : 's'} listo${itemCount === 1 ? '' : 's'} para pagar.`
            : 'Revisá lo que agregaste antes de pagar con Stripe.'
        }
      />

      <div className="mt-8">
        {cart && cart.lines.length > 0 ? (
          <CartView
            lines={cart.lines.map((line) => ({
              itemId: line.itemId ?? line.productId,
              productId: line.productId,
              name: line.name,
              priceCents: line.priceCents,
              currency: line.currency ?? 'usd',
              quantity: line.quantity,
              stock: line.stock,
            }))}
            subtotalCents={cart.totals.subtotalCents}
            totalCents={cart.totals.totalCents}
          />
        ) : (
          <CartView lines={[]} subtotalCents={0} totalCents={0} />
        )}
      </div>
    </Container>
  )
}
