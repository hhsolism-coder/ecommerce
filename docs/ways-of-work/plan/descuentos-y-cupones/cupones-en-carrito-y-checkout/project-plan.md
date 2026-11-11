# Project Plan — Cupones en carrito y checkout

> Epic: **Descuentos y cupones** · Feature: **Cupones en carrito y checkout**
> Generado con la skill `breakdown-plan` (awesome-copilot) sobre el repo
> `github.com/hhsolism-coder/ecommerce`.
> Artefactos de entrada: [PRD](../cupones-en-carrito-y-checkout.md) ·
> [Technical Breakdown](./technical-breakdown.md) ·
> [Implementation Plan](./implementation-plan.md)

---

## 1. Project Overview

### 1.1 Feature Summary

El ecommerce calcula hoy `totalCents = subtotalCents`: no existe ninguna forma de descuento.
Esta feature introduce el motor de descuentos de la plataforma — **cupones de código**
creados por un administrador, aplicados por el cliente en el carrito y cobrados por Stripe —
con la invariante de que **el importe lo decide siempre el servidor**.

**Valor de negocio**: permite lanzar campañas sin tocar código, redimir stock antiguo y
subir el ticket promedio sin alterar el catálogo.

### 1.2 Success Criteria

| # | Criterio | Cómo se mide |
|---|---|---|
| SC-1 | El cliente puede aplicar un cupón válido y ver el desglose subtotal → descuento → total | Prueba E2E manual + tests DOM |
| SC-2 | El importe cobrado por Stripe coincide **exactamente** con `order.totalCents` | Test de integración que compara ambos valores |
| SC-3 | Manipular el cliente no altera el importe | Test que envía totales falsos y verifica que se ignoran |
| SC-4 | Los límites de uso se respetan bajo concurrencia | Test de integración con dos transacciones concurrentes |
| SC-5 | La suite completa pasa y la cobertura se mantiene ≥ 80 % | `npm run test:coverage` |
| SC-6 | Sin cupón, el flujo de compra actual no cambia | Tests existentes sin modificar + regresión manual |

### 1.3 Key Milestones

Sin fechas: las dependen de la velocidad real del equipo.

| Milestone | Contenido | Issues |
|---|---|---|
| **M1 — Motor de descuentos** | Modelo de datos, cálculo puro y validación en servidor | ENB-1, ENB-2, ENB-3, TST-1, TST-2 |
| **M2 — Cupón en el carrito** | Aplicar, quitar, mensajes de rechazo y desglose visual | ST-1, ST-3, ST-4, ST-8, TST-4 |
| **M3 — Cobro correcto** | Descuento aplicado en Stripe y congelado en la orden | ENB-4, TST-3 |
| **M4 — Gestión desde el admin** | CRUD de cupones, activación y métricas de uso | ENB-5, ST-5, ST-6, ST-7 |
| **M5 — Calidad y entrega** | Persistencia al autenticar y pipeline de CI | ST-2, ENB-6 |

### 1.4 Risk Assessment

| Riesgo | Prob. | Impacto | Mitigación | Issue |
|---|---|---|---|---|
| El descuento del servidor difiere del aplicado por Stripe | Media | Crítico | Verificación en el webhook; desajuste → orden `FAILED` | ENB-4, TST-3 |
| Condición de carrera en `usageLimit` | Media | Alto | Incremento condicional dentro de la transacción | ENB-1, ENB-3 |
| Acoplamiento del cupón a Stripe | Alta | Medio | Nuestra tabla es la fuente de verdad; el cupón de Stripe es efímero | ENB-4 |
| Regresión en el flujo de compra actual | Media | Crítico | Lógica opcional: sin cupón, `totalCents === subtotalCents` | TST-3 |
| El admin crea cupones con datos inválidos | Media | Medio | Schemas Zod + validación cruzada en servidor | ENB-5, TST-2 |
| Sin CI, el motor de descuentos entra sin red de seguridad | Alta | Alto | Enabler de pipeline con lint, typecheck y tests | ENB-6 |

---

## 2. Work Item Hierarchy

