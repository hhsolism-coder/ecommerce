import { z } from 'zod'
import { MAX_ITEM_QUANTITY } from '@/lib/cart/calc'

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])

const imageUrlRule = (value: string) => value.startsWith('/') || value.startsWith('http')

export const productSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(160, 'El nombre es demasiado largo'),
  description: z.string().trim().min(10, 'La descripción es obligatoria').max(4000, 'La descripción es demasiado larga'),
  price: z.string().trim().min(1, 'El precio es obligatorio'),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo').max(1_000_000),
  status: productStatusSchema,
  categoryId: z.string().trim().optional(),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || imageUrlRule(value), {
      message: 'La URL de la imagen no es válida',
    }),
  /** Galería: una URL por línea. */
  gallery: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .every(imageUrlRule),
      { message: 'Alguna URL de la galería no es válida' },
    ),
})

export const cartQuantitySchema = z.coerce
  .number()
  .int('La cantidad debe ser un número entero')
  .min(1, 'La cantidad mínima es 1')
  .max(MAX_ITEM_QUANTITY, `La cantidad máxima por producto es ${MAX_ITEM_QUANTITY}`)

export const updateUserRoleSchema = z.object({
  userId: z.string().trim().min(1, 'Falta el usuario'),
  role: z.enum(['ADMIN', 'USER']),
})

export const updateOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1, 'Falta el pedido'),
  status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED']),
})

export type ProductInput = z.infer<typeof productSchema>
