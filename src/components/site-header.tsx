import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { getCartWithItems } from '@/lib/cart/cart-service'
import { getSessionUser } from '@/lib/auth/session'
import { Container } from '@/components/container'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'
import { Button } from '@/components/ui/button'

export async function SiteHeader() {
  const user = await getSessionUser()
  const cart = await getCartWithItems()
  const itemCount = cart?.totals.itemCount ?? 0
  const isAdmin = user?.role === 'ADMIN'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="border-b border-foreground/10 bg-foreground text-background">
        <Container className="flex h-8 items-center justify-center">
          <p className="stamp text-center text-background/80">
            <span className="hidden sm:inline">Tienda de demostración · </span>Stock real · Pagos con
            Stripe
          </p>
        </Container>
      </div>

      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-heading text-xl leading-none font-semibold tracking-tight">
              Ecommerce
            </span>
            <span className="stamp hidden text-muted-foreground transition-colors group-hover:text-primary sm:inline">
              tienda
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
            <Link
              href="/products"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Catálogo
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Panel admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="relative size-10">
            <Link href="/cart" aria-label={`Carrito con ${itemCount} productos`}>
              <ShoppingBag className="size-[18px]" />
              {itemCount > 0 ? (
                <span
                  data-numeric
                  className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                >
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {user ? (
            <UserMenu name={user.name} email={user.email} isAdmin={isAdmin} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button asChild size="sm" className="hidden h-9 px-3.5 sm:inline-flex">
                <Link href="/register">Crear cuenta</Link>
              </Button>
            </>
          )}

          <MobileNav isAdmin={isAdmin} isAuthenticated={Boolean(user)} />
        </div>
      </Container>
    </header>
  )
}