```mermaid
graph TD
    A[Epic EPIC-1: Descuentos y cupones] --> B[Feature FEAT-1: Cupones en carrito y checkout]

    B --> C[Enabler ENB-1: Modelo de datos y migración]
    B --> D[Enabler ENB-2: Motor de cálculo de descuento]
    B --> E[Enabler ENB-3: Servicio de validación en servidor]
    B --> F[Enabler ENB-4: Integración con Stripe Checkout]
    B --> G[Enabler ENB-5: Panel de administración de cupones]
    B --> H[Enabler ENB-6: Pipeline de CI]

    B --> I[Story ST-1: Aplicar cupón en el carrito]
    B --> J[Story ST-2: Cupón persistente al iniciar sesión]
    B --> K[Story ST-3: Quitar el cupón aplicado]
    B --> L[Story ST-4: Mensajes de rechazo accionables]
    B --> M[Story ST-5: Crear cupones desde el panel]
    B --> N[Story ST-6: Editar y activar/desactivar cupones]
    B --> O[Story ST-7: Consultar uso y límites]
    B --> P[Story ST-8: Desglose subtotal → descuento → total]

    C --> C1[Task: enum DiscountType]
    C --> C2[Task: model Coupon]
    C --> C3[Task: model CouponRedemption]
    C --> C4[Task: Cart.couponId + Order.discountCents]
    C --> C5[Task: migración + seed]

    D --> D1[Task: calculateDiscount]
    D --> D2[Task: normalizeCouponCode]
    D --> D3[Test TST-1: suite unitaria]

    E --> E1[Task: schemas Zod de cupón]
    E --> E2[Task: validateCoupon]
    E --> E3[Test TST-2: suite de integración]

    F --> F1[Task: cupón efímero en Stripe]
    F --> F2[Task: discounts + metadata]
    F --> F3[Task: congelar descuento en la orden]
    F --> F4[Task: verificar total en el webhook]
    F --> F5[Test TST-3: checkout + webhook]

    G --> G1[Task: Server Actions con requireAdmin]
    G --> G2[Task: listado de cupones]
    G --> G3[Task: formularios alta/edición]
    G --> G4[Task: enlace en el layout admin]

    H --> H1[Task: workflow lint + typecheck]
    H --> H2[Task: workflow de tests con PostgreSQL]

    I --> I1[Task: applyCouponAction]
    I --> I2[Task: CouponForm]
    I --> I3[Task: revalidatePath]

    J --> J1[Task: preservar cupón en merge]
    J --> J2[Task: revalidar cupón fusionado]

    K --> K1[Task: removeCouponAction]

    L --> L1[Task: mensajes por motivo de rechazo]

    M --> M1[Task: createCouponAction]
    M --> M2[Task: formulario de creación]

    N --> N1[Task: updateCouponAction]
    N --> N2[Task: toggleCouponAction]

    O --> O1[Task: columna de usos]

    P --> P1[Task: fila de descuento en el resumen]
```

---

## 3. GitHub Issues Breakdown

### 3.1 Issue Epic

````markdown
# Epic: Descuentos y cupones

## Epic Description

El ecommerce no soporta ninguna forma de descuento: `totalCents` es siempre igual a
`subtotalCents` y el README lo lista como limitación conocida. Este épico introduce el
motor de descuentos de la plataforma, empezando por cupones de código que un administrador
crea y aplica, y que el cliente puede usar en el carrito.

El alcance inicial es un solo cupón activo por carrito, con descuento porcentual o de
monto fijo. Quedan fuera la acumulación de cupones, los descuentos por producto y las
reglas automáticas sin código.

## Business Value

- **Primary Goal**: poder lanzar promociones y campañas sin modificar código ni el catálogo.
- **Success Metrics**:
  - +5 % de conversión de carrito a pedido en 60 días.
  - +8 % de ticket promedio.
  - ≥ 1 cupón redimido por semana en los primeros 30 días.
  - 0 desincronizaciones entre el importe cobrado y el total de la orden.
- **User Impact**: el cliente puede descontar un cupón al comprar y ver el ahorro de forma
  explícita antes de pagar.

