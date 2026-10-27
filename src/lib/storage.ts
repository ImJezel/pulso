/* ============================================================================
   Pulso — Capa de persistencia local
   ----------------------------------------------------------------------------
   Nadie más en la aplicación toca localStorage. Toda lectura y escritura pasa
   por aquí, por tres razones que se pueden defender en la presentación:

     1. Cambiar de almacenamiento es cambiar SOLO esta capa (y así fue: la
        base de datos de Supabase se añadió en lib/remoto.ts sin tocar
        ninguna pantalla).
     2. Un JSON corrupto o un almacenamiento lleno no puede tumbar la app:
        se atrapa el error y se devuelve un estado válido.
     3. Con cuenta, esta copia local es la que permite abrir la app sin
        internet. Cada usuario tiene su propia clave, así que dos personas
        que comparten un teléfono nunca ven los datos de la otra.
   ========================================================================== */

import type { EstadoPulso, Preferencias } from '../types'

/** Modo local (sin Supabase configurado): una sola clave, como siempre. */
export const CLAVE = 'pulso.datos.v1'
export const VERSION_ESQUEMA = 1

/** Copia local del estado de un usuario con cuenta. */
export const claveUsuario = (uid: string) => `${CLAVE}.${uid}`
/** Lo último que el servidor confirmó para ese usuario: la base de la sincronización. */
export const claveConfirmado = (uid: string) => `pulso.confirmado.v1.${uid}`

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

export function cargar(clave: string = CLAVE): EstadoPulso {
  const a = almacen()
  if (!a) return { ...ESTADO_INICIAL }
  try {
    const crudo = a.getItem(clave)
    if (!crudo) return { ...ESTADO_INICIAL }
    return normalizar(JSON.parse(crudo))
  } catch (e) {
    // JSON corrupto: se conserva la copia rota por si hay que rescatarla a mano
    // y se arranca limpio, en vez de dejar la app inservible.
    console.warn('Pulso: no se pudo leer el almacenamiento, se empieza limpio.', e)
    try {
      a.setItem(`${clave}.corrupto.${Date.now()}`, a.getItem(clave) ?? '')
    } catch {
      /* si tampoco se puede guardar la copia, seguimos igual */
    }
    return { ...ESTADO_INICIAL }
  }
}

export type ResultadoGuardar = { ok: true } | { ok: false; motivo: string }

export function guardar(estado: EstadoPulso, clave: string = CLAVE): ResultadoGuardar {
  const a = almacen()
  if (!a) return { ok: false, motivo: 'Este navegador no permite guardar datos localmente.' }
  try {
    a.setItem(clave, JSON.stringify(estado))
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

export function borrarTodo(clave: string = CLAVE): void {
  const a = almacen()
  if (!a) return
  try {
    a.removeItem(clave)
  } catch {
    /* nada que hacer */
  }
}

/** La base de la sincronización. null = este dispositivo nunca ha sincronizado. */
export function cargarConfirmado(uid: string): EstadoPulso | null {
  try {
    const crudo = almacen()?.getItem(claveConfirmado(uid))
    return crudo ? normalizar(JSON.parse(crudo)) : null
  } catch {
    // Sin base fiable: se sube todo lo local y se vuelve a pedir lo del servidor.
    return null
  }
}

export function guardarConfirmado(uid: string, estado: EstadoPulso): void {
  try {
    almacen()?.setItem(claveConfirmado(uid), JSON.stringify(estado))
  } catch {
    /* si no cabe, la próxima vez se sube todo de nuevo: más lento, no incorrecto */
  }
}

/** Al cerrar sesión o eliminar la cuenta: no se deja copia en el dispositivo. */
export function olvidarUsuario(uid: string): void {
  borrarTodo(claveUsuario(uid))
  borrarTodo(claveConfirmado(uid))
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
