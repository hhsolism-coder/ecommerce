/**
 * Scraping básico del catálogo.
 *
 * Completa los productos existentes con datos reales (precio, stock, rating y
 * ficha técnica) y les arma una galería de imágenes descargadas al proyecto.
 *
 * Fuentes públicas:
 *  - DummyJSON  → fichas de producto con varias fotos (catálogo de consumo).
 *  - EscuelaJS  → fichas de ropa y accesorios con fotos.
 *  - Openverse  → fotografías reales con licencia CC para los tipos de
 *    producto que los catálogos anteriores no cubren.
 *
 * Uso:
 *  npm run scrape:products                    # scrape completo
 *  npm run scrape:products -- --dry-run       # muestra el plan sin escribir
 *  npm run scrape:products -- --only=mochila-urban-canvas
 */
import 'dotenv/config'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.ts'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_PRODUCTS_DIR = path.join(PROJECT_ROOT, 'public', 'products')
const MAX_OPENVERSE_IMAGES = 5

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL no está configurado.')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

type SourceSpec =
  | { provider: 'dummyjson'; remoteId: number }
  | { provider: 'escuelajs'; remoteId: number }
  | { provider: 'openverse'; queries: string[]; label?: string; limit?: number }

type Target = {
  /** Slug del producto en la base: se mantiene para no romper las URLs. */
  slug: string
  sources: SourceSpec[]
  /** Conserva el stock original (para mantener estados como "Agotado"). */
  keepStock?: boolean
}

type RemoteImage = {
  url: string
  credit?: string
  source?: string
}

type Scraped = {
  title: string
  priceCents?: number
  stock?: number
  specs: string[]
  images: RemoteImage[]
}

const TARGETS: Target[] = [
  { slug: 'camiseta-algodon-premium', sources: [{ provider: 'dummyjson', remoteId: 84 }] },
  { slug: 'camiseta-manga-larga-termica', sources: [{ provider: 'dummyjson', remoteId: 83 }] },
  { slug: 'polo-pique-clasico', sources: [{ provider: 'dummyjson', remoteId: 86 }] },
  { slug: 'sudadera-con-capucha', sources: [{ provider: 'escuelajs', remoteId: 4 }] },
  { slug: 'mochila-urban-canvas', sources: [{ provider: 'dummyjson', remoteId: 175 }] },
  { slug: 'lentes-sol-polarizados', sources: [{ provider: 'dummyjson', remoteId: 154 }] },
  {
    slug: 'billetera-cuero',
    sources: [
      { provider: 'openverse', queries: ['leather wallet', 'billetera cuero'], label: 'cuero' },
    ],
  },
  {
    slug: 'cinturon-cuero',
    sources: [
      { provider: 'openverse', queries: ['leather belt', 'cinturon cuero hombre'], label: 'cuero' },
    ],
  },
  {
    slug: 'taza-ceramica-artesanal',
    sources: [
      { provider: 'openverse', queries: ['ceramic mug', 'taza ceramica artesanal'], label: 'cerámica' },
    ],
  },
  {
    slug: 'vela-aromatica-cera-soja',
    sources: [
      { provider: 'openverse', queries: ['scented candle', 'vela aromatica'], label: 'cera de soja' },
    ],
  },
  {
    slug: 'cojin-algodon',
    sources: [
      {
        provider: 'openverse',
        queries: ['decorative cushion pillow', 'cojin decorativo'],
        label: 'algodón',
      },
    ],
  },
  {
    slug: 'organizador-escritorio',
    sources: [
      {
        provider: 'openverse',
        queries: ['office desk organizer', 'desk organizer stationery'],
        label: 'escritorio',
      },
    ],
    keepStock: true,
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is string => typeof item === 'string' && /^https?:\/\//i.test(item),
  )
}

