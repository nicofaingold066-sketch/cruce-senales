// Fechas del agente. El servidor (`propose_from_preferences`, 0050) acepta un sábado posterior a hoy y a 16 días como
// máximo, contando el día en America/Santiago. La pantalla ofrece solo esos (auditoría M4): ningún chip va a fallar.

/** Hoy en Santiago, "aaaa-mm-dd". */
export function hoyEnSantiago(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

/** Los sábados que acepta el servidor desde `hoy` ("aaaa-mm-dd"), con su rótulo de chip: "Sáb 31 oct". */
export function sabadosParaElegir(hoy = hoyEnSantiago()): { v: string; texto: string }[] {
  const base = new Date(`${hoy}T12:00:00Z`)
  const sabados: { v: string; texto: string }[] = []
  for (let d = 1; d <= 16; d++) {
    const f = new Date(base.getTime() + d * 86400000)
    if (f.getUTCDay() !== 6) continue
    const mes = f.toLocaleDateString('es-CL', { month: 'short', timeZone: 'UTC' }).replace('.', '')
    sabados.push({ v: f.toISOString().slice(0, 10), texto: `Sáb ${f.getUTCDate()} ${mes}` })
  }
  return sabados
}

/** El sábado con que arranca: el recordado o el preferido si todavía valen; si no, el primero que se acepta. */
export function sabadoInicial(recordado: string | undefined, validos: { v: string }[], preferido: string): string {
  for (const c of [recordado, preferido]) if (c && validos.some((o) => o.v === c)) return c
  return validos[0]?.v ?? preferido
}
