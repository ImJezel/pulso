/* La adherencia es el número que el médico va a mirar primero en el informe.
   La regla que más fácil se rompe es la de las dosis futuras: si entran en el
   denominador, a las 8 de la mañana la app dice que el paciente cumple un 33 %. */

import { describe, expect, it } from 'vitest'
import {
  calcularAdherencia,
  dosisProgramadasDelDia,
  etiquetaAdherencia,
  fechaHoraDosis,
  idDosis,
  marcasDelDia,
  sincronizarDosis,
} from '../src/lib/adherencia'
import type { Medicamento, RegistroDosis } from '../src/types'

const MED: Medicamento = {
  id: 'm1',
  nombre: 'Losartán',
  dosis: '50 mg',
  horarios: ['08:00', '20:00'],
  instruccion: '',
  activo: true,
  creadoEn: '2026-08-01T00:00:00',
}

const registro = (hora: string, estado: RegistroDosis['estado']): RegistroDosis => ({
  id: idDosis('m1', `2026-08-19T${hora}:00`),
  medicamentoId: 'm1',
  fechaHoraProgramada: `2026-08-19T${hora}:00`,
  estado,
  registradoEn: estado === 'pendiente' ? null : `2026-08-19T${hora}:00`,
})

const DESDE = new Date('2026-08-19T00:00:00')
const HASTA = new Date('2026-08-19T23:59:59')

describe('calcularAdherencia', () => {
  it('cuenta tomadas sobre programadas', () => {
    const r = calcularAdherencia(
      [registro('08:00', 'tomada'), registro('20:00', 'omitida')],
      DESDE,
      HASTA,
      new Date('2026-08-19T23:00:00'),
    )
    expect(r.programadas).toBe(2)
    expect(r.tomadas).toBe(1)
    expect(r.porcentaje).toBe(50)
  })

  it('NO cuenta las dosis futuras del día en curso', () => {
    // Son las 9 de la mañana: la toma de las 8 ya pasó, la de las 8 pm no.
    const r = calcularAdherencia(
      [registro('08:00', 'tomada'), registro('20:00', 'pendiente')],
      DESDE,
      HASTA,
      new Date('2026-08-19T09:00:00'),
    )
    expect(r.programadas).toBe(1)
    expect(r.porcentaje).toBe(100)
  })

  it('una dosis pasada sin marcar sí cuenta en el denominador', () => {
    const r = calcularAdherencia(
      [registro('08:00', 'tomada'), registro('20:00', 'pendiente')],
      DESDE,
      HASTA,
      new Date('2026-08-19T22:00:00'),
    )
    expect(r.programadas).toBe(2)
    expect(r.pendientes).toBe(1)
    expect(r.porcentaje).toBe(50)
  })

  it('sin dosis programadas devuelve null, no 0 %', () => {
    expect(calcularAdherencia([], DESDE, HASTA).porcentaje).toBeNull()
    expect(etiquetaAdherencia(null)).toMatch(/Sin dosis/)
  })

  it('ignora lo que cae fuera del período', () => {
    const fuera: RegistroDosis = {
      id: 'z',
      medicamentoId: 'm1',
      fechaHoraProgramada: '2026-07-01T08:00:00',
      estado: 'omitida',
      registradoEn: null,
    }
    const r = calcularAdherencia(
      [registro('08:00', 'tomada'), fuera],
      DESDE,
      HASTA,
      new Date('2026-08-19T23:00:00'),
    )
    expect(r.programadas).toBe(1)
    expect(r.porcentaje).toBe(100)
  })
})

describe('sincronizarDosis', () => {
  it('crea las dosis que faltan sin pisar las ya marcadas', () => {
    const yaMarcada = registro('08:00', 'tomada')
    const salida = sincronizarDosis([MED], [yaMarcada], new Date('2026-08-19T12:00:00'), 1)
    // 2 días × 2 horarios = 4 registros; el que ya existía conserva su estado.
    expect(salida).toHaveLength(4)
    expect(salida.find((r) => r.id === yaMarcada.id)?.estado).toBe('tomada')
  })

  it('no crea dosis anteriores a la fecha en que se agregó el medicamento', () => {
    const nuevo: Medicamento = { ...MED, id: 'm2', creadoEn: '2026-08-19T00:00:00' }
    const salida = sincronizarDosis([nuevo], [], new Date('2026-08-19T12:00:00'), 5)
    expect(salida).toHaveLength(2)
  })

  it('no programa nada para un medicamento desactivado', () => {
    const salida = sincronizarDosis([{ ...MED, activo: false }], [], new Date('2026-08-19T12:00:00'), 1)
    expect(salida).toHaveLength(0)
  })
})

describe('cinta del día', () => {
  it('ordena las marcas por hora y detecta las vencidas', () => {
    const marcas = marcasDelDia(
      [MED],
      [registro('20:00', 'pendiente'), registro('08:00', 'pendiente')],
      new Date('2026-08-19T12:00:00'),
      new Date('2026-08-19T12:00:00'),
    )
    expect(marcas.map((m) => m.registro.fechaHoraProgramada.slice(11, 16))).toEqual([
      '08:00',
      '20:00',
    ])
    expect(marcas[0].vencida).toBe(true) // las 8 am ya pasaron
    expect(marcas[1].vencida).toBe(false) // las 8 pm no
  })
})

describe('utilidades', () => {
  it('dosisProgramadasDelDia arma una entrada por horario', () => {
    expect(dosisProgramadasDelDia([MED], new Date('2026-08-19T00:00:00'))).toHaveLength(2)
  })

  it('fechaHoraDosis compone la fecha ISO local del día y la hora', () => {
    expect(fechaHoraDosis(new Date('2026-08-19T15:22:00'), '08:00')).toBe('2026-08-19T08:00:00')
  })
})
