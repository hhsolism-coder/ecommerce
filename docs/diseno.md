# Sistema de diseño — «Tinta y papel»

> Volver a la [portada](../README.md) · [Índice de documentación](./README.md)

Toda la interfaz está construida con **shadcn/ui** (base Radix, `src/components/ui/`) sobre los
tokens definidos en `src/app/globals.css`. La dirección visual es editorial y cálida: papel crudo,
tinta casi negra y un único acento terracota para las acciones.

| Decisión | Valor |
|---|---|
| Color | `--background` papel `oklch(0.978 0.008 84)` · `--foreground` tinta `oklch(0.212 0.014 60)` · `--primary` arcilla `oklch(0.512 0.118 44)` |
| Semánticos | `--success` oliva (stock) · `--caution` ámbar (stock bajo) · `--destructive` ladrillo |
| Tipografía | `Fraunces` para titulares (`--font-heading`), `Geist` para texto, `Geist Mono` para cifras y códigos |
| Profundidad | Filetes de tinta (`--border`), sin sombras duras; sombra mínima solo en hover de tarjetas |
| Radio | `--radius: 0.5rem` con escala derivada (`sm` 0.3 · `md` 0.4 · `lg` 0.5 · `xl` 0.7 rem) |
| Patrones propios | `.stamp` (etiqueta en versalitas monoespaciadas) · `[data-numeric]` (cifras tabulares) |

## Convenciones del proyecto

- Ninguna página escribe `bg-white`, `text-gray-500` ni colores literales: todo pasa por tokens
  semánticos (`bg-card`, `text-muted-foreground`, `border-border`).
- Los componentes de shadcn/ui viven en `src/components/ui/` y **no se editan a mano**: se
  actualizan con `npx shadcn@latest add <componente>`.
- Los componentes de producto (`src/components/`) componen esos primitivos y son los únicos que
  llevan decisiones de layout.

## Modo oscuro

El bloque `.dark` de `src/app/globals.css` mantiene la misma paleta con las invertidas: el papel
pasa a un tono carbón y la tinta a crema. Los tokens semánticos (`--success`, `--caution`,
`--destructive`) tienen su propia variante para que los badges se lean igual en ambos modos.

## Tipografía

Las tres familias se cargan con `next/font` en `src/app/layout.tsx`:

| Familia | Uso | Variable |
|---|---|---|
| `Fraunces` | Titulares (`font-heading`) | `--font-display` → `--font-heading` |
| `Geist` | Texto corrido | `--font-sans` |
| `Geist_Mono` | Cifras, códigos y datos tabulares (`data-numeric`) | `--font-mono` |

## Utilidades propias

```css
/* Etiqueta en versalitas monoespaciadas: membretes, categorías, estados. */
.stamp { /* … */ }

/* Cifras con ancho de dígito fijo para que las columnas de precios no bailen. */
[data-numeric] { font-variant-numeric: tabular-nums; }
```

## Componentes propios

| Componente | Rol |
|---|---|
| `container.tsx` | Contenedor con anchos por contexto (`default`, `reading`). |
| `page-header.tsx` | Cabecera de página con antetítulo, título y descripción. |
| `site-header.tsx` / `site-footer.tsx` | Shell del sitio. |
| `user-menu.tsx` | Menú de cuenta con logout vía Server Action. |
| `mobile-nav.tsx` | Navegación móvil en un `Sheet`. |
| `product-card.tsx` / `product-thumb.tsx` | Ficha de catálogo y su portada. |
| `product-gallery.tsx` | Galería de la ficha de producto: principal, miniaturas y flechas. |
| `cart/*` | Carrito: vista, resumen y fila de línea. |
| `admin/*` | Formularios del panel (producto, pedido, rol, filtro). |