## Epic Acceptance Criteria

- [ ] Un administrador puede crear un cupón de porcentaje y uno de monto fijo.
- [ ] Un cliente puede aplicar un cupón válido y ver el desglose subtotal → descuento → total.
- [ ] Un cupón inválido muestra el motivo y no impide comprar.
- [ ] El importe cobrado por Stripe coincide exactamente con `order.totalCents`.
- [ ] Los límites de uso se respetan bajo concurrencia.
- [ ] La suite completa pasa y la cobertura se mantiene sobre el 80 %.

## Features in this Epic

- [ ] #2 - Feature: Cupones en carrito y checkout

## Definition of Done

- [ ] Todas las historias del feature entregadas
- [ ] Enablers técnicos completados
- [ ] Pruebas de integración del checkout con descuento en verde
- [ ] Rendimiento y benchmarks cumplen
- [ ] Documentación actualizada
- [ ] Aceptación del usuario completada

## Labels

`epic`, `priority-high`, `value-high`

## Milestone

v1.1 — Motor de descuentos

## Estimate

XL (73 story points)
````

### 3.2 Issue Feature

````markdown
# Feature: Cupones en carrito y checkout

## Feature Description

Aplicación de un cupón desde el carrito, con descuento congelado en la orden y cobro
coherente en Stripe Checkout. El cliente envía solo el código: el servidor valida el cupón
contra la base, calcula el descuento y lo aplica a la orden antes de generar la sesión de
pago.

## User Stories in this Feature

- [ ] #3 - ST-1: Aplicar un cupón en el carrito
- [ ] #4 - ST-2: Mantener el cupón al iniciar sesión
- [ ] #5 - ST-3: Quitar el cupón aplicado
- [ ] #6 - ST-4: Mensajes de rechazo accionables
- [ ] #7 - ST-5: Crear cupones desde el panel de administración
- [ ] #8 - ST-6: Editar y activar/desactivar cupones
- [ ] #9 - ST-7: Consultar uso y límites de un cupón
- [ ] #10 - ST-8: Ver el desglose subtotal → descuento → total

## Technical Enablers

- [ ] #11 - ENB-1: Modelo de datos y migración de cupones
- [ ] #12 - ENB-2: Motor de cálculo de descuento
- [ ] #13 - ENB-3: Servicio de validación de cupones
- [ ] #14 - ENB-4: Integración del descuento con Stripe Checkout
- [ ] #15 - ENB-5: Panel de administración de cupones
- [ ] #16 - ENB-6: Pipeline de CI

## Testing Requirements

- [ ] #17 - TST-1: Suite unitaria del motor de descuento
- [ ] #18 - TST-2: Suite de integración del servicio de cupones
- [ ] #19 - TST-3: Suite de integración del checkout con descuento
- [ ] #20 - TST-4: Pruebas DOM del resumen del carrito

## Dependencies

**Blocks**: ninguno (es el primer feature de este épico).
**Blocked by**: ninguno.

## Acceptance Criteria

- [ ] El descuento nunca supera el subtotal ni produce un total negativo.
- [ ] El cliente no puede influir en el importe aplicado.
- [ ] El cupón aplicado se conserva en la orden aunque después se desactive o se elimine.
- [ ] El flujo sin cupón se mantiene idéntico al actual.

## Definition of Done

- [ ] Todas las historias entregadas
- [ ] Enablers completados
- [ ] Pruebas de integración en verde
- [ ] Revisión de UX aprobada
- [ ] Pruebas de rendimiento completadas

## Labels

`feature`, `priority-high`, `value-high`, `backend`

## Epic

#1

## Estimate

XL (73 story points)
````

### 3.3 Issues de historia y enabler

Cada issue sigue la plantilla correspondiente. Resumen con los datos que se crearán en
GitHub:

