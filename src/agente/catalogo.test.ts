import { describe, expect, it } from 'vitest'
import { sinNombresDelCatalogo } from './api'

describe('auditoría M2: el catálogo no nombra a nadie', () => {
  it('"Asado en casa de Tomi" y "Quincho de Tomi (Simulación)" quedan neutros', () => {
    expect(sinNombresDelCatalogo('Asado en casa de Tomi')).toBe('Asado en casa')
    expect(sinNombresDelCatalogo('Quincho de Tomi (Simulación)')).toBe('Quincho (Simulación)')
  })
  it('lo demás no cambia', () => {
    expect(sinNombresDelCatalogo('Picnic en el parque')).toBe('Picnic en el parque')
    expect(sinNombresDelCatalogo('Tomillo y romero')).toBe('Tomillo y romero')
  })
})
