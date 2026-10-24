import Link from 'next/link'
import { Gift, Truck, UserRound } from 'lucide-react'
import { AuthForm } from '@/components/auth-form'
import { Container } from '@/components/container'

export const metadata = { title: 'Crear cuenta' }

const benefits = [
  { icon: UserRound, title: 'Perfil y pedidos', copy: 'Tu historial siempre a mano, en un solo lugar.' },
  { icon: Truck, title: 'Carrito que te espera', copy: 'Iniciá sesión y fusionamos tu carrito de invitado.' },
  { icon: Gift, title: 'Acceso anticipado', copy: 'Sin spam: solo avisos de tus pedidos.' },
]

export default function RegisterPage() {
  return (
    <Container className="py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div className="max-w-md">
          <p className="stamp text-primary">Nuevo cliente</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Creá tu cuenta
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Registrate para comprar, ver el historial de tus pedidos y retomar el carrito desde donde
            lo dejaste.
          </p>

          <ul className="mt-10 space-y-5 border-t border-border pt-8">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <benefit.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{benefit.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{benefit.copy}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="border-b border-border pb-5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Crear cuenta</h2>
            <p className="mt-1 text-sm text-muted-foreground">Solo necesitamos tu nombre y tu email.</p>
          </div>

          <div className="mt-6">
            <AuthForm mode="register" />
          </div>

          <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </Container>
  )
}
