# Issues Checklist — Cupones en carrito y checkout

> Epic: **Descuentos y cupones** · Feature: **Cupones en carrito y checkout**
> Checklist de preparación y creación de issues. Complementa a
> [`project-plan.md`](./project-plan.md).

---

## Pre-Creation Preparation

- [x] **Artefactos de la feature completos**: PRD, UX, technical breakdown e implementation plan
  - [x] [PRD](../cupones-en-carrito-y-checkout.md)
  - [x] [Technical Breakdown](./technical-breakdown.md)
  - [x] [Implementation Plan](./implementation-plan.md)
  - [ ] UX / diseño de la fila de descuento y del formulario de cupón *(pendiente: definir
        mockup o tomar la referencia de `docs/diseno.md` como contrato visual)*
- [x] **Existe el épico**: issue padre con labels, milestone y descripción
  - Epic `EPIC-1` — #1
- [ ] **Project board configurado**: columnas, custom fields y reglas de automatización
  - [ ] Crear el board con las 6 columnas del plan
  - [ ] Crear los custom fields `Priority`, `Value`, `Component`, `Estimate`, `Sprint`, `Epic`, `Type`
  - [ ] Configurar las reglas de transición (PR abierto → In Review, PR fusionado → Done)
  - [ ] **Bloqueado**: el token de `gh` no tiene los scopes `project` / `read:project`.
        Requiere `gh auth refresh -s project,read:project` (autorización en el navegador).
        El script que completa el board está listo en `%TEMP%\setup-project-board.ps1`.
- [ ] **Capacidad del equipo evaluada**: velocidad y asignación de responsables
  - [ ] Confirmar la velocidad real (el plan asume 20 pts/sprint)
  - [ ] Asignar responsable a cada enabler

### Preparación técnica previa a crear los issues

- [x] Crear las labels que usa el plan (19 creadas):
  `epic`, `feature`, `user-story`, `enabler`, `test`,
  `priority-critical`, `priority-high`, `priority-medium`, `priority-low`,
  `value-high`, `value-medium`, `value-low`,
  `frontend`, `backend`, `database`, `infrastructure`, `admin`, `cart`, `coupons`