| # | ID | Tipo | Título | Historia / Propósito | P | Valor | Pts | Labels | Bloqueado por |
|---|---|---|---|---|---|---|---|---|---|
| 3 | ST-1 | user-story | Aplicar un cupón en el carrito | Como visitante, quiero aplicar un cupón para ver el descuento antes de pagar | P0 | Alto | 5 | `user-story`, `frontend`, `backend` | ENB-1, ENB-2, ENB-3 |
| 4 | ST-2 | user-story | Mantener el cupón al iniciar sesión | Como visitante, quiero que mi cupón siga válido al iniciar sesión | P1 | Medio | 3 | `user-story`, `backend` | ST-1 |
| 5 | ST-3 | user-story | Quitar el cupón aplicado | Como visitante, quiero quitar el cupón para pagar sin descuento | P2 | Medio | 1 | `user-story`, `frontend` | ST-1 |
| 6 | ST-4 | user-story | Mensajes de rechazo accionables | Como visitante, quiero saber por qué no se aplica mi cupón | P1 | Medio | 3 | `user-story`, `frontend` | ENB-3 |
| 7 | ST-5 | user-story | Crear cupones desde el panel | Como admin, quiero crear cupones para lanzar promociones | P1 | Alto | 5 | `user-story`, `admin`, `frontend` | ENB-1, ENB-5 |
| 8 | ST-6 | user-story | Editar y activar/desactivar cupones | Como admin, quiero editar y pausar un cupón en caliente | P1 | Medio | 3 | `user-story`, `admin` | ENB-5 |
| 9 | ST-7 | user-story | Consultar uso y límites de un cupón | Como admin, quiero ver cuántas veces se usó un cupón | P2 | Bajo | 2 | `user-story`, `admin` | ENB-5 |
| 10 | ST-8 | user-story | Desglose subtotal → descuento → total | Como visitante, quiero ver el desglose del descuento | P1 | Medio | 2 | `user-story`, `frontend` | ST-1 |
| 11 | ENB-1 | enabler | Modelo de datos y migración de cupones | `enum DiscountType`, `model Coupon`, `model CouponRedemption`, `Cart.couponId`, `Order.discountCents` | P0 | Alto | 5 | `enabler`, `database` | — |
| 12 | ENB-2 | enabler | Motor de cálculo de descuento | `calculateDiscount()` puro + `normalizeCouponCode()` | P0 | Alto | 3 | `enabler`, `backend` | ENB-1 |
| 13 | ENB-3 | enabler | Servicio de validación de cupones | `validateCoupon()` + schemas Zod, con 7 motivos de rechazo | P0 | Alto | 5 | `enabler`, `backend` | ENB-1, ENB-2 |
| 14 | ENB-4 | enabler | Integración del descuento con Stripe | Cupón efímero en Stripe, `discounts`, metadata, congelación y verificación en el webhook | P0 | Alto | 8 | `enabler`, `backend` | ENB-2, ENB-3, ST-1 |
| 15 | ENB-5 | enabler | Panel de administración de cupones | Server Actions con `requireAdmin()`, listado y formularios | P1 | Alto | 8 | `enabler`, `frontend`, `backend` | ENB-1 |
| 16 | ENB-6 | enabler | Pipeline de CI | Workflows de lint, typecheck y tests con PostgreSQL | P1 | Alto | 5 | `enabler`, `infrastructure` | — |
| 17 | TST-1 | test | Suite unitaria del motor de descuento | Porcentaje, monto fijo, topes, redondeo, clamp a cero | P0 | Alto | 3 | `test`, `unit` | ENB-2 |
| 18 | TST-2 | test | Suite de integración del servicio de cupones | Un caso por motivo de rechazo + límites de uso | P1 | Alto | 5 | `test`, `integration` | ENB-3 |
| 19 | TST-3 | test | Suite de integración del checkout con descuento | `discounts` en Stripe, total congelado, webhook idempotente | P0 | Alto | 5 | `test`, `integration` | ENB-4 |
| 20 | TST-4 | test | Pruebas DOM del resumen del carrito | Fila de descuento visible, código y total final | P2 | Medio | 2 | `test`, `dom` | ST-8 |

#### Plantilla — User Story (ST-1, ejemplo completo)

````markdown
# User Story: Aplicar un cupón en el carrito