/** GET con reintentos y espera entre intentos (las APIs públicas rate-limitan). */
async function fetchJson(url: string, attempts = 4): Promise<unknown> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      const body = await response.text()

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      try {
        return JSON.parse(body) as unknown
      } catch {
        throw new Error('la respuesta no es JSON')
      }
    } catch (error) {
      lastError = error
      if (attempt < attempts) await delay(700 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function scrapeDummyJson(remoteId: number): Promise<Scraped> {
  const data = asRecord(await fetchJson(`https://dummyjson.com/products/${remoteId}`))
  const dimensions = asRecord(data.dimensions)
  const specs: string[] = []

  const brand = asText(data.brand)
  const rating = asNumber(data.rating)
  const warranty = asText(data.warrantyInformation)
  const shipping = asText(data.shippingInformation)
  const width = asNumber(dimensions.width)
  const height = asNumber(dimensions.height)
  const depth = asNumber(dimensions.depth)
  const price = asNumber(data.price)

  if (brand) specs.push(`Marca ${brand}`)
  if (rating) specs.push(`Rating ${rating.toFixed(1)}/5`)
  if (warranty) specs.push(`Garantía: ${warranty}`)
  if (shipping) specs.push(`Envío: ${shipping}`)
  if (width && height && depth) specs.push(`Medidas ${width}×${height}×${depth} cm`)

  return {
    title: asText(data.title) ?? `Producto ${remoteId}`,
    priceCents: price === undefined ? undefined : Math.round(price * 100),
    stock: asNumber(data.stock),
    specs,
    images: asImageUrls(data.images).map((url) => ({ url })),
  }
}

async function scrapeEscuelaJs(remoteId: number): Promise<Scraped> {
  const data = asRecord(await fetchJson(`https://api.escuelajs.co/api/v1/products/${remoteId}`))
  const dimensions = asRecord(data.dimensions)
  const specs: string[] = []

  const brand = asText(data.brand)
  const rating = asNumber(data.rating)
  const warranty = asText(data.warrantyInformation)
  const shipping = asText(data.shippingInformation)
  const sku = asText(data.sku)
  const width = asNumber(dimensions.width)
  const height = asNumber(dimensions.height)
  const depth = asNumber(dimensions.depth)
  const price = asNumber(data.price)

  if (brand) specs.push(`Marca ${brand}`)
  if (rating) specs.push(`Rating ${rating.toFixed(1)}/5`)
  if (warranty) specs.push(`Garantía: ${warranty}`)
  if (shipping) specs.push(`Envío: ${shipping}`)
  if (sku) specs.push(`SKU ${sku}`)
  if (width && height && depth) specs.push(`Medidas ${width}×${height}×${depth} cm`)

  return {
    title: asText(data.title) ?? `Producto ${remoteId}`,
    priceCents: price === undefined ? undefined : Math.round(price * 100),
    stock: asNumber(data.stock),
    specs,
    images: asImageUrls(data.images).map((url) => ({ url })),
  }
}

async function scrapeOpenVerse(
  queries: string[],
  limit = MAX_OPENVERSE_IMAGES,
  label?: string,
): Promise<Scraped> {
  const images: RemoteImage[] = []
  const usedQueries: string[] = []

  for (const query of queries) {
    if (images.length >= limit) break

    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20&license_type=all-cc&mature=false`
    const data = asRecord(await fetchJson(url))
    const results = Array.isArray(data.results) ? data.results : []
    let found = 0

    for (const item of results) {
      if (images.length >= limit) break

      const entry = asRecord(item)
      const remote = asText(entry.url)
      if (!remote) continue

      const width = asNumber(entry.width) ?? 0
      const height = asNumber(entry.height) ?? 0
      if (width < 640 || height < 480) continue

      let pathname = ''
      try {
        pathname = new URL(remote).pathname
      } catch {
        continue
      }
      if (!/\.(jpe?g|png|webp)$/i.test(pathname)) continue

      const creator = asText(entry.creator)
      const license = asText(entry.license)?.toUpperCase()
      images.push({
        url: remote,
        credit: [creator, license].filter(Boolean).join(' · ') || undefined,
        source: asText(entry.foreign_landing_url),
      })
      found += 1
    }

    if (found > 0) usedQueries.push(query)
    // Openverse pide no encadenar consultas: pequeño respiro entre búsquedas.
    await delay(900)
  }

  return {
    title: usedQueries[0] ?? queries[0],
    specs: [
      `${images.length} fotografías reales de ${
        label ?? (usedQueries.length > 0 ? usedQueries.join(' / ') : queries[0])
      }`,
    ],
    images,
  }
}

async function scrapeSource(source: SourceSpec): Promise<Scraped> {
  if (source.provider === 'dummyjson') return scrapeDummyJson(source.remoteId)
  if (source.provider === 'escuelajs') return scrapeEscuelaJs(source.remoteId)
  return scrapeOpenVerse(source.queries, source.limit ?? MAX_OPENVERSE_IMAGES, source.label)
}

function extensionFor(contentType: string): string {
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'jpg'
}

/** Descarga la imagen al proyecto y devuelve la ruta pública. */
async function storeImage(remoteUrl: string, directory: string, fileName: string): Promise<string | null> {
  try {
    const response = await fetch(remoteUrl, {
      headers: { 'User-Agent': 'ecommerce-demo-scraper/1.0 (local)' },
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength < 2048) return null

    const name = `${fileName}.${extensionFor(contentType)}`
    await writeFile(path.join(directory, name), buffer)
    return `/products/${path.basename(directory)}/${name}`
  } catch {
    return null
  }
}

function parseArgs(argv: string[]): { dryRun: boolean; only?: string } {
  const dryRun = argv.includes('--dry-run')
  const only = argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)
  return { dryRun, only }
}

async function main() {
  const { dryRun, only } = parseArgs(process.argv.slice(2))

  const targets = only ? TARGETS.filter((target) => target.slug === only) : TARGETS
  if (targets.length === 0) {
    console.log(`No hay producto con slug "${only}".`)
    return
  }

  console.log(dryRun ? 'Modo simulación: no se escribe nada.' : 'Scrapeando catálogo...')
  const summary: string[] = []

  for (const target of targets) {
    const product = await prisma.product.findUnique({ where: { slug: target.slug } })
    if (!product) {
      console.log(`· ${target.slug}: no existe en la base, se omite.`)
      continue
    }

    const scrapedList: Scraped[] = []
    for (const source of target.sources) {
      try {
        scrapedList.push(await scrapeSource(source))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(`· ${target.slug}: falló ${source.provider} (${message}).`)
      }
    }

    const specs = scrapedList.flatMap((entry) => entry.specs)
    const priceCents = scrapedList.find((entry) => entry.priceCents !== undefined)?.priceCents
    const stock = scrapedList.find((entry) => entry.stock !== undefined)?.stock
    const remoteImages = scrapedList.flatMap((entry) => entry.images)

    if (remoteImages.length === 0) {
      console.log(`· ${target.slug}: sin imágenes disponibles, se omite.`)
      continue
    }

    const directory = path.join(PUBLIC_PRODUCTS_DIR, target.slug)
    if (!dryRun) {
      await rm(directory, { recursive: true, force: true })
      await mkdir(directory, { recursive: true })
    }

    const stored: { url: string; alt: string; credit?: string; source?: string }[] = []
    for (const image of remoteImages) {
      const url = dryRun ? image.url : await storeImage(image.url, directory, String(stored.length + 1))
      if (!url) continue
      stored.push({
        url,
        alt: `${product.name} — vista ${stored.length + 1}`,
        credit: image.credit,
        source: image.source,
      })
    }

    if (stored.length === 0) {
      console.log(`· ${target.slug}: no se pudo descargar ninguna imagen, se omite.`)
      continue
    }

    // La ficha técnica se rehace: la anterior se reemplaza, no se acumula.
    const baseDescription = product.description.split('\n\nFicha técnica:')[0].trim()
    const description = specs.length
      ? `${baseDescription}\n\nFicha técnica: ${specs.join(' · ')}.`
      : baseDescription

    if (!dryRun) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } })
      await prisma.productImage.createMany({
        data: stored.map((image, index) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt,
          position: index,
          source: image.source ?? null,
          credit: image.credit ?? null,
        })),
      })

      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl: stored[0].url,
          description,
          ...(priceCents === undefined ? {} : { priceCents }),
          ...(target.keepStock || stock === undefined ? {} : { stock }),
        },
      })
    }

    const priceLabel = priceCents === undefined ? 'precio original' : `US$${(priceCents / 100).toFixed(2)}`
    const stockLabel = target.keepStock || stock === undefined ? 'stock original' : `stock ${stock}`
    summary.push(`· ${target.slug}: ${stored.length} imágenes · ${priceLabel} · ${stockLabel}`)
    console.log(summary[summary.length - 1])
  }

  console.log(dryRun ? '\nSimulación terminada.' : `\nListo: ${summary.length} productos actualizados.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
