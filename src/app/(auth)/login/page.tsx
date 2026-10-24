import Link from 'next/link'
import { History, PackageCheck, ShieldCheck } from 'lucide-react'
import { AuthForm } from '@/components/auth-form'
import { Container } from '@/components/container'

export const metadata = { title: 'Ingresar' }

const benefits = [
  { icon: History, title: 'Historial de pedidos', copy: 'Revisá qué compraste y en qué estado está.' },
  { icon: PackageCheck, title: 'Carrito persistente', copy: 'Tu carrito te espera en cualquier dispositivo.' },
  { icon: ShieldCheck, title: 'Sesión firmada', copy: 'JWT con httpOnly y roles leídos de la base.' },
]

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const rawNext = typeof params.next === 'string' ? params.next : ''
  // Solo rutas internas: evita redirecciones abiertas.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : ''

  return (
    <Container className="py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div className="max-w-md">
          <p className="stamp text-primary">Área de clientes</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Volvé a tu cuenta
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Accedé para ver tus pedidos, retomar el carrito y gestionar tu perfil.
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
            <h2 className="font-heading text-xl font-semibold tracking-tight">Ingresar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usá el email con el que te registraste.
            </p>
          </div>

          <div className="mt-6">
            <AuthForm mode="login" next={next} />
          </div>

          <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              Crear una
            </Link>
          </p>
        </div>
      </div>
    </Container>
  )
}
