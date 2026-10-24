# Datos del catálogo

> Volver a la [portada](../README.md) · [Índice de documentación](./README.md)

`npm run scrape:products` completa los productos con datos reales y una galería de imágenes.

## Fuentes

| Fuente | Qué aporta |
|---|---|
| [DummyJSON](https://dummyjson.com) | Fichas de producto con varias fotos por producto (ropa, accesorios, cocina). |
| [EscuelaJS](https://api.escuelajs.co) | Fichas de ropa y accesorios con 3 fotos cada una. |
| [Openverse](https://openverse.org) | Fotografías reales con licencia Creative Commons para los tipos de producto que los catálogos anteriores no cubren (billetera, cinturón, taza, vela, cojín, organizador). |

## Qué hace

1. Lee el producto por `slug` (no crea ni borra filas: mantiene IDs, slugs y URLs).
2. Baja cada imagen a `public/products/<slug>/`.
3. Deja la portada en `Product.imageUrl` y el resto en la tabla `ProductImage` (galería).
4. Actualiza precio, stock y agrega la ficha técnica a la descripción.

**Es idempotente:** se puede volver a ejecutar; reemplaza la galería del producto y vuelve a bajar
las imágenes.

```bash
npm run scrape:products                      # catálogo completo
npm run scrape:products -- --dry-run         # muestra el plan sin escribir
npm run scrape:products -- --only=mochila-urban-canvas
```

## Atribución de las fotos

Las imágenes de Openverse se guardan con su crédito (autor + licencia) y el enlace de origen en
`ProductImage.credit` y `ProductImage.source`. La galería los muestra en la ficha del producto.

## Advertencias

- Los precios, el stock y las fotos provienen de fuentes externas: son datos de demostración, no de
  una tienda real.
- La galería también se edita a mano desde **Admin → Productos → Editar** (una URL por línea).
- El script pide los datos con reintentos y esperas entre consultas: Openverse limita las
  peticiones y los catálogos públicos pueden caerse.
