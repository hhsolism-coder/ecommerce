/**
 * Genera un slug URL-safe a partir de texto libre.
 * "Camiseta de Algodón Premium" -> "camiseta-de-algodon-premium"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita los acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Genera un slug único añadiendo un sufijo numérico si ya existe.
 */
export function uniqueSlug(input: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  return (async () => {
    const base = slugify(input) || 'producto'
    let candidate = base
    let suffix = 1
    while (await exists(candidate)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    return candidate
  })()
}
