const DEFAULT_LOCALE = 'es-CL'

/**
 * Convierte un entero de centavos a un string monetario legible.
 * Los precios SIEMPRE se guardan como enteros de centavos para evitar errores de coma flotante.
 */
export function formatMoney(cents: number, currency = 'usd', locale = DEFAULT_LOCALE): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Convierte la entrada de un formulario (texto en pesos) a centavos enteros.
 *
 * Reglas de desambiguación de separadores:
 * - Si aparecen '.' y ',', el último que aparezca es el separador decimal
 *   y el otro es de miles: "1.299,50" -> 1299.50
 * - Si solo aparece ',', es el separador decimal: "1299,50" -> 1299.50
 * - Si solo aparece '.' y le siguen 1 o 2 dígitos, es el separador decimal:
 *   "1299.50" -> 1299.50, "19.9" -> 19.9
 * - En cualquier otro caso, el punto es de miles: "1.299" -> 1299
 */
export function parsePriceToCents(input: string | number): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) : 0
  }

  const cleaned = input.trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '')
  if (cleaned === '') return 0

  let normalized: string

  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  const hasDot = lastDot !== -1
  const hasComma = lastComma !== -1

  if (hasDot && hasComma) {
    const decimalSeparator = lastDot > lastComma ? '.' : ','
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.'
    normalized = cleaned.split(thousandsSeparator).join('').replace(decimalSeparator, '.')
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.')
  } else if (hasDot) {
    const decimals = cleaned.length - lastDot - 1
    normalized = decimals === 1 || decimals === 2 ? cleaned : cleaned.split('.').join('')
  } else {
    normalized = cleaned
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

/**
 * Formatea un porcentaje de descuento (0-100) como factor multiplicador.
 */
export function discountFactor(percent: number): number {
  const clamped = Math.min(Math.max(percent, 0), 100)
  return 1 - clamped / 100
}
