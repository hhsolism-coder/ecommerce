import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAppUrl, getStripe, getWebhookSecret, isPlaceholderKey, isStripeConfigured } from '@/lib/stripe'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isStripeConfigured', () => {
  it('devuelve false sin clave configurada', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    expect(isStripeConfigured()).toBe(false)
  })

  it('devuelve true con clave configurada', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_algo')
    expect(isStripeConfigured()).toBe(true)
  })

  it('devuelve false con la clave placeholder de .env.example', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder_replace_me')
    expect(isStripeConfigured()).toBe(false)
  })
})

describe('isPlaceholderKey', () => {
  it('detecta los marcadores de placeholder', () => {
    expect(isPlaceholderKey('sk_test_placeholder_replace_me')).toBe(true)
    expect(isPlaceholderKey('whsec_xxxxxxxxxxxxxxxx')).toBe(true)
    expect(isPlaceholderKey('sk_test_cambia-esto')).toBe(true)
  })

  it('no marca una clave real como placeholder', () => {
    expect(isPlaceholderKey('sk_test_51ABCdefGHIjklMNOpqrSTUV')).toBe(false)
    expect(isPlaceholderKey(undefined)).toBe(true)
    expect(isPlaceholderKey('')).toBe(true)
  })
})

describe('getStripe', () => {
  it('lanza un error explicativo cuando falta la clave', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/)
  })

  it('lanza un error explicativo con la clave placeholder', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder_replace_me')
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/)
  })

  it('devuelve el mismo cliente entre llamadas', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_algo')
    expect(getStripe()).toBe(getStripe())
  })
})

describe('getWebhookSecret', () => {
  it('lanza un error explicativo cuando falta el secreto', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    expect(() => getWebhookSecret()).toThrow(/STRIPE_WEBHOOK_SECRET/)
  })

  it('lanza un error explicativo con el secreto placeholder', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder_replace_me')
    expect(() => getWebhookSecret()).toThrow(/STRIPE_WEBHOOK_SECRET/)
  })

  it('devuelve el secreto configurado', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_algo')
    expect(getWebhookSecret()).toBe('whsec_algo')
  })
})

describe('getAppUrl', () => {
  it('usa APP_URL cuando está configurada', () => {
    vi.stubEnv('APP_URL', 'https://tienda.example.com')
    expect(getAppUrl()).toBe('https://tienda.example.com')
  })

  it('cae a localhost cuando no está configurada', () => {
    vi.stubEnv('APP_URL', '')
    expect(getAppUrl()).toBe('http://localhost:3000')
  })
})
