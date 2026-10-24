/**
 * Estado compartido de las Server Actions que se usan con `useActionState`.
 */
export type ActionState = {
  ok: boolean
  message: string
  errors?: Record<string, string>
}

export const initialActionState: ActionState = { ok: false, message: '' }
