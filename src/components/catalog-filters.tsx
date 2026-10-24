'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

/**
 * Filtros del catálogo. El `Select` de Radix no es un control nativo, así que
 * la categoría viaja en un input oculto para que el formulario GET la envíe.
 */
export function CatalogFilters({
  query,
  category,
  categories,
}: {
  query: string
  category: string
  categories: { id: string; name: string; slug: string }[]
}) {
  const [selected, setSelected] = useState(category || ALL)
  const hasFilters = Boolean(query || category)

  // Un input deshabilitado no viaja en el GET: así la URL no arrastra `q=` vacío.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem('q') as HTMLInputElement | null
    if (input && !input.value.trim()) input.disabled = true
  }

  return (
    <form
      action="/products"
      method="get"
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-56 flex-col gap-1.5">
        <Label htmlFor="catalog-search">Buscar</Label>
        <InputGroup className="h-9">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            id="catalog-search"
            name="q"
            defaultValue={query}
            placeholder="Nombre del producto"
          />
        </InputGroup>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-category">Categoría</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="catalog-category" className="h-9 w-44 bg-background">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="category" value={selected === ALL ? '' : selected} />
      </div>

      <Button type="submit" className="h-9">
        Filtrar
      </Button>

      {hasFilters ? (
        <Button asChild variant="ghost" className="h-9">
          <Link href="/products">
            <X />
            Limpiar
          </Link>
        </Button>
      ) : null}
    </form>
  )
}
