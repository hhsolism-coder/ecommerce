import type { ZodError } from 'zod'

/**
 * Convierte un error de validación de zod en un mapa `campo -> mensaje`,
 * compatible con las variantes de API de zod 3 y 4.
 */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const flattened = error.flatten()
  const result: Record<string, string> = {}

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    const first = Array.isArray(messages) ? messages[0] : undefined
    if (first) result[field] = String(first)
  }

  return result
}
