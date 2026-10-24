import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `globals: true` en la config, Testing Library no auto-limpia entre tests.
afterEach(() => {
  cleanup()
})
