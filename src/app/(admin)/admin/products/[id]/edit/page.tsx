import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { ProductForm } from '@/components/admin/product-form'
import { PageHeader } from '@/components/page-header'

export const metadata = { title: 'Editar producto' }

export default async function EditProductPage({ params }: PageProps<'/admin/products/[id]/edit'>) {
  await requireAdmin('/admin/products')

  const { id } = await params

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: 'asc' } } },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Catálogo" title="Editar producto" description={product.name} />

      <ProductForm
        mode="edit"
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        values={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: (product.priceCents / 100).toFixed(2),
          stock: product.stock,
          status: product.status,
          categoryId: product.categoryId ?? '',
          imageUrl: product.imageUrl ?? '',
          gallery: product.images.map((image) => image.url).join('\n'),
        }}
      />
    </div>
  )
}