## Story Statement

Como **visitante**, quiero **aplicar un código de descuento en el carrito** para que **vea
cuánto me ahorro antes de pagar**.

## Acceptance Criteria

- [ ] El carrito muestra un campo para escribir el código y un botón «Aplicar».
- [ ] Con un código válido, el resumen muestra las filas subtotal, descuento y total.
- [ ] El descuento mostrado coincide con el que queda registrado en la orden.
- [ ] El cliente no puede enviar un importe: la acción solo acepta el código.
- [ ] Funciona igual para carrito de invitado y para usuario autenticado.

## Technical Tasks

- [ ] #21 - Implementar `applyCouponAction()` en `src/actions/cart.ts`
- [ ] #22 - Crear `src/components/cart/coupon-form.tsx`
- [ ] #23 - Propagar `couponId` desde `getCartWithItems()`

## Testing Requirements

- [ ] #20 - TST-4: Pruebas DOM del resumen del carrito

## Dependencies

**Blocked by**: #11 (ENB-1), #12 (ENB-2), #13 (ENB-3)

## Definition of Done

- [ ] Criterios de aceptación cumplidos
- [ ] Code review aprobado
- [ ] Pruebas unitarias escritas y en verde
- [ ] Pruebas de integración en verde
- [ ] Diseño de UX implementado
- [ ] Requisitos de accesibilidad cumplidos

## Labels

`user-story`, `priority-critical`, `fullstack`, `cart`

## Feature

#2

## Estimate

5 story points
````

#### Plantilla — Technical Enabler (ENB-3, ejemplo completo)

````markdown
# Technical Enabler: Servicio de validación de cupones

## Enabler Description

Una única función en el servidor que decide si un cupón puede aplicarse al carrito actual.
Concentra las reglas de negocio (vigencia, mínimos, límites de uso) para que ni el carrito
ni el checkout tengan que reimplementarlas.

## Technical Requirements

- [ ] `validateCoupon(code, { subtotalCents, userId })` devuelve un resultado tipado.
- [ ] Motivos de rechazo: `NOT_FOUND`, `INACTIVE`, `NOT_STARTED`, `EXPIRED`,
      `BELOW_MINIMUM`, `USAGE_LIMIT_REACHED`, `PER_USER_LIMIT_REACHED`, `ALREADY_APPLIED`.
- [ ] Cada motivo tiene un mensaje accionable en español para la UI.
- [ ] Los schemas Zod validan el alta y la edición de cupones.
- [ ] La validación se ejecuta contra la base de datos, nunca contra datos del cliente.

## Implementation Tasks

- [ ] #24 - Crear `src/lib/validation/coupon.ts` con los schemas
- [ ] #25 - Implementar `src/lib/cart/coupon-service.ts`
- [ ] #26 - Añadir el índice `[active, expiresAt]` en el modelo Coupon

## User Stories Enabled

Este enabler soporta:

- #3 - ST-1: Aplicar un cupón en el carrito
- #6 - ST-4: Mensajes de rechazo accionables
- #14 - ENB-4: Integración con Stripe Checkout

## Acceptance Criteria

- [ ] Cada motivo de rechazo se puede provocar de forma determinista en un test.
- [ ] Un cupón `usageLimit` agotado se rechaza sin tocar `usedCount`.
- [ ] El descuento calculado coincide con el que aplica `calculateDiscount()`.

## Definition of Done

- [ ] Implementación completa
- [ ] Pruebas unitarias escritas
- [ ] Pruebas de integración en verde
- [ ] Documentación actualizada
- [ ] Code review aprobado

## Labels

`enabler`, `priority-critical`, `backend`, `coupons`

## Feature

#2

## Estimate

5 story points
````

---

## 4. Priority and Value Matrix

| Prioridad | Valor | Criterio | Labels |
|---|---|---|---|
| P0 | Alto | Ruta crítica, bloquea la entrega | `priority-critical`, `value-high` |
| P1 | Alto | Funcionalidad principal, visible para el usuario | `priority-high`, `value-high` |
| P1 | Medio | Funcionalidad principal, interna | `priority-high`, `value-medium` |
| P2 | Medio | Importante pero no bloqueante | `priority-medium`, `value-medium` |
| P3 | Bajo | Mejora futura o deuda técnica | `priority-low`, `value-low` |

