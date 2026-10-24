'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { parsePriceToCents } from '@/lib/money'
import { slugify } from '@/lib/slug'
import { productSchema } from '@/lib/validation/product'
import { fieldErrorsFrom } from '@/lib/validation/errors'
import type { ActionState } from '@/lib/action-state'

function readProductForm(formData: FormData) {
  return {
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    status: formData.get('status'),
    categoryId: formData.get('categoryId') ?? undefined,
    imageUrl: formData.get('imageUrl') ?? undefined,
    gallery: formData.get('gallery') ?? undefined,
  }
}

/** La galería se envía como texto: una URL por línea. */
function readGalleryUrls(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export async function createProductAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products/new')

  const parsed = productSchema.safeParse(readProductForm(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del producto.', errors: fieldErrorsFrom(parsed.error) }
  }

  const { name, description, price, stock, status, categoryId, imageUrl } = parsed.data
  const gallery = readGalleryUrls(formData.get('gallery'))
  const priceCents = parsePriceToCents(price)
  if (priceCents <= 0) {
    return { ok: false, message: 'Revisa los datos del producto.', errors: { price: 'El precio debe ser mayor a 0' } }
  }

  const slug = slugify(name)
  const slugExists = await prisma.product.findUnique({ where: { slug } })
  if (slugExists) {
    return { ok: false, message: 'Revisa los datos del producto.', errors: { name: 'Ya existe un producto con ese nombre' } }
  }

  await prisma.product.create({
    data: {
      name,
      slug,
      description,
      priceCents,
      stock,
      status,
      imageUrl: imageUrl || null,
      categoryId: categoryId || null,
      images: {
        create: gallery.map((url, position) => ({ url, position })),
      },
    },
  })

  revalidatePath('/products')
  revalidatePath('/admin/products')

  return { ok: true, message: `Producto "${name}" creado.` }
}

export async function updateProductAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products')

  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, message: 'Falta el identificador del producto.' }
  }

  const parsed = productSchema.safeParse(readProductForm(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del producto.', errors: fieldErrorsFrom(parsed.error) }
  }

  const { name, description, price, stock, status, categoryId, imageUrl } = parsed.data
  const gallery = readGalleryUrls(formData.get('gallery'))
  const priceCents = parsePriceToCents(price)
  if (priceCents <= 0) {
    return { ok: false, message: 'Revisa los datos del producto.', errors: { price: 'El precio debe ser mayor a 0' } }
  }

  const current = await prisma.product.findUnique({ where: { id } })
  if (!current) {
    return { ok: false, message: 'El producto no existe.' }
  }

  // El slug solo se recalcula si cambió el nombre y el nuevo slug está libre.
  let slug = current.slug
  if (name !== current.name) {
    const candidate = slugify(name)
    const conflict = await prisma.product.findUnique({ where: { slug: candidate } })
    if (!conflict || conflict.id === current.id) slug = candidate
  }

  // La galería se reemplaza por completo: lo que el admin ve es lo que queda.
  await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } })
    await tx.product.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        priceCents,
        stock,
        status,
        imageUrl: imageUrl || null,
        categoryId: categoryId || null,
      },
    })
    if (gallery.length > 0) {
      await tx.productImage.createMany({
        data: gallery.map((url, position) => ({ productId: id, url, position })),
      })
    }
  })

  revalidatePath('/products')
  revalidatePath(`/products/${slug}`)
  revalidatePath('/admin/products')

  return { ok: true, message: `Producto "${name}" actualizado.` }
}

export async function archiveProductAction(formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products')

  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, message: 'Falta el identificador del producto.' }
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  })

  revalidatePath('/products')
  revalidatePath(`/products/${product.slug}`)
  revalidatePath('/admin/products')

  return { ok: true, message: `Producto "${product.name}" archivado.` }
}
