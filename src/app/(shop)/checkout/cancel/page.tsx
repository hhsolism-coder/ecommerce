import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/container'

export const metadata = { title: 'Pago cancelado' }

export default function CheckoutCancelPage() {
  return (
    <Container size="reading" className="py-16">
      <div className="rounded-lg bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
        <XCircle className="mx-auto size-9 text-muted-foreground" />
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">Pago cancelado</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No se cobró nada. Tu carrito sigue intacto, así que podés volver a intentarlo cuando quieras.
        </p>
        <Button asChild className="mt-7">
          <Link href="/cart">Volver al carrito</Link>
        </Button>
      </div>
    </Container>
  )
}
