// Ruta aditiva de la función agente existente. El cliente y el modelo se inyectan;
// no hay cliente privilegiado, política nueva ni aprobación/aceptación automática.
import { crearPuertoBackendSocial, type ClienteRpcSocial } from './puerto-social.ts'
import { orquestarAgenteSocial } from './social/orquestador.ts'
import type { ClimaSocial, PuertoModelo } from './social/contratos.ts'

const objeto = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const estadoClima = (x: unknown) => x === 'seco' || x === 'lluvia' || x === 'desconocido'
const fallo = (codigo = 'entrada_incompleta', detalle = 'formato_invalido') => ({
  ok: false, contrato: 2, error: { codigo, detalle,
    mensaje: codigo === 'entrada_incompleta' ? 'Revisa los datos del borrador.' : 'No pudimos comprobar el resultado. Reintenta con la misma preparación.',
    reintentable: codigo !== 'entrada_incompleta' },
})

export async function atenderSocial(entrada: unknown, deps: {
  cliente: ClienteRpcSocial
  modelo: PuertoModelo
  signal?: AbortSignal
}) {
  if (!objeto(entrada) || typeof entrada.espacio_id !== 'string' || !UUID.test(entrada.espacio_id)
    || !objeto(entrada.social) || entrada.sabado !== undefined) return fallo()
  const s = entrada.social
  // Sin fecha raíz: un despliegue anterior rechaza tanto probe como preparar
  // antes de consultar espacio, clima, RPC de propuestas o un modelo facturable.
  if (s.accion === 'capacidad') return { ok: true, contrato: 2, capacidades: { agente_social: 1 } }
  if (s.accion !== 'preparar' || typeof s.ejecucion_id !== 'string' || !UUID.test(s.ejecucion_id)
    || typeof s.sabado !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(s.sabado)
    || !objeto(s.clima) || !estadoClima(s.clima.sabado) || !estadoClima(s.clima.domingo)) return fallo()
  try {
    let llamado = false
    let salidaModelo: unknown = null
    const puertos = {
      backend: crearPuertoBackendSocial(deps.cliente, { signal: deps.signal }),
      modelo: async (...args: Parameters<PuertoModelo>) => {
        if (deps.signal?.aborted) return null
        llamado = true
        salidaModelo = await deps.modelo(...args)
        return salidaModelo
      },
      limiteModeloMs: 30000,
      // Una intención de preparar nunca es una intención de publicar, incluso
      // si la política del espacio cambió a autónoma antes de esta petición.
      publicacionAutomatica: false,
    }
    const resultado = await orquestarAgenteSocial({
      espacioId: entrada.espacio_id, sabado: s.sabado, ejecucionId: s.ejecucion_id,
      oportunidad: `sabado:${s.sabado}`,
      clima: { sabado: s.clima.sabado, domingo: s.clima.domingo } as ClimaSocial,
      accion: { tipo: 'preparar' },
    }, puertos)
    const modeloAceptado = llamado && objeto(salidaModelo) && resultado.ejecucion?.borrador
      && salidaModelo.opcion_ref === resultado.ejecucion.borrador.opcion_ref
      && typeof salidaModelo.texto === 'string' && salidaModelo.texto.trim() === resultado.ejecucion.borrador.texto
    // Un recibo recuperado no trae autoría persistida: no inventar su fuente.
    return { ok: true, contrato: 2, resultado_social: resultado,
      ...(llamado && resultado.borrador ? {
        eleccion_fuente: modeloAceptado ? 'modelo' : 'regla',
        explicacion_fuente: modeloAceptado ? 'modelo' : 'texto_fijo',
      } : {}),
    }
  } catch {
    return fallo('fallo_temporal', 'reintentar')
  }
}
