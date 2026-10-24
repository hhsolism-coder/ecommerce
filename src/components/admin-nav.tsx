'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ReceiptText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { key: 'dashboard', label: 'Resumen', href: '/admin', icon: LayoutDashboard },
  { key: 'products', label: 'Productos', href: '/admin/products', icon: Package },
  { key: 'orders', label: 'Pedidos', href: '/admin/orders', icon: ReceiptText },
  { key: 'users', label: 'Usuarios', href: '/admin/users', icon: Users },
] as const

export function AdminNav() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <nav aria-label="Panel de administración" className="lg:sticky lg:top-28 lg:self-start">
      <p className="stamp hidden text-muted-foreground lg:block">Administración</p>

      <ul className="mt-3 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = isActive(item.href)

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
