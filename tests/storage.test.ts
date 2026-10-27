/* storage.ts es la única puerta a los datos del paciente. Lo que se prueba
   aquí no es "guarda y lee" (eso es obvio): es que un JSON corrupto o un
   estado viejo no dejen la aplicación inservible. */

import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE, cargar, guardar, borrarTodo, normalizar, nuevoId, ESTADO_INICIAL } from '../src/lib/storage'
import { generarDatosDemo } from '../src/lib/demo'
import { reducer } from '../src/context/AppContext'

beforeEach(() => {
  localStorage.clear()
})

describe('cargar / guardar', () => {
  it('sin nada guardado devuelve el estado inicial', () => {
    expect(cargar()).toEqual(ESTADO_INICIAL)
  })

  it('lo que se guarda es lo que se lee', () => {
    const estado = { ...ESTADO_INICIAL, datosDemo: true }
    expect(guardar(estado).ok).toBe(true)
    expect(cargar().datosDemo).toBe(true)
  })

  it('con un JSON corrupto no revienta: arranca limpio y conserva la copia rota', () => {
    localStorage.setItem(CLAVE, '{ esto no es json')
    expect(cargar()).toEqual(ESTADO_INICIAL)
    const copias = Object.keys(localStorage).filter((k) => k.includes('corrupto'))
    expect(copias.length).toBe(1)
  })

  it('borrarTodo deja el almacenamiento sin la clave de Pulso', () => {
    guardar(ESTADO_INICIAL)
    borrarTodo()
    expect(localStorage.getItem(CLAVE)).toBeNull()
  })
})

describe('normalizar', () => {
  it('rellena lo que falte en un estado a medias', () => {
    const salida = normalizar({ perfil: null, medicamentos: [{ id: 'a' }] })
    expect(salida.mediciones).toEqual([])
    expect(salida.citas).toEqual([])
    expect(salida.preferencias.escalaTexto).toBe('normal')
  })

  it('con basura devuelve el estado inicial', () => {
    expect(normalizar('nada')).toEqual(ESTADO_INICIAL)
    expect(normalizar(null)).toEqual(ESTADO_INICIAL)
  })
})

describe('nuevoId', () => {
  it('no repite identificadores', () => {
    const ids = new Set(Array.from({ length: 200 }, () => nuevoId('med')))
    expect(ids.size).toBe(200)
  })
})

describe('reducer', () => {
  it('eliminar un medicamento se lleva también sus registros de dosis', () => {
    const demo = generarDatosDemo()
    const id = demo.medicamentos[0].id
    expect(demo.registrosDosis.some((r) => r.medicamentoId === id)).toBe(true)

    const salida = reducer(demo, { tipo: 'ELIMINAR_MEDICAMENTO', id })
    expect(salida.medicamentos.some((m) => m.id === id)).toBe(false)
    expect(salida.registrosDosis.some((r) => r.medicamentoId === id)).toBe(false)
  })

  it('borrar todo conserva las preferencias de accesibilidad', () => {
    const conPreferencias = {
      ...ESTADO_INICIAL,
      preferencias: { escalaTexto: 'muy-grande' as const, altoContraste: true, modoSimple: false },
    }
    const salida = reducer(conPreferencias, { tipo: 'BORRAR_TODO' })
    expect(salida.perfil).toBeNull()
    expect(salida.preferencias.escalaTexto).toBe('muy-grande')
    expect(salida.preferencias.altoContraste).toBe(true)
  })

  it('marcar una dosis deja constancia de cuándo se registró', () => {
    const demo = generarDatosDemo()
    const id = demo.registrosDosis[0].id
    const salida = reducer(demo, { tipo: 'MARCAR_DOSIS', id, estado: 'tomada' })
    const r = salida.registrosDosis.find((x) => x.id === id)!
    expect(r.estado).toBe('tomada')
    expect(r.registradoEn).not.toBeNull()
  })
})

describe('datos de demostración', () => {
  it('genera un caso completo y rotulado como ficticio', () => {
    const demo = generarDatosDemo()
    expect(demo.datosDemo).toBe(true)
    expect(demo.perfil?.nombre).toBe('María Fernández')
    expect(demo.medicamentos).toHaveLength(3)
    expect(demo.citas).toHaveLength(3)
    expect(demo.mediciones.length).toBeGreaterThan(40)
  })

  it('es determinista: dos generaciones del mismo día dan lo mismo', () => {
    const dia = new Date('2026-08-19T10:00:00')
    expect(generarDatosDemo(dia).mediciones).toEqual(generarDatosDemo(dia).mediciones)
  })
})