**Aplicado a esta feature:**

- **P0 / Alto** — ENB-1, ENB-2, ENB-3, ENB-4, ST-1, TST-1, TST-3. Son la ruta crítica: sin
  ellos no hay motor de descuentos ni cobro coherente.
- **P1 / Alto** — ENB-5, ENB-6, ST-5, TST-2. Sin el panel no hay gestión; sin CI no hay red
  de seguridad.
- **P1 / Medio** — ST-2, ST-4, ST-8, ST-6. Importan para la experiencia, no bloquean la
  primera entrega.
- **P2** — ST-3, ST-7, TST-4. Mejoras de conveniencia.

---

## 5. Estimation Guidelines

### Escala de story points (Fibonacci)

| Points | Significado |
|---|---|
| 1 | Cambio simple, < 4 horas |
| 2 | Funcionalidad pequeña, < 1 día |
| 3 | Funcionalidad mediana, 1–2 días |
| 5 | Funcionalidad grande, 3–5 días |
| 8 | Funcionalidad compleja, 1–2 semanas |
| 13+ | Trabajo a nivel épico, requiere desglose |

### T-Shirt sizing

| Talla | Story points |
|---|---|
| XS | 1–2 |
| S | 3–8 |
| M | 8–20 |
| L | 20–40 |
| XL | 40+ (considerar dividir) |

**Sizes de este plan:**

| Item | Points | Talla |
|---|---|---|
| Feature FEAT-1 | 73 | **XL** — se entrega en 4 sprints, no de una vez |
| Epic EPIC-1 | 73 | **XL** |
| ENB-4 (Stripe) | 8 | M |
| ENB-5 (panel admin) | 8 | M |
| ENB-1, ENB-3, ST-5, TST-2, TST-3 | 5 | S |
| ENB-2, ST-1, ST-2, ST-4, ST-6, ENB-6, TST-1 | 3 | S |
| ST-8, ST-7, TST-4 | 2 | XS |
| ST-3 | 1 | XS |

**Total: 73 story points.** El feature excede el rango de una sola entrega (L = 20–40), por
lo que se planifica en 4 sprints con hitos explícitos.

---

## 6. Dependency Management

```mermaid
graph LR
    A[ENB-1 Modelo de datos] --> B[ENB-2 Motor de cálculo]
    A --> C[ENB-3 Servicio de validación]
    B --> C
    C --> D[ST-1 Aplicar cupón en carrito]
    D --> E[ST-8 Desglose en el resumen]
    D --> F[ST-2 Cupón al iniciar sesión]
    D --> G[ENB-4 Integración con Stripe]
    G --> H[TST-3 Checkout con descuento]
    A --> I[ENB-5 Panel admin]
    I --> J[ST-5 Crear cupones]
    I --> K[ST-6 Editar / activar]
    I --> L[ST-7 Consultar uso]
    B --> M[TST-1 Suite unitaria]
    C --> N[TST-2 Suite de integración]
    E --> O[TST-4 Pruebas DOM]
```

### Tipos de dependencia

| Tipo | Significado | Ejemplo en esta feature |
|---|---|---|
| **Blocks** | El trabajo no puede empezar hasta que otro termine | ENB-2 bloquea a ENB-3 |
| **Blocked by** | Depende de otro trabajo | ST-1 depende de ENB-1, ENB-2, ENB-3 |
| **Prerequisite** | Infraestructura o setup necesario | ENB-6 (CI) es prerequisite de todo el pipeline |
| **Related** | Comparte contexto, no bloquea | ST-3 y ST-7 |
| **Parallel** | Puede avanzar en paralelo | ST-3/ST-7/ST-8 con ENB-5 |

### Ruta crítica

`ENB-1 → ENB-2 → ENB-3 → ST-1 → ENB-4 → TST-3` — 26 story points. Cualquier retraso en esta
cadena retrasa la entrega completa.

