/* Pruebas de la lógica clínica. Es la parte del código donde un error no se
   ve raro en pantalla: simplemente clasifica mal un dato de salud. */

import { describe, expect, it } from 'vitest'
import { clasificar, clasificarValor, peor, valorPrincipal } from '../src/lib/rangos'
import type { Medicion, RangosObjetivo } from '../src/types'

const RANGOS: RangosObjetivo = {
  presion: { sisMin: 100, sisMax: 130, diaMin: 60, diaMax: 85 },
  glucosa: { ayunasMin: 70, ayunasMax: 110, postMin: 70, postMax: 160 },
  peso: { min: 130, max: 160 },
}

const presion = (sistolica: number, diastolica: number): Medicion => ({
  id: 'x',
  tipo: 'presion',
  fechaHora: '2026-08-19T08:00:00',
  valores: { sistolica, diastolica },
  nota: '',
})

describe('clasificarValor', () => {
  it('lo que cae dentro del intervalo está en rango, incluidos los extremos', () => {
    expect(clasificarValor(120, 100, 130)).toBe('en-rango')
    expect(clasificarValor(100, 100, 130)).toBe('en-rango')
    expect(clasificarValor(130, 100, 130)).toBe('en-rango')
  })

  it('hasta 10 % por encima del máximo es atención, más allá es fuera de rango', () => {
    expect(clasificarValor(143, 100, 130)).toBe('atencion') // 130 + 10 % = 143
    expect(clasificarValor(144, 100, 130)).toBe('fuera-de-rango')
  })

  it('hasta 10 % por debajo del mínimo es atención, más allá es fuera de rango', () => {
    expect(clasificarValor(90, 100, 130)).toBe('atencion') // 100 − 10 % = 90
    expect(clasificarValor(89, 100, 130)).toBe('fuera-de-rango')
  })
})

describe('peor', () => {
  it('se queda con la clasificación más seria', () => {
    expect(peor('en-rango', 'atencion')).toBe('atencion')
    expect(peor('atencion', 'fuera-de-rango')).toBe('fuera-de-rango')
  })

  it('ignora las que no tienen referencia, salvo que no haya ninguna otra', () => {
    expect(peor('sin-referencia', 'en-rango')).toBe('en-rango')
    expect(peor('sin-referencia', 'sin-referencia')).toBe('sin-referencia')
  })
})

describe('clasificar', () => {
  it('en presión manda la peor de las dos cifras', () => {
    // 120 está en rango, pero 95 de diastólica se pasa de 85 más de un 10 %.
    expect(clasificar(presion(120, 95), RANGOS)).toBe('fuera-de-rango')
  })

  it('sin rangos definidos devuelve sin-referencia y no inventa nada', () => {
    expect(clasificar(presion(190, 120), null)).toBe('sin-referencia')
    expect(clasificar(presion(190, 120), { presion: null, glucosa: null, peso: null })).toBe(
      'sin-referencia',
    )
  })

  it('la glucosa usa el intervalo del contexto declarado', () => {
    const base = { id: 'g', tipo: 'glucosa' as const, fechaHora: '2026-08-19T13:00:00', nota: '' }
    // 150 se sale de ayunas (70–110) pero está dentro de después de comer (70–160).
    expect(clasificar({ ...base, valores: { glucosa: 150, contexto: 'ayunas' } }, RANGOS)).toBe(
      'fuera-de-rango',
    )
    expect(
      clasificar({ ...base, valores: { glucosa: 150, contexto: 'postprandial' } }, RANGOS),
    ).toBe('en-rango')
  })

  it('sin contexto usa el intervalo de ayunas, que es el más estricto', () => {
    const m: Medicion = {
      id: 'g2',
      tipo: 'glucosa',
      fechaHora: '2026-08-19T13:00:00',
      valores: { glucosa: 150 },
      nota: '',
    }
    expect(clasificar(m, RANGOS)).toBe('fuera-de-rango')
  })
})

describe('valorPrincipal', () => {
  it('la presión se muestra como sistólica/diastólica', () => {
    expect(valorPrincipal(presion(145, 92))).toBe('145/92')
  })
})
