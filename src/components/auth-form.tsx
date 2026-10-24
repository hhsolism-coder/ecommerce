'use client'

import { useActionState } from 'react'
import { AlertCircle } from 'lucide-react'
import { loginAction, registerAction } from '@/actions/auth'
import { initialActionState } from '@/lib/action-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const action = mode === 'login' ? loginAction : registerAction
  const [state, formAction, pending] = useActionState(action, initialActionState)
  const isRegister = mode === 'register'

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isRegister ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-name">Nombre</Label>
          <Input
            id="auth-name"
            type="text"
            name="name"
            autoComplete="name"
            required
            placeholder="Tu nombre"
            className="h-10"
          />
          {state.errors?.name ? (
            <p className="text-xs text-destructive">{state.errors.name}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="nombre@ecommerce.test"
          className="h-10"
        />
        {state.errors?.email ? (
          <p className="text-xs text-destructive">{state.errors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-password">Contraseña</Label>
        <Input
          id="auth-password"
          type="password"
          name="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={isRegister ? 8 : undefined}
          placeholder={isRegister ? 'Mínimo 8 caracteres' : undefined}
          className="h-10"
        />
        {state.errors?.password ? (
          <p className="text-xs text-destructive">{state.errors.password}</p>
        ) : null}
      </div>

      {state.message ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{state.message}</AlertTitle>
          <AlertDescription className="text-destructive/80">
            Revisá los datos e intentá de nuevo.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending ? 'Procesando…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
      </Button>
    </form>
  )
}
