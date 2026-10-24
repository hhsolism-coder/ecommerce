import Link from 'next/link'
import { Container } from '@/components/container'

const shopLinks = [
  { href: '/products', label: 'Catálogo completo' },
  { href: '/products?category=camisetas', label: 'Camisetas' },
  { href: '/products?category=accesorios', label: 'Accesorios' },
  { href: '/products?category=hogar', label: 'Hogar' },
]

const accountLinks = [
  { href: '/account', label: 'Mi cuenta' },
  { href: '/cart', label: 'Mi carrito' },
  { href: '/register', label: 'Crear cuenta' },
  { href: '/login', label: 'Ingresar' },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card/50">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="font-heading text-xl font-semibold tracking-tight">Ecommerce</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tienda de demostración: catálogo con stock real en base de datos, carrito persistente y pago
            con Stripe en modo test.
          </p>
          <p className="stamp mt-5 text-muted-foreground">Hecho con Next.js, Prisma y Stripe</p>
        </div>

        <nav aria-labelledby="footer-tienda">
          <p id="footer-tienda" className="stamp text-foreground">
            Tienda
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {shopLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-cuenta">
          <p id="footer-cuenta" className="stamp text-foreground">
            Cuenta
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {accountLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Ecommerce · Demostración local</p>
          <p className="stamp text-muted-foreground/80">Las compras son ficticias · Stripe test mode</p>
        </Container>
      </div>
    </footer>
  )
}