---

## 7. Sprint Planning Template

### Capacidad

- **Velocidad estimada**: 20 story points por sprint (a confirmar con el equipo).
- **Duración**: 2 semanas por sprint, 4 sprints para los 73 puntos.
- **Buffer**: 20 % reservado para trabajo inesperado y correcciones.
- **Factor de foco**: 70–80 % del tiempo en trabajo planificado.

### Sprint 1 — Motor de descuentos (21 pts)

**Objetivo**: que el servidor sepa calcular y validar un descuento.

| # | ID | Título | Pts |
|---|---|---|---|
| 11 | ENB-1 | Modelo de datos y migración de cupones | 5 |
| 12 | ENB-2 | Motor de cálculo de descuento | 3 |
| 13 | ENB-3 | Servicio de validación de cupones | 5 |
| 17 | TST-1 | Suite unitaria del motor de descuento | 3 |
| 18 | TST-2 | Suite de integración del servicio de cupones | 5 |

### Sprint 2 — Cupón en el carrito y cobro (21 pts)

**Objetivo**: aplicar un cupón y cobrar el importe correcto.

| # | ID | Título | Pts |
|---|---|---|---|
| 3 | ST-1 | Aplicar un cupón en el carrito | 5 |
| 4 | ST-2 | Mantener el cupón al iniciar sesión | 3 |
| 6 | ST-4 | Mensajes de rechazo accionables | 3 |
| 14 | ENB-4 | Integración del descuento con Stripe Checkout | 8 |
| 19 | TST-3 | Suite de integración del checkout con descuento | 5 |

### Sprint 3 — Panel de administración (19 pts)

**Objetivo**: gestionar los cupones sin tocar la base.

| # | ID | Título | Pts |
|---|---|---|---|
| 15 | ENB-5 | Panel de administración de cupones | 8 |
| 7 | ST-5 | Crear cupones desde el panel | 5 |
| 8 | ST-6 | Editar y activar/desactivar cupones | 3 |
| 10 | ST-8 | Desglose subtotal → descuento → total | 2 |
| 5 | ST-3 | Quitar el cupón aplicado | 1 |

### Sprint 4 — Cierre (12 pts)

**Objetivo**: endurecer y entregar.

| # | ID | Título | Pts |
|---|---|---|---|
| 16 | ENB-6 | Pipeline de CI | 5 |
| 9 | ST-7 | Consultar uso y límites de un cupón | 2 |
| 20 | TST-4 | Pruebas DOM del resumen del carrito | 2 |
| — | — | Reserva de buffer (≈ 3 pts de holgura) | 3 |

### Formato de objetivo de sprint

```markdown
## Sprint {N} Goal

**Primary Objective**: {entregable principal del sprint}

**Stories in Sprint**:

- #{issue} - {título} ({points} pts)
- #{issue} - {título} ({points} pts)

**Total Commitment**: {points} story points
**Success Criteria**: {resultados medibles}
```

---

## 8. GitHub Project Board Configuration

### Columnas (Kanban)

1. **Backlog** — priorizado y listo para planificar
2. **Sprint Ready** — detallado, estimado y listo para desarrollar
3. **In Progress** — en curso
4. **In Review** — revisión de código, pruebas o stakeholders
5. **Testing** — validación de QA y aceptación
6. **Done** — completado y aceptado

### Custom fields

| Campo | Valores | Uso en este plan |
|---|---|---|
| `Priority` | P0, P1, P2, P3 | Critical path vs. mejora |
| `Value` | High, Medium, Low | Prioridad por valor de negocio |
| `Component` | Frontend, Backend, Infrastructure, Testing | Mapa de responsabilidades |
| `Estimate` | Story points o t-shirt size | 1, 2, 3, 5, 8 |
| `Sprint` | Sprint 1–4 | Planificado arriba |
| `Assignee` | Persona responsable | — |
| `Epic` | Referencia al épico | EPIC-1 |
| `Type` | Epic, Feature, Story, Enabler, Test | Clasificación del árbol |

