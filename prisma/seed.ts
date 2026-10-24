/**
 * Seed de datos de demostración.
 *
 * Se ejecuta con `npm run db:seed` (tsx prisma/seed.ts).
 * Las credenciales son SOLO de demostración local; no sirven para ningún entorno real.
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.ts'
import { hashPassword } from '../src/lib/auth/password.ts'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL no está configurado.')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const DEMO_PASSWORD = 'demo1234'

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  await prisma.user.upsert({
    where: { email: 'admin@ecommerce.test' },
    update: { name: 'Administrador Demo', role: 'ADMIN', passwordHash },
    create: {
      email: 'admin@ecommerce.test',
      name: 'Administrador Demo',
      role: 'ADMIN',
      passwordHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'user@ecommerce.test' },
    update: { name: 'Usuario Demo', role: 'USER', passwordHash },
    create: {
      email: 'user@ecommerce.test',
      name: 'Usuario Demo',
      role: 'USER',
      passwordHash,
    },
  })

  const categories = await Promise.all(
    [
      { name: 'Camisetas', slug: 'camisetas' },
      { name: 'Accesorios', slug: 'accesorios' },
      { name: 'Hogar', slug: 'hogar' },
    ].map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      }),
    ),
  )

  const bySlug = new Map(categories.map((category) => [category.slug, category.id]))

  const products = [
    {
      name: 'Camiseta de Algodón Premium',
      slug: 'camiseta-algodon-premium',
      description:
        'Camiseta 100% algodón peinado de 180 g/m². Tela suave, costuras reforzadas y ajuste regular. Disponible en tallas S, M, L y XL.',
      priceCents: 18990,
      stock: 25,
      categorySlug: 'camisetas',
    },
    {
      name: 'Camiseta Manga Larga Térmica',
      slug: 'camiseta-manga-larga-termica',
      description:
        'Camiseta de manga larga con interior cepillado, ideal para clima frío. Protege del viento sin perder respirabilidad.',
      priceCents: 24990,
      stock: 18,
      categorySlug: 'camisetas',
    },
    {
      name: 'Polo Piqué Clásico',
      slug: 'polo-pique-clasico',
      description:
        'Polo de piqué cotton con cuello acolchado y botones. Un básico que combina con casi todo.',
      priceCents: 21990,
      stock: 30,
      categorySlug: 'camisetas',
    },
    {
      name: 'Sudadera con Capucha',
      slug: 'sudadera-con-capucha',
      description:
        'Sudadera con capucha doble, bolsillo canguro y puños elasticados. Talla holgada y cómoda.',
      priceCents: 34990,
      stock: 12,
      categorySlug: 'camisetas',
    },
    {
      name: 'Mochila Urban Canvas',
      slug: 'mochila-urban-canvas',
      description:
        'Mochila de lona encerada con compartimento acolchado para notebook de 15". Resistente al agua y con correas ergonómicas.',
      priceCents: 39990,
      stock: 15,
      categorySlug: 'accesorios',
    },
    {
      name: 'Lentes de Sol Polarizados',
      slug: 'lentes-sol-polarizados',
      description:
        'Lentes con protección UV400 y lentes polarizados de verdad. Marco liviano de acetato con estuche rígido incluido.',
      priceCents: 29990,
      stock: 20,
      categorySlug: 'accesorios',
    },
    {
      name: 'Billetera de Cuero',
      slug: 'billetera-cuero',
      description:
        'Billetera compacta de cuero genuino con seis ranuras para tarjetas y compartimento para billetes.',
      priceCents: 24990,
      stock: 22,
      categorySlug: 'accesorios',
    },
    {
      name: 'Cinturón de Cuero',
      slug: 'cinturon-cuero',
      description:
        'Cinturón de cuero con hebilla de metal mate. Cinco tamaños ajustables y perforado en la ponta.',
      priceCents: 27990,
      stock: 16,
      categorySlug: 'accesorios',
    },
    {
      name: 'Taza de Cerámica Artesanal',
      slug: 'taza-ceramica-artesanal',
      description:
        'Taza de 350 ml hecha a mano en cerámica esmaltada. Cada pieza es única con pequeñas variaciones propias del trabajo artesanal.',
      priceCents: 14990,
      stock: 40,
      categorySlug: 'hogar',
    },
    {
      name: 'Vela Aromática Cera de Soja',
      slug: 'vela-aromatica-cera-soja',
      description:
        'Vela aromática de cera de soja con mecha de algodón. 40 horas de duración con aroma a vetiver y cedro.',
      priceCents: 11990,
      stock: 35,
      categorySlug: 'hogar',
    },
    {
      name: 'Cojín de Algodón',
      slug: 'cojin-algodon',
      description:
        'Cojín de 45x45 cm con funda de algodón lavable y relleno de fibrailiconada. Antialérgico.',
      priceCents: 16990,
      stock: 28,
      categorySlug: 'hogar',
    },
    {
      name: 'Organizador de Escritorio',
      slug: 'organizador-escritorio',
      description:
        'Organizador de bambú con seis compartimentos para escritorio. Ocupa poco espacio y ordena lapices, cargadores y papelería.',
      priceCents: 19990,
      stock: 0,
      categorySlug: 'hogar',
    },
  ]

  for (const product of products) {
    const { categorySlug, ...data } = product
    await prisma.product.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        stock: data.stock,
        status: 'ACTIVE',
        categoryId: bySlug.get(categorySlug) ?? null,
      },
      create: {
        ...data,
        currency: 'usd',
        status: 'ACTIVE',
        categoryId: bySlug.get(categorySlug) ?? null,
      },
    })
  }

  console.log('Seed completado.')
  console.log(`  Admin:  admin@ecommerce.test / ${DEMO_PASSWORD}`)
  console.log(`  Usuario: user@ecommerce.test / ${DEMO_PASSWORD}`)
  console.log(`  Productos: ${products.length}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
