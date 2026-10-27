/* ============================================================================
   Pruebas contra la base de datos REAL de Supabase
   ----------------------------------------------------------------------------
   Crean dos usuarios de prueba, ejercitan la misma capa remota que usa la app
   (aplicarCambios / cargarRemoto) y comprueban que Row Level Security aísla de
   verdad a un paciente del otro. Al terminar, cada usuario se elimina con la
   misma función que usa el botón «Eliminar mi cuenta».

   No corren con `npm test` (necesitan red y un proyecto configurado):
       npm run test:integracion
   Requisito: en Supabase, la confirmación de correo desactivada (ver README).
   ========================================================================== */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'
import type { EstadoPulso } from '../../src/types'
import { aplicarCambios, calcularCambios, cargarRemoto } from '../../src/lib/remoto'
import type { ClientePulso } from '../../src/lib/remoto'
import { generarDatosDemo } from '../../src/lib/demo'
import { reducer } from '../../src/context/AppContext'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY
const activo = import.meta.env.MODE === 'integracion' && Boolean(url && clave)

const nuevoCliente = (): ClientePulso =>
  createClient<Database>(url!, clave!, { auth: { persistSession: false, autoRefreshToken: false } })

async function crearUsuarioDePrueba(c: ClientePulso): Promise<string> {
  const sufijo = crypto.randomUUID().slice(0, 8)
  const { data, error } = await c.auth.signUp({
    email: `pulso.prueba.${sufijo}@example.com`,
    password: `Prueba-${crypto.randomUUID()}`,
  })
  if (error) throw error
  if (!data.session) throw new Error('El proyecto exige confirmar el correo; desactívalo para estas pruebas.')
  return data.user!.id
}

const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id))
const ordenado = (e: EstadoPulso) => ({
  ...e,
  medicamentos: porId(e.medicamentos),
  registrosDosis: porId(e.registrosDosis),
  mediciones: porId(e.mediciones),
  citas: porId(e.citas),
})

describe.runIf(activo)('Supabase · base de datos real', () => {
  const a = nuevoCliente()
  const b = nuevoCliente()
  const anonimo = nuevoCliente()
  let idA = ''
  let idB = ''

  beforeAll(async () => {
    idA = await crearUsuarioDePrueba(a)
    idB = await crearUsuarioDePrueba(b)
  }, 30_000)

  afterAll(async () => {
    // Los usuarios de prueba no se quedan en el proyecto.
    expect((await a.rpc('eliminar_mi_cuenta')).error).toBeNull()
    expect((await b.rpc('eliminar_mi_cuenta')).error).toBeNull()
  }, 30_000)

  it('guarda el caso de demostración completo y lo devuelve idéntico', async () => {
    const demo = generarDatosDemo()
    await aplicarCambios(a, idA, demo, calcularCambios(null, demo))
    expect(ordenado(await cargarRemoto(a, idA))).toEqual(ordenado(demo))
  }, 60_000)

  it('manda solo las diferencias y el servidor queda igual que la app', async () => {
    const antes = await cargarRemoto(a, idA)
    let despues = reducer(antes, { tipo: 'MARCAR_DOSIS', id: antes.registrosDosis[0].id, estado: 'omitida' })
    despues = reducer(despues, { tipo: 'ELIMINAR_MEDICAMENTO', id: antes.medicamentos[0].id })
    despues = reducer(despues, { tipo: 'ACTUALIZAR_CITA', cita: { ...antes.citas[0], lugar: 'Consultorio 2' } })
    despues = reducer(despues, { tipo: 'PREFERENCIAS', cambios: { escalaTexto: 'grande' } })

    const cambios = calcularCambios(antes, despues)
    expect(cambios.medicamentos.borrar).toEqual([antes.medicamentos[0].id])
    await aplicarCambios(a, idA, despues, cambios)
    expect(ordenado(await cargarRemoto(a, idA))).toEqual(ordenado(despues))
  }, 60_000)

  it('repetir un envío no duplica nada (idempotente)', async () => {
    const actual = await cargarRemoto(a, idA)
    await aplicarCambios(a, idA, actual, calcularCambios(null, actual))
    expect(ordenado(await cargarRemoto(a, idA))).toEqual(ordenado(actual))
  }, 60_000)

  it('RLS: otro usuario no puede ver, cambiar ni borrar los datos ajenos', async () => {
    expect((await cargarRemoto(b, idB)).perfil).toBeNull()

    const sinFiltro = await b.from('medicion').select('*')
    expect(sinFiltro.data).toEqual([])
    const conFiltro = await b.from('medicion').select('*').eq('id_perfil', idA)
    expect(conFiltro.data).toEqual([])

    const intruso = await b.from('perfil').upsert({ id_perfil: idA, nombre: 'Intruso' })
    expect(intruso.error).not.toBeNull()

    const borrado = await b.from('medicion').delete().eq('id_perfil', idA).select()
    expect(borrado.data ?? []).toEqual([])

    const deA = await cargarRemoto(a, idA)
    expect(deA.perfil?.nombre).toBe('María Fernández')
    expect(deA.mediciones.length).toBeGreaterThan(40)
  }, 60_000)

  it('sin sesión no se lee nada ni se puede eliminar una cuenta', async () => {
    const lectura = await anonimo.from('perfil').select('*')
    expect(lectura.data ?? []).toEqual([])
    const rpc = await anonimo.rpc('eliminar_mi_cuenta')
    expect(rpc.error).not.toBeNull()
  })

  it('«Borrar todos mis datos» vacía la cuenta pero conserva las preferencias', async () => {
    const antes = await cargarRemoto(a, idA)
    const despues = reducer(antes, { tipo: 'BORRAR_TODO' })
    await aplicarCambios(a, idA, despues, calcularCambios(antes, despues))

    const remoto = await cargarRemoto(a, idA)
    expect(remoto.perfil).toBeNull()
    expect(remoto.medicamentos).toEqual([])
    expect(remoto.registrosDosis).toEqual([])
    expect(remoto.mediciones).toEqual([])
    expect(remoto.citas).toEqual([])
    expect(remoto.preferencias.escalaTexto).toBe('grande')
  }, 60_000)
})
