import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/container'

export default function NotFound() {
  return (
    <Container size="reading" className="py-16">
      <div className="rounded-lg bg-card px-6 py-14 text-center ring-1 ring-foreground/10">
        <SearchX className="mx-auto size-9 text-muted-foreground" />
        <p className="stamp mt-5 text-primary">Error 404</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance">
          Esta página no existe
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Puede que el producto ya no esté disponible o que el enlace esté mal escrito. Te dejamos
          el camino de vuelta.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/products">Ver catálogo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}
