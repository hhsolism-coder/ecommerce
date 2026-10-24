'use client'

import Link from 'next/link'
import { Menu, Package, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function MobileNav({ isAdmin, isAuthenticated }: { isAdmin: boolean; isAuthenticated: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 md:hidden" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="font-heading text-lg">Menú</SheetTitle>
          <SheetDescription>Navegá por la tienda y tu cuenta.</SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-3">
          <SheetClose asChild>
            <Link
              href="/products"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Package className="size-4 text-muted-foreground" />
              Catálogo
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/cart"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ShoppingBag className="size-4 text-muted-foreground" />
              Carrito
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserRound className="size-4 text-muted-foreground" />
              Mi cuenta
            </Link>
          </SheetClose>

          {isAdmin ? (
            <SheetClose asChild>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ShieldCheck className="size-4 text-muted-foreground" />
                Panel de administración
              </Link>
            </SheetClose>
          ) : null}

          {!isAuthenticated ? (
            <>
              <SheetClose asChild>
                <Link
                  href="/login"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  Ingresar
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <Link
                  href="/register"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Package className="size-4 text-muted-foreground" />
                  Crear cuenta
                </Link>
              </SheetClose>
            </>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-border p-5">
          <SheetClose asChild>
            <Button asChild className="w-full" size="lg">
              <Link href="/products">Ver catálogo</Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