### Reglas de automatización sugeridas

- Mover a **In Review** cuando se abre un PR que referencia el issue.
- Mover a **Done** cuando el PR se fusiona y los checks de CI pasan.
- Mover a **Testing** cuando el issue tiene label `test` y el PR está fusionado.
- Marcar **Bloqueado** cuando un issue tiene un `Blocked by` sin resolver.

---

## 9. Automation and GitHub Actions

### 9.1 Creación automatizada de issues

```yaml
name: Create Feature Issues

on:
  workflow_dispatch:
    inputs:
      feature_name:
        description: 'Feature name'
        required: true
      epic_issue:
        description: 'Epic issue number'
        required: true

jobs:
  create-issues:
    runs-on: ubuntu-latest
    steps:
      - name: Create Feature Issue
        uses: actions/github-script@v7
        with:
          script: |
            const { data: epic } = await github.rest.issues.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: $context.inputs.epic_issue
            })

            const featureIssue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Feature: $context.inputs.feature_name`,
              body: `## Feature Description\n\nSee docs/ways-of-work/plan for the full plan.`,
              labels: ['feature', 'priority-medium'],
              milestone: epic.data.milestone?.number
            })

            core.info(`Created feature issue #${featureIssue.data.number}`)
```

> Nota: en el repositorio, `feature_request.yml` y `chore_request.yml` son las plantillas de
> issue; si existen, úsalas en lugar del cuerpo inline.

### 9.2 Actualización automática de estado

```yaml
name: Update Issue Status

on:
  pull_request:
    types: [opened, closed]

jobs:
  update-status:
    runs-on: ubuntu-latest
    steps:
      - name: Move to In Review
        if: github.event.action == 'opened'
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.pull_request
            const body = issue.body || ''
            const matches = body.match(/#(\d+)/g) || []
            for (const ref of matches) {
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: Number(ref.slice(1)),
                state: 'open'
              })
            }

      - name: Move to Done
        if: github.event.action == 'closed' && github.event.pull_request.merged
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.pull_request
            const body = issue.body || ''
            const matches = body.match(/#(\d+)/g) || []
            for (const ref of matches) {
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: Number(ref.slice(1)),
                state: 'closed'
              })
            }
```

### 9.3 Pipeline de CI (enabler ENB-6)

El repositorio **no tiene hoy** workflows de CI. Es un enabler propio de esta feature:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ecommerce_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ecommerce_test
      TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ecommerce_test
      AUTH_SECRET: ci-secret-value-with-at-least-32-characters
      STRIPE_SECRET_KEY: sk_test_placeholder
      STRIPE_WEBHOOK_SECRET: whsec_placeholder
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npx prisma migrate deploy
      - run: npm test
```

---

## Success Metrics

### Project Management KPIs

| KPI | Meta |
|---|---|
| Predictabilidad de sprint | > 80 % del trabajo comprometido completado |
| Cycle time (In Progress → Done) | < 5 días hábiles |
| Lead time (Backlog → Done) | < 2 semanas |
| Tasa de escapes de defectos | < 5 % de historias con correcciones post-entrega |
| Velocidad del equipo | Entrega consistente de story points por sprint |

### Process Efficiency Metrics

| KPI | Meta |
|---|---|
| Tiempo de creación del plan | < 1 hora (este documento) |
| Resolución de dependencias bloqueantes | < 24 horas |
| Precisión de las transiciones automáticas | > 95 % |
| Completitud de la documentación | 100 % de los issues con los campos de la plantilla |
| Colaboración entre equipos | < 2 días hábiles |

### Project Delivery Metrics

| KPI | Meta |
|---|---|
| Cumplimiento de la Definition of Done | 100 % de las historias completadas |
| Cobertura de criterios de aceptación | 100 % validados |
| Logro de los objetivos de sprint | > 90 % |
| Satisfacción de stakeholders | > 90 % de aprobación de la feature |
| Precisión de la planificación | < 10 % de variación entre lo estimado y lo entregado |

---

## Checklist de creación de issues

Ver [`issues-checklist.md`](./issues-checklist.md).
