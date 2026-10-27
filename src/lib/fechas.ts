/* ============================================================================
   Pulso — Fechas en español dominicano
   ----------------------------------------------------------------------------
   Todo formato de fecha del proyecto pasa por aquí. Formato dominicano
   dd/mm/aaaa, meses y días en español, hora con a. m. / p. m.
   Las fechas se guardan SIEMPRE como ISO local sin zona ("2026-08-19T08:00:00")
   para que una medición tomada a las 8:00 de la mañana no se mueva de día al
   cambiar de zona horaria.
   ========================================================================== */

import { format, formatDistanceToNowStrict, differenceInYears, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

export const aFecha = (valor: string | Date): Date =>
  valor instanceof Date ? valor : new Date(valor)

/** ISO local sin zona: lo que guardamos. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:00`
}

/** Clave de día 'aaaa-mm-dd', para agrupar. */
export function claveDia(d: Date): string {
  return isoLocal(d).slice(0, 10)
}

export function inicioDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function finDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function sumarDias(d: Date, dias: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + dias)
  return x
}

/** "Martes 19 de agosto" — el saludo de la pantalla Hoy. */
export function fechaLarga(d: Date | string): string {
  const t = format(aFecha(d), "EEEE d 'de' MMMM", { locale: es })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "19/08/2026" */
export function fechaCorta(d: Date | string): string {
  return format(aFecha(d), 'dd/MM/yyyy', { locale: es })
}

/**
 * "8:00 a. m."
 * Corrección H-09: con el token `a`, date-fns devuelve "AM"/"PM" aunque el
 * locale sea español. El token `aaaa` sí traduce, y el reemplazo final deja
 * el espacio fino que pide la RAE ("a. m.", no "a.m.").
 */
export function hora(d: Date | string): string {
  return format(aFecha(d), 'h:mm aaaa', { locale: es }).replace(/\.(m\.)$/, '. $1')
}

/** Convierte "08:00" (horario de un medicamento) a "8:00 a. m." */
export function horaTexto(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return hora(d)
}

/** "19/08/2026, 8:00 a. m." */
export function fechaHoraCorta(d: Date | string): string {
  return `${fechaCorta(d)}, ${hora(d)}`
}

/** Para el input datetime-local, que exige "aaaa-mm-ddThh:mm". */
export function paraInput(d: Date): string {
  return isoLocal(d).slice(0, 16)
}

/** "hace 2 días", "en 3 días" — con hoy, ayer y mañana resueltos a mano. */
export function relativo(d: Date | string): string {
  const fecha = aFecha(d)
  const hoy = new Date()
  if (isSameDay(fecha, hoy)) return 'hoy'
  if (isSameDay(fecha, sumarDias(hoy, -1))) return 'ayer'
  if (isSameDay(fecha, sumarDias(hoy, 1))) return 'mañana'
  const distancia = formatDistanceToNowStrict(fecha, { locale: es })
  return fecha > hoy ? `en ${distancia}` : `hace ${distancia}`
}

export function edad(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null
  const d = new Date(`${fechaNacimiento}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const anios = differenceInYears(new Date(), d)
  return anios >= 0 && anios < 130 ? anios : null
}
