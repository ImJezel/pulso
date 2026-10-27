/* La capa remota se prueba sin red: la traducción estado ⇄ filas y el cálculo
   de cambios son funciones puras. Si estas pruebas pasan, lo único que queda
   por probar contra Supabase es que Postgres guarde lo que se le manda
   (tests/integracion/). */

import { describe, expect, it } from 'vitest'
import { aFilas, calcularCambios, desdeFilas, hayCambios, igual } from '../src/lib/remoto'
import { generarDatosDemo } from '../src/lib/demo'
import { reducer } from '../src/context/AppContext'
import { ESTADO_INICIAL } from '../src/lib/storage'
import type { EstadoPulso } from '../src/types'

const UID = '00000000-0000-4000-8000-000000000001'
const DIA = new Date('2026-08-19T10:00:00')

/** El orden de las listas puede variar entre cliente y servidor; el contenido no. */
const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id))
const ordenado = (e: EstadoPulso) => ({
  ...e,
  medicamentos: porId(e.medicamentos),
  registrosDosis: porId(e.registrosDosis),
  mediciones: porId(e.mediciones),
  citas: porId(e.citas),
})

describe('aFilas / desdeFilas', () => {
  it('el caso de demostración va y vuelve sin perder nada', () => {
    const demo = generarDatosDemo(DIA)
    expect(ordenado(desdeFilas(aFilas(demo, UID)))).toEqual(ordenado(demo))
  })

  it('todas las filas llevan el id del usuario dueño', () => {
    const f = aFilas(generarDatosDemo(DIA), UID)
    const todas = [f.perfil, f.rangos, f.preferencias, ...f.condiciones, ...f.medicamentos,
      ...f.horarios, ...f.registros, ...f.mediciones, ...f.citas]
    expect(todas.every((x) => x?.id_perfil === UID)).toBe(true)
  })

  it('lee las horas como las devuelve Postgres (hh:mm:ss) y las deja en hh:mm', () => {
    const f = aFilas(generarDatosDemo(DIA), UID)
    f.horarios = f.horarios.map((h) => ({ ...h, hora: `${h.hora}:00` }))
    const e = desdeFilas(f)
    expect(e.medicamentos.flatMap((m) => m.horarios).every((h) => /^\d\d:\d\d$/.test(h))).toBe(true)
  })

  it('una hora repetida no genera dos filas (violaría la clave primaria)', () => {
    const demo = generarDatosDemo(DIA)
    const m = { ...demo.medicamentos[0], horarios: ['08:00', '08:00', '20:00'] }
    const f = aFilas({ ...demo, medicamentos: [m] }, UID)
    expect(f.horarios.map((h) => h.hora)).toEqual(['08:00', '20:00'])
  })

  it('sin perfil no hay filas de perfil, rangos ni condiciones', () => {
    const f = aFilas(ESTADO_INICIAL, UID)
    expect(f.perfil).toBeNull()
    expect(f.rangos).toBeNull()
    expect(f.condiciones).toEqual([])
    expect(f.preferencias?.escala_texto).toBe('normal')
  })

  it('un rango a medias vuelve como "sin rango", no como un rango inventado', () => {
    const f = aFilas(generarDatosDemo(DIA), UID)
    f.rangos = { ...f.rangos!, sis_max: null }
    expect(desdeFilas(f).perfil?.rangosObjetivo.presion).toBeNull()
  })
})

describe('igual', () => {
  it('no le importa el orden de las claves', () => {
    expect(igual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
  })
  it('ignora propiedades undefined, igual que JSON', () => {
    expect(igual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })
  it('sí distingue valores distintos', () => {
    expect(igual({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
  })
})

describe('calcularCambios', () => {
  const demo = generarDatosDemo(DIA)

  it('sin base conocida sube todo y no borra nada', () => {
    const c = calcularCambios(null, demo)
    expect(c.perfil).toBe('guardar')
    expect(c.preferencias).toBe(true)
    expect(c.medicamentos.guardar).toHaveLength(demo.medicamentos.length)
    expect(c.registros.guardar).toHaveLength(demo.registrosDosis.length)
    expect(c.medicamentos.borrar).toEqual([])
    expect(c.registros.borrar).toEqual([])
  })

  it('si nada cambió no hay nada que mandar', () => {
    expect(hayCambios(calcularCambios(demo, structuredClone(demo)))).toBe(false)
  })

  it('marcar una dosis manda solo esa dosis', () => {
    const id = demo.registrosDosis[0].id
    const c = calcularCambios(demo, reducer(demo, { tipo: 'MARCAR_DOSIS', id, estado: 'omitida' }))
    expect(c.registros.guardar.map((r) => r.id)).toEqual([id])
    expect(c.perfil).toBeNull()
    expect(c.medicamentos.guardar).toEqual([])
    expect(c.mediciones.guardar).toEqual([])
  })

  it('eliminar un medicamento lo borra junto con sus dosis', () => {
    const med = demo.medicamentos[0]
    const c = calcularCambios(demo, reducer(demo, { tipo: 'ELIMINAR_MEDICAMENTO', id: med.id }))
    expect(c.medicamentos.borrar).toEqual([med.id])
    const propias = demo.registrosDosis.filter((r) => r.medicamentoId === med.id).length
    expect(c.registros.borrar).toHaveLength(propias)
  })

  it('cambiar el perfil o los rangos marca el perfil para guardar', () => {
    const otro = { ...demo, perfil: { ...demo.perfil!, nombre: 'María F.' } }
    expect(calcularCambios(demo, otro).perfil).toBe('guardar')
    expect(calcularCambios(demo, { ...demo, datosDemo: false }).perfil).toBe('guardar')
  })

  it('borrar todo borra el perfil pero no toca las preferencias', () => {
    const c = calcularCambios(demo, reducer(demo, { tipo: 'BORRAR_TODO' }))
    expect(c.perfil).toBe('borrar')
    expect(c.preferencias).toBe(false)
    expect(c.medicamentos.borrar).toHaveLength(demo.medicamentos.length)
  })

  it('sin base y sin perfil no se borra el perfil del servidor', () => {
    expect(calcularCambios(null, ESTADO_INICIAL).perfil).toBeNull()
  })

  it('deshacer (volver al estado anterior) revierte exactamente lo hecho', () => {
    const id = demo.mediciones[0].id
    const sin = reducer(demo, { tipo: 'ELIMINAR_MEDICION', id })
    const c = calcularCambios(sin, demo)
    expect(c.mediciones.guardar.map((m) => m.id)).toEqual([id])
    expect(c.mediciones.borrar).toEqual([])
  })
})
