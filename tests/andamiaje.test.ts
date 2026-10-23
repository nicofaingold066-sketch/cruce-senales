import { describe, it, expect } from 'vitest'

describe('andamiaje', () => {
  it('corre vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('carga las variables VITE_* del .env', () => {
    expect(process.env.VITE_SUPABASE_URL ?? '').toContain('supabase.co')
    expect(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').not.toBe('')
  })
})
