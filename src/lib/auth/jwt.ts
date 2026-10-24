import { SignJWT, jwtVerify } from 'jose'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './cookie'

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS }

export type Role = 'ADMIN' | 'USER'

export type SessionTokenPayload = {
  /** userId */
  sub: string
  /** sessionId (columna `id` de la fila Session) */
  sid: string
  /** Rol guardado en el token. NO es la fuente de verdad: el rol efectivo se lee de la BD. */
  role: Role
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET debe estar definido y tener al menos 32 caracteres.')
  }
  return new TextEncoder().encode(secret)
}

export function isAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET
  return Boolean(secret && secret.length >= 32)
}

export async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(payload.sid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

/**
 * Verifica la firma y expiración del token.
 * Devuelve `null` ante cualquier error (firma inválida, expirado, secreto ausente).
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    if (!payload.sub || typeof payload.jti !== 'string') return null
    return {
      sub: payload.sub,
      sid: payload.jti,
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
    }
  } catch {
    return null
  }
}