- [x] Crear el milestone **v1.1 — Motor de descuentos** (milestone #1)
- [x] Verificar que existen las plantillas `feature_request.yml` / `chore_request.yml` en
      `.github/ISSUE_TEMPLATE/` — **el repositorio no tiene carpeta `.github`**, así que no
      hay plantillas que reutilizar: los issues se crearon con el cuerpo completo del plan

---

## Epic Level Issues

- [x] **Epic issue creado** con descripción completa, valor y criterios de aceptación
  - #1 — Epic: Descuentos y cupones
- [x] **Epic milestone creado** con la versión objetivo
  - Milestone `v1.1 — Motor de descuentos` (#1)
- [x] **Labels del épico aplicadas**: `epic`, prioridad, valor y equipo
- [ ] **Épico agregado al board** en la columna Backlog — pendiente del scope `project`
- [x] **Estimación del épico asignada**: XL (73 story points)

### Contenido del issue del épico

| Campo | Valor |
|---|---|
| Título | `Epic: Descuentos y cupones` |
| Labels | `epic`, `priority-high`, `value-high` |
| Milestone | `v1.1 — Motor de descuentos` |
| Estimación | XL |
| Issues hijos | FEAT-1 (#2) |

---

## Feature Level Issues

- [x] **Feature issue creado** enlazando al épico padre
  - #2 — Feature: Cupones en carrito y checkout
- [x] **Dependencias de la feature identificadas** y documentadas
  - Bloquea: ninguna (primer feature del épico)
  - Bloqueada por: ninguna
- [x] **Estimación de la feature completada** con t-shirt sizing: XL
- [x] **Criterios de aceptación de la feature definidos** con resultados medibles
- [x] **Labels de la feature aplicadas**: `feature`, `priority-high`, `value-high`, `backend`
- [ ] **Feature agregada al board** en Backlog — pendiente del scope `project`

### Contenido del issue de la feature

| Campo | Valor |
|---|---|
| Título | `Feature: Cupones en carrito y checkout` |
| Labels | `feature`, `priority-high`, `value-high`, `backend` |
| Epic | #1 |
| Estimación | XL (73 pts) |
| Historias | #3–#10 |
| Enablers | #11–#16 |
| Tests | #17–#20 |

---

## Story / Enabler Level Issues

### Historias de usuario

- [x] **Historias creadas siguiendo los criterios INVEST**
  - [x] #3 — ST-1: Aplicar un cupón en el carrito
  - [x] #4 — ST-2: Mantener el cupón al iniciar sesión
  - [x] #5 — ST-3: Quitar el cupón aplicado
  - [x] #6 — ST-4: Mensajes de rechazo accionables
  - [x] #7 — ST-5: Crear cupones desde el panel de administración
  - [x] #8 — ST-6: Editar y activar/desactivar cupones
  - [x] #9 — ST-7: Consultar uso y límites de un cupón
  - [x] #10 — ST-8: Desglose subtotal → descuento → total
- [x] **Enablers técnicos identificados y priorizados**
  - [x] #11 — ENB-1: Modelo de datos y migración de cupones (P0 / 5 pts)
  - [x] #12 — ENB-2: Motor de cálculo de descuento (P0 / 3 pts)
  - [x] #13 — ENB-3: Servicio de validación de cupones (P0 / 5 pts)
  - [x] #14 — ENB-4: Integración del descuento con Stripe Checkout (P0 / 8 pts)
  - [x] #15 — ENB-5: Panel de administración de cupones (P1 / 8 pts)
  - [x] #16 — ENB-6: Pipeline de CI (P1 / 5 pts)
- [x] **Estimaciones en story points asignadas** con la escala Fibonacci
  - [x] Enabler ENB-4 y ENB-5 → 8 pts (1–2 semanas) — requieren dividir si se atrasan
  - [x] ENB-1, ENB-3, ST-5, TST-2, TST-3 → 5 pts (3–5 días)
  - [x] ENB-2, ST-1, ST-2, ST-4, ST-6, ENB-6, TST-1 → 3 pts (1–2 días)
  - [x] ST-8, ST-7, TST-4 → 2 pts (< 1 día)
  - [x] ST-3 → 1 pt (< 4 horas)
- [x] **Dependencias mapeadas** entre historias y enablers
  - [x] ENB-1 → ENB-2 → ENB-3 → ST-1 → ENB-4 → TST-3 (ruta crítica)
  - [x] ENB-1 → ENB-5 → ST-5 / ST-6 / ST-7
  - [x] ST-1 → ST-8 → TST-4
  - [x] ENB-2 → TST-1 · ENB-3 → TST-2
- [x] **Criterios de aceptación detallados** con requisitos verificables
  - [x] Cada historia tiene al menos 3 criterios de aceptación observables
  - [x] Cada enabler tiene criterios técnicos y de calidad
  - [x] Cada item de test tiene los escenarios a cubrir

### Checklist de calidad por issue

- [ ] ¿El issue tiene un único responsable claro?
- [ ] ¿Los criterios de aceptación se pueden verificar con un test o una comprobación manual
      inequívoca?
- [ ] ¿El issue cabe en el sprint donde está planificado?
- [ ] ¿Los enlaces a issues padre e hijos son correctos?
- [ ] ¿La Definition of Done está pegada al issue (no solo en este documento)?

---

## Resumen de issues a crear

| Prioridad de creación | # | Título | Tipo | Pts |
|---|---|---|---|---|
| 1 | 1 | Epic: Descuentos y cupones | epic | XL |
| 2 | 2 | Feature: Cupones en carrito y checkout | feature | XL |
| 3 | 11 | ENB-1 Modelo de datos y migración | enabler | 5 |
| 3 | 12 | ENB-2 Motor de cálculo de descuento | enabler | 3 |
| 3 | 13 | ENB-3 Servicio de validación de cupones | enabler | 5 |
| 4 | 3 | ST-1 Aplicar un cupón en el carrito | user-story | 5 |
| 4 | 14 | ENB-4 Integración con Stripe Checkout | enabler | 8 |
| 5 | 6 | ST-4 Mensajes de rechazo accionables | user-story | 3 |
| 5 | 19 | TST-3 Checkout con descuento (integración) | test | 5 |
| 6 | 10 | ST-8 Desglose subtotal → descuento → total | user-story | 2 |
| 6 | 17 | TST-1 Suite unitaria del motor | test | 3 |
| 7 | 18 | TST-2 Suite de integración del servicio | test | 5 |
| 8 | 15 | ENB-5 Panel de administración | enabler | 8 |
| 8 | 7 | ST-5 Crear cupones desde el panel | user-story | 5 |
| 9 | 8 | ST-6 Editar y activar/desactivar | user-story | 3 |
| 9 | 16 | ENB-6 Pipeline de CI | enabler | 5 |
| 10 | 4 | ST-2 Mantener el cupón al iniciar sesión | user-story | 3 |
| 10 | 5 | ST-3 Quitar el cupón aplicado | user-story | 1 |
| 10 | 9 | ST-7 Consultar uso y límites | user-story | 2 |
| 10 | 20 | TST-4 Pruebas DOM del resumen | test | 2 |

**Total: 20 issues · 73 story points · 4 sprints**

---

## Definición de Hecho de la creación de issues

- [x] Los 20 issues existen con su título, cuerpo y labels correctos
- [x] Las dependencias están anotadas en el cuerpo de cada issue
- [x] El épico y la feature enlazan con todos sus hijos
- [ ] El board tiene las 6 columnas y los custom fields — pendiente del scope `project`
- [x] El milestone `v1.1` contiene el épico y la feature (20 issues abiertos)
- [x] La suma de las estimaciones por sprint coincide con lo planificado
      (21 / 24 / 19 / 9 + 3 de buffer = 73)

> Nota: el Sprint 2 suma 24 puntos y supera la velocidad nominal de 20. Está documentado en
> el [project plan](./project-plan.md) con las tres opciones para equilibrarlo.
