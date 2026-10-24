import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .max(254, 'El email es demasiado largo')
  .toLowerCase()
  .pipe(z.email('Introduce un email válido'))

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(200, 'La contraseña es demasiado larga')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(120, 'El nombre es demasiado largo'),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
