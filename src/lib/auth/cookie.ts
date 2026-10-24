/**
 * Constantes compartidas entre el runtime de Node (sesiones) y el middleware.
 *
 * Viven aparte a propósito: `middleware.ts` puede ejecutarse en el runtime edge,
 * así que no debe importar nada que arrastre `jose`, `next/headers` o el driver `pg`.
 */
export const SESSION_COOKIE = 'session'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días
