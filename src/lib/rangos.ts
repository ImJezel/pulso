/* ============================================================================
   Pulso — Clasificación de mediciones
   ----------------------------------------------------------------------------
   Funciones PURAS, sin React y sin acceso a almacenamiento, para poder
   probarlas solas. Regla de negocio que no se negocia:

     · Los rangos los define el MÉDICO y los escribe el usuario.
     · Si no hay rango, se devuelve 'sin-referencia' y la interfaz NO colorea
       nada. Pulso nunca inventa un rango "estándar".
     · Hasta 10% fuera del límite es 'atencion'; más allá, 'fuera-de-rango'.
   ========================================================================== */

import type { Clasificacion, Medicion, RangosObjetivo } from '../types'

const MARGEN_ATENCION = 0.1 // 10%

/** Clasifica un número suelto contra un intervalo [min, max]. */
export function clasificarValor(valor: number, min: number, max: number): Clasificacion {
  if (!Number.isFinite(valor)) return 'sin-referencia'
  if (valor >= min && valor <= max) return 'en-rango'
  if (valor > max) {
    return valor - max <= max * MARGEN_ATENCION ? 'atencion' : 'fuera-de-rango'
  }
  return min - valor <= min * MARGEN_ATENCION ? 'atencion' : 'fuera-de-rango'
}

const GRAVEDAD: Record<Clasificacion, number> = {
  'sin-referencia': 0,
  'en-rango': 1,
  atencion: 2,
  'fuera-de-rango': 3,
}

/** De varias clasificaciones se queda con la más seria (la que hay que mirar). */
export function peor(...valores: Clasificacion[]): Clasificacion {
  const reales = valores.filter((v) => v !== 'sin-referencia')
  if (reales.length === 0) return 'sin-referencia'
  return reales.reduce((a, b) => (GRAVEDAD[b] > GRAVEDAD[a] ? b : a))
}

/**
 * Clasifica una medición completa contra los rangos del perfil.
 * Presión: se evalúan sistólica y diastólica y manda la peor de las dos.
 * Glucosa: el intervalo depende del contexto (ayunas / después de comer).
 */
export function clasificar(m: Medicion, r: RangosObjetivo | null | undefined): Clasificacion {
  if (!r) return 'sin-referencia'

  if (m.tipo === 'presion') {
    if (!r.presion) return 'sin-referencia'
    const { sistolica, diastolica } = m.valores
    const cSis =
      typeof sistolica === 'number'
        ? clasificarValor(sistolica, r.presion.sisMin, r.presion.sisMax)
        : 'sin-referencia'
    const cDia =
      typeof diastolica === 'number'
        ? clasificarValor(diastolica, r.presion.diaMin, r.presion.diaMax)
        : 'sin-referencia'
    return peor(cSis, cDia)
  }

  if (m.tipo === 'glucosa') {
    if (!r.glucosa) return 'sin-referencia'
    const { glucosa, contexto } = m.valores
    if (typeof glucosa !== 'number') return 'sin-referencia'
    // Sin contexto declarado se usa el intervalo de ayunas, que es el más
    // estrecho: nunca se marca "en rango" un valor que quizá no lo esté.
    return contexto === 'postprandial'
      ? clasificarValor(glucosa, r.glucosa.postMin, r.glucosa.postMax)
      : clasificarValor(glucosa, r.glucosa.ayunasMin, r.glucosa.ayunasMax)
  }

  if (!r.peso) return 'sin-referencia'
  const { peso } = m.valores
  if (typeof peso !== 'number') return 'sin-referencia'
  return clasificarValor(peso, r.peso.min, r.peso.max)
}

/* --- Cómo se dice cada clasificación en pantalla ------------------------- */

/** Nunca se comunica un estado SOLO por color. Este es el texto. */
export function etiquetaClasificacion(c: Clasificacion): string {
  switch (c) {
    case 'en-rango':
      return 'Dentro de tu rango'
    case 'atencion':
      return 'Cerca del límite'
    case 'fuera-de-rango':
      return 'Fuera de tu rango'
    default:
      return 'Sin rango de referencia'
  }
}

/**
 * Mensaje de acompañamiento. Nunca dice "peligro" ni "emergencia" ni indica
 * un tratamiento: remite al médico.
 */
export function mensajeClasificacion(c: Clasificacion): string {
  switch (c) {
    case 'en-rango':
      return 'Este valor está dentro del rango que registraste.'
    case 'atencion':
      return 'Este valor está cerca del límite que registraste. Coméntalo en tu próxima consulta.'
    case 'fuera-de-rango':
      return 'Este valor está fuera del rango que registraste. Consulta con tu médico.'
    default:
      return 'Guardamos tu medición. Como no hay rangos de tu médico, Pulso no la clasifica.'
  }
}

/* --- Presentación del valor --------------------------------------------- */

export const UNIDADES: Record<Medicion['tipo'], string> = {
  presion: 'mmHg',
  glucosa: 'mg/dL',
  peso: 'lb',
}

export const NOMBRE_TIPO: Record<Medicion['tipo'], string> = {
  presion: 'Presión arterial',
  glucosa: 'Glucosa',
  peso: 'Peso',
}

/** El número grande que se enseña en la tarjeta, sin unidad. */
export function valorPrincipal(m: Medicion): string {
  if (m.tipo === 'presion') {
    return `${m.valores.sistolica ?? '—'}/${m.valores.diastolica ?? '—'}`
  }
  if (m.tipo === 'glucosa') return `${m.valores.glucosa ?? '—'}`
  return `${m.valores.peso ?? '—'}`
}

/** Número único para graficar y promediar (en presión, la sistólica). */
export function valorNumerico(m: Medicion): number | null {
  if (m.tipo === 'presion') return m.valores.sistolica ?? null
  if (m.tipo === 'glucosa') return m.valores.glucosa ?? null
  return m.valores.peso ?? null
}

/** Límites de plausibilidad para el aviso suave del formulario. */
export const LIMITES_PLAUSIBLES = {
  sistolica: { min: 70, max: 250 },
  diastolica: { min: 40, max: 150 },
  pulso: { min: 30, max: 200 },
  glucosa: { min: 20, max: 600 },
  peso: { min: 40, max: 700 },
} as const
