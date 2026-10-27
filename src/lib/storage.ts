/* ============================================================================
   Pulso — Capa de persistencia
   ----------------------------------------------------------------------------
   Nadie más en la aplicación toca localStorage. Toda lectura y escritura pasa
   por aquí, por tres razones que se pueden defender en la presentación:

     1. Migrar a IndexedDB o a una API sería cambiar SOLO este archivo.
     2. Un JSON corrupto o un almacenamiento lleno no puede tumbar la app:
        se atrapa el error y se devuelve un estado válido.
     3. Es la única puerta por donde salen los datos de salud del usuario, y
        esa puerta da al propio dispositivo. A ningún servidor.
   ========================================================================== */

import type { EstadoPulso, Preferencias } from '../types'

export const CLAVE = 'pulso.datos.v1'
export const VERSION_ESQUEMA = 1

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  escalaTexto: 'normal',
  altoContraste: false,
  modoSimple: false,
}

export const ESTADO_INICIAL: EstadoPulso = {
  perfil: null,
  medicamentos: [],
  registrosDosis: [],
  mediciones: [],
  citas: [],
  preferencias: PREFERENCIAS_POR_DEFECTO,
  datosDemo: false,
  version: VERSION_ESQUEMA,
}

/** Nunca revienta: si el navegador bloquea el almacenamiento, devuelve null. */
function almacen(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Rellena lo que falte para que un estado viejo o a medias siga siendo usable. */
export function normalizar(bruto: unknown): EstadoPulso {
  if (!bruto || typeof bruto !== 'object') return { ...ESTADO_INICIAL }
  const d = bruto as Partial<EstadoPulso>
  return {
    perfil: d.perfil ?? null,
    medicamentos: Array.isArray(d.medicamentos) ? d.medicamentos : [],
    registrosDosis: Array.isArray(d.registrosDosis) ? d.registrosDosis : [],
    mediciones: Array.isArray(d.mediciones) ? d.mediciones : [],
    citas: Array.isArray(d.citas) ? d.citas : [],
    preferencias: { ...PREFERENCIAS_POR_DEFECTO, ...(d.preferencias ?? {}) },
    datosDemo: Boolean(d.datosDemo),
    version: typeof d.version === 'number' ? d.version : VERSION_ESQUEMA,
  }
}

export function cargar(): EstadoPulso {
  const a = almacen()
  if (!a) return { ...ESTADO_INICIAL }
  try {
    const crudo = a.getItem(CLAVE)
    if (!crudo) return { ...ESTADO_INICIAL }
    return normalizar(JSON.parse(crudo))
  } catch (e) {
    // JSON corrupto: se conserva la copia rota por si hay que rescatarla a mano
    // y se arranca limpio, en vez de dejar la app inservible.
    console.warn('Pulso: no se pudo leer el almacenamiento, se empieza limpio.', e)
    try {
      a.setItem(`${CLAVE}.corrupto.${Date.now()}`, a.getItem(CLAVE) ?? '')
    } catch {
      /* si tampoco se puede guardar la copia, seguimos igual */
    }
    return { ...ESTADO_INICIAL }
  }
}

export type ResultadoGuardar = { ok: true } | { ok: false; motivo: string }

export function guardar(estado: EstadoPulso): ResultadoGuardar {
  const a = almacen()
  if (!a) return { ok: false, motivo: 'Este navegador no permite guardar datos localmente.' }
  try {
    a.setItem(CLAVE, JSON.stringify(estado))
    return { ok: true }
  } catch (e) {
    const lleno = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    return {
      ok: false,
      motivo: lleno
        ? 'No queda espacio en el dispositivo. Genera el informe y borra mediciones antiguas.'
        : 'No se pudo guardar. Revisa los permisos de almacenamiento del navegador.',
    }
  }
}

export function borrarTodo(): void {
  const a = almacen()
  if (!a) return
  try {
    a.removeItem(CLAVE)
  } catch {
    /* nada que hacer */
  }
}

/** Copia de seguridad manual, por si el usuario cambia de teléfono. */
export function exportarJSON(estado: EstadoPulso): string {
  return JSON.stringify(estado, null, 2)
}

/** Identificadores. crypto.randomUUID existe en todo navegador moderno. */
export function nuevoId(prefijo = 'id'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefijo}_${uuid.slice(0, 12)}`
}
