/* ============================================================================
   Pulso — Archivo .ics para "Agregar al calendario"
   ----------------------------------------------------------------------------
   El estándar iCalendar (RFC 5545) lo entienden Google Calendar, el calendario
   de Android y el de iPhone. Son 30 líneas de texto plano: no hace falta una
   librería, y así la app sigue funcionando sin conexión.
   ========================================================================== */

import type { Cita } from '../types'

/** Formato UTC compacto que exige el estándar: 20260828T143000Z */
function marcaUTC(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** Escapa los caracteres con significado propio dentro de un campo iCalendar. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Las líneas de más de 75 octetos se doblan con un espacio al inicio. */
function doblar(linea: string): string {
  if (linea.length <= 73) return linea
  const partes: string[] = [linea.slice(0, 73)]
  let resto = linea.slice(73)
  while (resto.length > 72) {
    partes.push(` ${resto.slice(0, 72)}`)
    resto = resto.slice(72)
  }
  partes.push(` ${resto}`)
  return partes.join('\r\n')
}

export function citaComoICS(cita: Cita, duracionMinutos = 45): string {
  const inicio = new Date(cita.fechaHora)
  const fin = new Date(inicio.getTime() + duracionMinutos * 60000)
  const titulo = `Cita: ${cita.especialidad} — ${cita.medico}`
  const descripcion = [cita.motivo, 'Recuerda llevar el informe de Pulso.']
    .filter(Boolean)
    .join(' ')

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulso//Control de tratamiento//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${cita.id}@pulso.local`,
    `DTSTAMP:${marcaUTC(new Date())}`,
    `DTSTART:${marcaUTC(inicio)}`,
    `DTEND:${marcaUTC(fin)}`,
    doblar(`SUMMARY:${escapar(titulo)}`),
    doblar(`DESCRIPTION:${escapar(descripcion)}`),
    doblar(`LOCATION:${escapar(cita.lugar)}`),
    'BEGIN:VALARM',
    'TRIGGER:-PT1440M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de cita médica',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lineas.join('\r\n')
}

/** Dispara la descarga del archivo en el navegador. */
export function descargarICS(cita: Cita): void {
  const blob = new Blob([citaComoICS(cita)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cita-${cita.especialidad.toLowerCase().replace(/\s+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
