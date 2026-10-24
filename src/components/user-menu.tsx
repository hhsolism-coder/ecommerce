'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name: string
  email: string
  isAdmin: boolean
}) {
  const logoutFormRef = useRef<HTMLFormElement>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-full"
            aria-label="Abrir menú de cuenta"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="px-2.5 py-2">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="px-2.5 py-2">
            <Link href="/account">
              <UserRound />
              Mi cuenta
            </Link>
          </DropdownMenuItem>

          {isAdmin ? (
            <DropdownMenuItem asChild className="px-2.5 py-2">
              <Link href="/admin">
                <ShieldCheck />
                Panel de administración
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="px-2.5 py-2"
            onSelect={() => logoutFormRef.current?.requestSubmit()}
          >
            <LogOut />
            Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* El logout es una Server Action: el menú solo dispara el envío del formulario. */}
      <form ref={logoutFormRef} action={logoutAction} className="hidden" />
    </>
  )
}
