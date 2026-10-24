import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { ProductForm } from '@/components/admin/product-form'
import { PageHeader } from '@/components/page-header'

export const metadata = { title: 'Nuevo producto' }

export default async function NewProductPage() {
  await requireAdmin('/admin/products/new')

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Nuevo producto"
        description="Cargá la ficha: se publica en el catálogo apenas queda en estado Activo."
      />

      <ProductForm
        mode="create"
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        values={{
          name: '',
          description: '',
          price: '',
          stock: 0,
          status: 'ACTIVE',
          categoryId: '',
          imageUrl: '',
          gallery: '',
        }}
      />
    </div>
  )
}
