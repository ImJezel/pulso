/* El motor de sincronización se prueba con Supabase simulado: lo que importa
   aquí no es la red (eso lo cubre tests/integracion/), sino el ORDEN de las
   cosas, que es donde se pierden datos si algo está mal:
     · al abrir, primero se sube lo pendiente y después se trae lo del servidor;
     · sin internet, lo del servidor nunca pisa lo hecho sin conexión;
     · un cambio que llega mientras otro se está enviando no se pierde. */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { EstadoPulso } from '../src/types'

vi.mock('../src/lib/supabase', () => ({ supabase: {}, supabaseConfigurado: true }))
vi.mock('../src/lib/remoto', async (original) => ({
  ...(await original<typeof import('../src/lib/remoto')>()),
  aplicarCambios: vi.fn(),
  cargarRemoto: vi.fn(),
}))

import { aplicarCambios, cargarRemoto, ErrorRemoto } from '../src/lib/remoto'
import { useSincronizacion } from '../src/context/useSincronizacion'
import { generarDatosDemo } from '../src/lib/demo'
import { reducer } from '../src/context/AppContext'
import { cargarConfirmado, guardarConfirmado } from '../src/lib/storage'

const UID = 'usuario-de-prueba'
const enviarMock = vi.mocked(aplicarCambios)
const cargarMock = vi.mocked(cargarRemoto)
const demo = generarDatosDemo(new Date('2026-08-19T10:00:00'))
const sinRed = () => new ErrorRemoto('Failed to fetch', true)

function montar(estadoInicial: EstadoPulso) {
  const reemplazar = vi.fn()
  const vista = renderHook(({ estado }) => useSincronizacion(UID, estado, reemplazar), {
    initialProps: { estado: estadoInicial },
  })
  return { ...vista, reemplazar }
}

beforeEach(() => {
  localStorage.clear()
  enviarMock.mockReset().mockResolvedValue(undefined)
  cargarMock.mockReset().mockResolvedValue(demo)
})

describe('arranque', () => {
  it('trae lo del servidor, lo usa como base y queda al día', async () => {
    const { result, reemplazar } = montar(demo)
    expect(result.current.estado).toBe('cargando')
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))
    expect(reemplazar).toHaveBeenCalledWith(demo)
    expect(cargarConfirmado(UID)).toEqual(demo)
    expect(enviarMock).not.toHaveBeenCalled()
  })

  it('primera vez en el dispositivo y sin internet: no muestra una app vacía', async () => {
    cargarMock.mockRejectedValue(sinRed())
    const { result, reemplazar } = montar(demo)
    await waitFor(() => expect(result.current.estado).toBe('sin-conexion'))
    expect(reemplazar).not.toHaveBeenCalled()
  })

  it('con cambios pendientes, los sube ANTES de traer lo del servidor', async () => {
    guardarConfirmado(UID, demo)
    const local = reducer(demo, { tipo: 'ELIMINAR_MEDICION', id: demo.mediciones[0].id })
    const orden: string[] = []
    enviarMock.mockImplementation(async () => void orden.push('subir'))
    cargarMock.mockImplementation(async () => {
      orden.push('traer')
      return local
    })

    const { result } = montar(local)
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))
    expect(orden).toEqual(['subir', 'traer'])
    expect(enviarMock.mock.calls[0][3].mediciones.borrar).toEqual([demo.mediciones[0].id])
  })

  it('con cambios pendientes y sin internet, NO trae lo del servidor (lo pisaría)', async () => {
    guardarConfirmado(UID, demo)
    const local = reducer(demo, { tipo: 'ELIMINAR_MEDICION', id: demo.mediciones[0].id })
    enviarMock.mockRejectedValue(sinRed())

    const { result, reemplazar } = montar(local)
    await waitFor(() => expect(result.current.estado).toBe('pendiente'))
    expect(cargarMock).not.toHaveBeenCalled()
    expect(reemplazar).not.toHaveBeenCalled()
    // La base sigue siendo la vieja: el próximo intento incluirá el cambio.
    expect(cargarConfirmado(UID)).toEqual(demo)
  })
})

describe('después de abrir', () => {
  it('un cambio se envía solo, y solo la diferencia', async () => {
    const { result, rerender } = montar(demo)
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))

    const id = demo.registrosDosis[0].id
    const nuevo = reducer(demo, { tipo: 'MARCAR_DOSIS', id, estado: 'omitida' })
    rerender({ estado: nuevo })

    await waitFor(() => expect(enviarMock).toHaveBeenCalledTimes(1))
    const cambios = enviarMock.mock.calls[0][3]
    expect(cambios.registros.guardar.map((r) => r.id)).toEqual([id])
    expect(cambios.medicamentos.guardar).toEqual([])
    await waitFor(() => expect(cargarConfirmado(UID)).toEqual(nuevo))
  })

  it('un cambio que llega durante un envío se manda después, sin perderse', async () => {
    const { result, rerender } = montar(demo)
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))

    let soltar!: () => void
    enviarMock.mockImplementationOnce(() => new Promise<void>((r) => (soltar = r)))

    const paso1 = reducer(demo, { tipo: 'MARCAR_DOSIS', id: demo.registrosDosis[0].id, estado: 'tomada' })
    rerender({ estado: paso1 })
    await waitFor(() => expect(enviarMock).toHaveBeenCalledTimes(1))

    const paso2 = reducer(paso1, { tipo: 'ELIMINAR_CITA', id: demo.citas[0].id })
    rerender({ estado: paso2 })
    // Mientras el primer envío está en vuelo, el segundo espera.
    await act(() => new Promise((r) => setTimeout(r, 600)))
    expect(enviarMock).toHaveBeenCalledTimes(1)

    await act(async () => soltar())
    await waitFor(() => expect(enviarMock).toHaveBeenCalledTimes(2))
    expect(enviarMock.mock.calls[1][3].citas.borrar).toEqual([demo.citas[0].id])
    await waitFor(() => expect(cargarConfirmado(UID)).toEqual(paso2))
  })

  it('si el servidor rechaza un cambio, avisa con el detalle y no avanza la base', async () => {
    const { result, rerender } = montar(demo)
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))

    enviarMock.mockRejectedValue(new ErrorRemoto('dosis: violates check constraint', false))
    rerender({ estado: reducer(demo, { tipo: 'ELIMINAR_CITA', id: demo.citas[0].id }) })

    await waitFor(() => expect(result.current.estado).toBe('error'))
    expect(result.current.detalle).toContain('check constraint')
    expect(cargarConfirmado(UID)).toEqual(demo)
  })

  it('enviarAhora devuelve false si no se pudo subir (para avisar antes de cerrar sesión)', async () => {
    const { result, rerender } = montar(demo)
    await waitFor(() => expect(result.current.estado).toBe('al-dia'))
    enviarMock.mockRejectedValue(sinRed())
    rerender({ estado: reducer(demo, { tipo: 'ELIMINAR_CITA', id: demo.citas[0].id }) })

    let ok = true
    await act(async () => {
      ok = await result.current.enviarAhora()
    })
    expect(ok).toBe(false)
  })
})
