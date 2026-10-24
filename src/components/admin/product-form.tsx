'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CircleCheck } from 'lucide-react'
import { createProductAction, updateProductAction } from '@/actions/admin/products'
import { initialActionState } from '@/lib/action-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const NONE = 'none'

export type ProductFormValues = {
  id?: string
  name: string
  description: string
  /** Precio en pesos (no en centavos) para el input. */
  price: string
  stock: number
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  categoryId: string
  imageUrl: string
  /** Galería: una URL por línea. */
  gallery: string
}

export function ProductForm({
  mode,
  values,
  categories,
}: {
  mode: 'create' | 'edit'
  values: ProductFormValues
  categories: { id: string; name: string }[]
}) {
  const action = mode === 'create' ? createProductAction : updateProductAction
  const [state, formAction, pending] = useActionState(action, initialActionState)
  const [categoryId, setCategoryId] = useState(values.categoryId || NONE)
  const [status, setStatus] = useState(values.status)

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      {mode === 'edit' && values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <section className="grid gap-5 rounded-lg bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="product-name">Nombre</Label>
          <Input
            id="product-name"
            name="name"
            required
            defaultValue={values.name}
            placeholder="Camiseta de Algodón Premium"
            className="h-10"
          />
          {state.errors?.name ? (
            <p className="text-xs text-destructive">{state.errors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="product-description">Descripción</Label>
          <Textarea
            id="product-description"
            name="description"
            required
            rows={5}
            defaultValue={values.description}
            placeholder="Detallá el material, el cuidado y para quién es el producto."
            className="min-h-32"
          />
          {state.errors?.description ? (
            <p className="text-xs text-destructive">{state.errors.description}</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 rounded-lg bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-price">Precio</Label>
          <Input
            id="product-price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={values.price}
            placeholder="189.90"
            className="h-10 font-mono"
          />
          {state.errors?.price ? (
            <p className="text-xs text-destructive">{state.errors.price}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-stock">Stock</Label>
          <Input
            id="product-stock"
            name="stock"
            type="number"
            required
            min={0}
            defaultValue={String(values.stock)}
            className="h-10 font-mono"
          />
          {state.errors?.stock ? (
            <p className="text-xs text-destructive">{state.errors.stock}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-category">Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="product-category" className="h-10 w-full bg-background">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin categoría</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="categoryId" value={categoryId === NONE ? '' : categoryId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-status">Estado</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as ProductFormValues['status'])}>
            <SelectTrigger id="product-status" className="h-10 w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="ARCHIVED">Archivado</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="status" value={status} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="product-image">URL de imagen</Label>
          <Input
            id="product-image"
            name="imageUrl"
            defaultValue={values.imageUrl}
            placeholder="https://…"
            className="h-10"
          />
          {state.errors?.imageUrl ? (
            <p className="text-xs text-destructive">{state.errors.imageUrl}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="product-gallery">Galería (una URL por línea)</Label>
          <Textarea
            id="product-gallery"
            name="gallery"
            rows={4}
            defaultValue={values.gallery}
            placeholder={'/products/camiseta-algodon-premium/1.webp\n/products/camiseta-algodon-premium/2.webp'}
            className="min-h-28 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            La primera URL es la portada de la ficha; las demás forman la galería.
          </p>
          {state.errors?.gallery ? (
            <p className="text-xs text-destructive">{state.errors.gallery}</p>
          ) : null}
        </div>
      </section>

      {state.message ? (
        <Alert variant={state.ok ? 'default' : 'destructive'}>
          {state.ok ? <CircleCheck /> : <AlertCircle />}
          <AlertTitle>{state.message}</AlertTitle>
          <AlertDescription className={state.ok ? 'text-muted-foreground' : 'text-destructive/80'}>
            {state.ok
              ? 'Los cambios ya están publicados en el catálogo.'
              : 'Revisá los datos marcados e intentá de nuevo.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="h-10 px-5">
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/products">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
