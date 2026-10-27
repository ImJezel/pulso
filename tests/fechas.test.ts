/* Formato dominicano y, sobre todo, la trampa de las zonas horarias: una
   medición de las 8:00 de la mañana no puede cambiar de día al guardarse. */

import { describe, expect, it } from 'vitest'
import {
  claveDia,
  edad,
  fechaCorta,
  fechaLarga,
  hora,
  horaTexto,
  isoLocal,
  paraInput,
  sumarDias,
} from '../src/lib/fechas'
import { citaComoICS } from '../src/lib/ics'
import type { Cita } from '../src/types'

describe('isoLocal', () => {
  it('guarda la hora local sin zona, sin desplazar el día', () => {
    expect(isoLocal(new Date(2026, 7, 19, 8, 0, 0))).toBe('2026-08-19T08:00:00')
  })

  it('rellena con ceros los meses, días y horas de una cifra', () => {
    expect(isoLocal(new Date(2026, 0, 5, 9, 7, 0))).toBe('2026-01-05T09:07:00')
  })

  it('claveDia y paraInput recortan lo que corresponde', () => {
    const d = new Date(2026, 7, 19, 8, 30, 0)
    expect(claveDia(d)).toBe('2026-08-19')
    expect(paraInput(d)).toBe('2026-08-19T08:30')
  })
})

describe('formatos en español dominicano', () => {
  it('la fecha corta es dd/mm/aaaa', () => {
    expect(fechaCorta(new Date(2026, 7, 19, 8, 0))).toBe('19/08/2026')
  })

  it('la fecha larga empieza en mayúscula y va en español', () => {
    const t = fechaLarga(new Date(2026, 7, 19, 8, 0))
    expect(t).toMatch(/^Miércoles 19 de agosto$/)
  })

  /* Corrección H-09: date-fns devuelve "AM"/"PM" con el token `a` aunque el
     locale sea español. Esta prueba impide que vuelva a colarse el inglés. */
  it('la hora va en español, con a. m. y p. m.', () => {
    expect(hora(new Date(2026, 7, 19, 8, 0))).toBe('8:00 a. m.')
    expect(hora(new Date(2026, 7, 19, 20, 30))).toBe('8:30 p. m.')
    expect(horaTexto('07:05')).toBe('7:05 a. m.')
  })
})

describe('sumarDias', () => {
  it('cruza el cambio de mes correctamente', () => {
    expect(claveDia(sumarDias(new Date(2026, 7, 30, 12, 0), 3))).toBe('2026-09-02')
  })
})

describe('edad', () => {
  it('devuelve null si no hay fecha o si no es válida', () => {
    expect(edad('')).toBeNull()
    expect(edad('no-es-fecha')).toBeNull()
  })

  it('calcula años cumplidos', () => {
    const hace60 = new Date()
    hace60.setFullYear(hace60.getFullYear() - 60)
    expect(edad(claveDia(hace60))).toBe(60)
  })
})

describe('citaComoICS', () => {
  const cita: Cita = {
    id: 'cita_1',
    medico: 'Dra. Carmen Peña',
    especialidad: 'Cardiología',
    fechaHora: '2026-08-28T10:30:00',
    lugar: 'Centro de Salud, consultorio 4',
    motivo: 'Control de presión, llevar informe',
  }

  it('produce un iCalendar con la estructura mínima que exige el estándar', () => {
    const ics = citaComoICS(cita)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('UID:cita_1@pulso.local')
    expect(ics.split('\r\n').length).toBeGreaterThan(10)
  })

  it('escapa las comas, que en iCalendar separan valores', () => {
    expect(citaComoICS(cita)).toContain('Control de presión\\, llevar informe')
  })
})
