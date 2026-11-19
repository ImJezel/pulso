/* ============================================================================
   Pulso — Capa de datos remota (Supabase)
   ----------------------------------------------------------------------------
   La interfaz no sabe que existe una base de datos: sigue trabajando con un
   solo EstadoPulso, igual que cuando todo vivía en localStorage. Este archivo
   es el traductor entre ese objeto y las nueve tablas de Postgres:

     1. aFilas / desdeFilas      EstadoPulso ⇄ filas. Funciones puras.
     2. calcularCambios          Compara lo que el servidor ya confirmó con lo
                                 que hay ahora y devuelve SOLO lo que cambió.
                                 Pura, y por eso se prueba sin red.
     3. aplicarCambios           Manda esos cambios, en un orden que respeta
                                 las claves foráneas. Todo es idempotente: si
                                 se corta a la mitad, repetirlo no duplica nada.
     4. cargarRemoto             Trae todo lo del usuario, paginado.

   La seguridad NO está aquí: está en la base de datos (Row Level Security).
   Aunque alguien cambiara este código, Postgres solo le deja tocar sus filas.
   ========================================================================== */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import type {
  Cita,
  EstadoPulso,
  Medicamento,
  Medicion,
  Perfil,
  Preferencias,
  RangosObjetivo,
  RegistroDosis,
} from '../types'
import { PREFERENCIAS_POR_DEFECTO, VERSION_ESQUEMA } from './storage'

export type ClientePulso = SupabaseClient<Database>

type Tablas = Database['public']['Tables']
type Fila<T extends keyof Tablas> = Tablas[T]['Row']

export interface FilasPulso {
  perfil: Fila<'perfil'> | null
  rangos: Fila<'rangos_objetivo'> | null
  preferencias: Fila<'preferencias'> | null
  condiciones: Fila<'condicion'>[]
  medicamentos: Fila<'medicamento'>[]
  horarios: Fila<'horario'>[]
  registros: Fila<'registro_dosis'>[]
  mediciones: Fila<'medicion'>[]
  citas: Fila<'cita'>[]
}

/* --- 1. Traducción estado ⇄ filas --------------------------------------- */

/** Postgres devuelve 'aaaa-mm-ddThh:mm:ss'; la app guarda lo mismo. */
const marcaDeTiempo = (v: string): string => (v.length === 16 ? `${v}:00` : v.slice(0, 19))
/** time → 'hh:mm' (Postgres lo devuelve con segundos). */
const horaCorta = (v: string): string => v.slice(0, 5)
const numero = (v: number | null): number | null => (v === null ? null : Number(v))
const sinRepetir = <T,>(xs: T[]): T[] => [...new Set(xs)]

function filaPerfil(p: Perfil, uid: string, estado: EstadoPulso): Fila<'perfil'> {
  return {
    id_perfil: uid,
    nombre: p.nombre,
    fecha_nacimiento: p.fechaNacimiento || null,
    contacto_nombre: p.contactoEmergencia?.nombre ?? null,
    contacto_telefono: p.contactoEmergencia?.telefono ?? null,
    datos_demo: estado.datosDemo,
    version_esquema: estado.version,
  }
}

function filaRangos(r: RangosObjetivo, uid: string): Fila<'rangos_objetivo'> {
  return {
    id_perfil: uid,
    sis_min: r.presion?.sisMin ?? null,
    sis_max: r.presion?.sisMax ?? null,
    dia_min: r.presion?.diaMin ?? null,
    dia_max: r.presion?.diaMax ?? null,
    ayunas_min: r.glucosa?.ayunasMin ?? null,
    ayunas_max: r.glucosa?.ayunasMax ?? null,
    post_min: r.glucosa?.postMin ?? null,
    post_max: r.glucosa?.postMax ?? null,
    peso_min: r.peso?.min ?? null,
    peso_max: r.peso?.max ?? null,
  }
}

const filasCondiciones = (p: Perfil, uid: string): Fila<'condicion'>[] =>
  sinRepetir(p.condiciones).map((codigo, orden) => ({ id_perfil: uid, codigo, orden }))

const filaPreferencias = (p: Preferencias, uid: string): Fila<'preferencias'> => ({
  id_perfil: uid,
  escala_texto: p.escalaTexto,
  alto_contraste: p.altoContraste,
  modo_simple: p.modoSimple,
})

const filaMedicamento = (m: Medicamento, uid: string): Fila<'medicamento'> => ({
  id_perfil: uid,
  id_medicamento: m.id,
  nombre: m.nombre,
  dosis: m.dosis,
  instruccion: m.instruccion,
  activo: m.activo,
  creado_en: m.creadoEn,
})

/** Una hora repetida violaría la clave primaria y dejaría la cola atascada. */
const filasHorarios = (m: Medicamento, uid: string): Fila<'horario'>[] =>
  sinRepetir(m.horarios).map((hora, orden) => ({
    id_perfil: uid,
    id_medicamento: m.id,
    hora,
    orden,
  }))

const filaRegistro = (r: RegistroDosis, uid: string): Fila<'registro_dosis'> => ({
  id_perfil: uid,
  id_registro: r.id,
  id_medicamento: r.medicamentoId,
  fecha_hora_programada: r.fechaHoraProgramada,
  estado: r.estado,
  registrado_en: r.registradoEn,
})

const filaMedicion = (m: Medicion, uid: string): Fila<'medicion'> => ({
  id_perfil: uid,
  id_medicion: m.id,
  tipo: m.tipo,
  fecha_hora: m.fechaHora,
  sistolica: m.valores.sistolica ?? null,
  diastolica: m.valores.diastolica ?? null,
  pulso: m.valores.pulso ?? null,
  glucosa: m.valores.glucosa ?? null,
  contexto: m.valores.contexto ?? null,
  peso: m.valores.peso ?? null,
  nota: m.nota,
})

const filaCita = (c: Cita, uid: string): Fila<'cita'> => ({
  id_perfil: uid,
  id_cita: c.id,
  medico: c.medico,
  especialidad: c.especialidad,
  fecha_hora: c.fechaHora,
  lugar: c.lugar,
  motivo: c.motivo,
})

export function aFilas(estado: EstadoPulso, uid: string): FilasPulso {
  const p = estado.perfil
  return {
    perfil: p ? filaPerfil(p, uid, estado) : null,
    rangos: p ? filaRangos(p.rangosObjetivo, uid) : null,
    preferencias: filaPreferencias(estado.preferencias, uid),
    condiciones: p ? filasCondiciones(p, uid) : [],
    medicamentos: estado.medicamentos.map((m) => filaMedicamento(m, uid)),
    horarios: estado.medicamentos.flatMap((m) => filasHorarios(m, uid)),
    registros: estado.registrosDosis.map((r) => filaRegistro(r, uid)),
    mediciones: estado.mediciones.map((m) => filaMedicion(m, uid)),
    citas: estado.citas.map((c) => filaCita(c, uid)),
  }
}

function rangosDesde(f: Fila<'rangos_objetivo'> | null): RangosObjetivo {
  if (!f) return { presion: null, glucosa: null, peso: null }
  const n = numero
  return {
    presion:
      f.sis_min !== null && f.sis_max !== null && f.dia_min !== null && f.dia_max !== null
        ? { sisMin: n(f.sis_min)!, sisMax: n(f.sis_max)!, diaMin: n(f.dia_min)!, diaMax: n(f.dia_max)! }
        : null,
    glucosa:
      f.ayunas_min !== null && f.ayunas_max !== null && f.post_min !== null && f.post_max !== null
        ? {
            ayunasMin: n(f.ayunas_min)!,
            ayunasMax: n(f.ayunas_max)!,
            postMin: n(f.post_min)!,
            postMax: n(f.post_max)!,
          }
        : null,
    peso: f.peso_min !== null && f.peso_max !== null ? { min: n(f.peso_min)!, max: n(f.peso_max)! } : null,
  }
}

const porTexto =
  <T,>(...claves: ((x: T) => string)[]) =>
  (a: T, b: T): number => {
    for (const c of claves) {
      const r = c(a).localeCompare(c(b))
      if (r !== 0) return r
    }
    return 0
  }

export function desdeFilas(f: FilasPulso): EstadoPulso {
  const perfil: Perfil | null = f.perfil
    ? {
        nombre: f.perfil.nombre,
        fechaNacimiento: f.perfil.fecha_nacimiento ?? '',
        condiciones: [...f.condiciones].sort((a, b) => a.orden - b.orden).map((c) => c.codigo),
        contactoEmergencia:
          f.perfil.contacto_nombre !== null && f.perfil.contacto_telefono !== null
            ? { nombre: f.perfil.contacto_nombre, telefono: f.perfil.contacto_telefono }
            : null,
        rangosObjetivo: rangosDesde(f.rangos),
      }
    : null

  const horariosDe = new Map<string, Fila<'horario'>[]>()
  for (const h of f.horarios) {
    const lista = horariosDe.get(h.id_medicamento) ?? []
    lista.push(h)
    horariosDe.set(h.id_medicamento, lista)
  }

  const medicamentos: Medicamento[] = [...f.medicamentos]
    .sort(porTexto((m) => m.creado_en, (m) => m.id_medicamento))
    .map((m) => ({
      id: m.id_medicamento,
      nombre: m.nombre,
      dosis: m.dosis,
      horarios: (horariosDe.get(m.id_medicamento) ?? [])
        .sort((a, b) => a.orden - b.orden || a.hora.localeCompare(b.hora))
        .map((h) => horaCorta(h.hora)),
      instruccion: m.instruccion,
      activo: m.activo,
      creadoEn: marcaDeTiempo(m.creado_en),
    }))

  const registrosDosis: RegistroDosis[] = [...f.registros]
    .sort(porTexto((r) => r.fecha_hora_programada, (r) => r.id_registro))
    .map((r) => ({
      id: r.id_registro,
      medicamentoId: r.id_medicamento,
      fechaHoraProgramada: marcaDeTiempo(r.fecha_hora_programada),
      estado: r.estado as RegistroDosis['estado'],
      registradoEn: r.registrado_en === null ? null : marcaDeTiempo(r.registrado_en),
    }))

  // El reducer mantiene las mediciones de la más nueva a la más vieja.
  const mediciones: Medicion[] = [...f.mediciones]
    .sort(porTexto((m) => m.fecha_hora, (m) => m.id_medicion))
    .reverse()
    .map((m) => {
      const valores: Medicion['valores'] = {}
      if (m.sistolica !== null) valores.sistolica = Number(m.sistolica)
      if (m.diastolica !== null) valores.diastolica = Number(m.diastolica)
      if (m.pulso !== null) valores.pulso = Number(m.pulso)
      if (m.glucosa !== null) valores.glucosa = Number(m.glucosa)
      if (m.contexto !== null) valores.contexto = m.contexto as 'ayunas' | 'postprandial'
      if (m.peso !== null) valores.peso = Number(m.peso)
      return {
        id: m.id_medicion,
        tipo: m.tipo as Medicion['tipo'],
        fechaHora: marcaDeTiempo(m.fecha_hora),
        valores,
        nota: m.nota,
      }
    })

  const citas: Cita[] = [...f.citas]
    .sort(porTexto((c) => c.fecha_hora, (c) => c.id_cita))
    .map((c) => ({
      id: c.id_cita,
      medico: c.medico,
      especialidad: c.especialidad,
      fechaHora: marcaDeTiempo(c.fecha_hora),
      lugar: c.lugar,
      motivo: c.motivo,
    }))

  const pref = f.preferencias
  return {
    perfil,
    medicamentos,
    registrosDosis,
    mediciones,
    citas,
    preferencias: pref
      ? {
          escalaTexto: pref.escala_texto as Preferencias['escalaTexto'],
          altoContraste: pref.alto_contraste,
          modoSimple: pref.modo_simple,
        }
      : { ...PREFERENCIAS_POR_DEFECTO },
    datosDemo: f.perfil?.datos_demo ?? false,
    version: f.perfil?.version_esquema ?? VERSION_ESQUEMA,
  }
}

/* --- 2. Qué cambió ------------------------------------------------------- */

/** Igualdad por contenido: el orden de las claves de un objeto no cuenta. */
export function igual(a: unknown, b: unknown): boolean {
  return canonico(a) === canonico(b)
}

function canonico(v: unknown): string {
  return JSON.stringify(v, (_clave, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x as Record<string, unknown>)
            .filter(([, y]) => y !== undefined)
            .sort(([k1], [k2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : 0)),
        )
      : x,
  )
}

export interface CambiosColeccion<T> {
  guardar: T[]
  borrar: string[]
}

export interface Cambios {
  /** 'guardar' incluye perfil, rangos y condiciones; 'borrar' arrastra todo. */
  perfil: 'guardar' | 'borrar' | null
  preferencias: boolean
  medicamentos: CambiosColeccion<Medicamento>
  registros: CambiosColeccion<RegistroDosis>
  mediciones: CambiosColeccion<Medicion>
  citas: CambiosColeccion<Cita>
}

function diferencia<T extends { id: string }>(antes: T[], despues: T[]): CambiosColeccion<T> {
  const previo = new Map(antes.map((x) => [x.id, x]))
  const actual = new Set(despues.map((x) => x.id))
  return {
    guardar: despues.filter((x) => !previo.has(x.id) || !igual(previo.get(x.id), x)),
    borrar: antes.filter((x) => !actual.has(x.id)).map((x) => x.id),
  }
}

/**
 * `antes` es lo último que el servidor confirmó. Si es null (nunca se ha
 * sincronizado desde este dispositivo) se trata como vacío: se sube todo y no
 * se borra nada, porque no sabemos qué hay allá.
 */
export function calcularCambios(antes: EstadoPulso | null, despues: EstadoPulso): Cambios {
  const base = antes ?? {
    perfil: null,
    medicamentos: [],
    registrosDosis: [],
    mediciones: [],
    citas: [],
    preferencias: null,
    datosDemo: false,
    version: VERSION_ESQUEMA,
  }

  const datosPerfil = (e: typeof base) =>
    e.perfil ? { perfil: e.perfil, datosDemo: e.datosDemo, version: e.version } : null

  let perfil: Cambios['perfil'] = null
  if (despues.perfil && !igual(datosPerfil(base), datosPerfil(despues))) perfil = 'guardar'
  else if (!despues.perfil && antes?.perfil) perfil = 'borrar'

  return {
    perfil,
    preferencias: !igual(base.preferencias, despues.preferencias),
    medicamentos: diferencia(base.medicamentos, despues.medicamentos),
    registros: diferencia(base.registrosDosis, despues.registrosDosis),
    mediciones: diferencia(base.mediciones, despues.mediciones),
    citas: diferencia(base.citas, despues.citas),
  }
}

export function hayCambios(c: Cambios): boolean {
  const col = (x: CambiosColeccion<unknown>) => x.guardar.length > 0 || x.borrar.length > 0
  return (
    c.perfil !== null ||
    c.preferencias ||
    col(c.medicamentos) ||
    col(c.registros) ||
    col(c.mediciones) ||
    col(c.citas)
  )
}

/* --- 3 y 4. Hablar con Supabase ----------------------------------------- */

/** esRed distingue "no hay internet" (se reintenta solo) de un rechazo real. */
export class ErrorRemoto extends Error {
  readonly esRed: boolean
  readonly codigo: string | null
  constructor(mensaje: string, esRed: boolean, codigo: string | null = null) {
    super(mensaje)
    this.name = 'ErrorRemoto'
    this.esRed = esRed
    this.codigo = codigo
  }
}

interface Respuesta {
  error: { message: string; code?: string } | null
  status: number
}

function revisar<R extends Respuesta>(r: R, que: string): R {
  if (r.error) {
    // postgrest-js devuelve status 0 cuando fetch ni siquiera llegó al servidor.
    throw new ErrorRemoto(`${que}: ${r.error.message}`, r.status === 0, r.error.code ?? null)
  }
  return r
}

/** Lotes para no mandar peticiones gigantes ni URLs de varios KB. */
const TAM_LOTE_FILAS = 500
const TAM_LOTE_IDS = 100

function* lotes<T>(xs: T[], tam: number): Generator<T[]> {
  for (let i = 0; i < xs.length; i += tam) yield xs.slice(i, i + tam)
}

export async function aplicarCambios(
  cliente: ClientePulso,
  uid: string,
  estado: EstadoPulso,
  cambios: Cambios,
): Promise<void> {
  const db = cliente

  // 1. Perfil primero: casi todas las tablas cuelgan de él.
  if (cambios.perfil === 'guardar' && estado.perfil) {
    const p = estado.perfil
    revisar(await db.from('perfil').upsert(filaPerfil(p, uid, estado)), 'perfil')
    revisar(
      await db.from('rangos_objetivo').upsert(filaRangos(p.rangosObjetivo, uid)),
      'rangos objetivo',
    )
    revisar(await db.from('condicion').delete().eq('id_perfil', uid), 'condiciones')
    const condiciones = filasCondiciones(p, uid)
    if (condiciones.length) revisar(await db.from('condicion').insert(condiciones), 'condiciones')
  }

  if (cambios.preferencias) {
    revisar(
      await db.from('preferencias').upsert(filaPreferencias(estado.preferencias, uid)),
      'preferencias',
    )
  }

  // 2. Medicamentos y sus horarios (los horarios se reemplazan enteros).
  for (const lote of lotes(cambios.medicamentos.guardar, TAM_LOTE_FILAS)) {
    revisar(await db.from('medicamento').upsert(lote.map((m) => filaMedicamento(m, uid))), 'medicamentos')
    revisar(
      await db
        .from('horario')
        .delete()
        .eq('id_perfil', uid)
        .in('id_medicamento', lote.map((m) => m.id)),
      'horarios',
    )
    const horarios = lote.flatMap((m) => filasHorarios(m, uid))
    if (horarios.length) revisar(await db.from('horario').insert(horarios), 'horarios')
  }

  // 3. Lo que cuelga de un medicamento, después de que el medicamento exista.
  //    Las dosis auto-generadas ('pendiente' sin marca de tiempo) van con
  //    ignoreDuplicates para no sobrescribir una dosis que ya se marcó como
  //    'tomada' u 'omitida' en otro dispositivo (INC-05).
  const idsMedicamentos = new Set(estado.medicamentos.map((m) => m.id))
  const registrosConPadre = cambios.registros.guardar.filter((r) => idsMedicamentos.has(r.medicamentoId))
  const dosisAutomaticas = registrosConPadre.filter(
    (r) => r.estado === 'pendiente' && r.registradoEn === null,
  )
  const dosisMarcadas = registrosConPadre.filter(
    (r) => !(r.estado === 'pendiente' && r.registradoEn === null),
  )

  for (const lote of lotes(dosisAutomaticas, TAM_LOTE_FILAS)) {
    revisar(
      await db
        .from('registro_dosis')
        .upsert(lote.map((r) => filaRegistro(r, uid)), { ignoreDuplicates: true }),
      'dosis',
    )
  }
  for (const lote of lotes(dosisMarcadas, TAM_LOTE_FILAS)) {
    revisar(await db.from('registro_dosis').upsert(lote.map((r) => filaRegistro(r, uid))), 'dosis')
  }
  for (const lote of lotes(cambios.registros.borrar, TAM_LOTE_IDS)) {
    revisar(
      await db.from('registro_dosis').delete().eq('id_perfil', uid).in('id_registro', lote),
      'dosis',
    )
  }

  for (const lote of lotes(cambios.mediciones.guardar, TAM_LOTE_FILAS)) {
    revisar(await db.from('medicion').upsert(lote.map((m) => filaMedicion(m, uid))), 'mediciones')
  }
  for (const lote of lotes(cambios.mediciones.borrar, TAM_LOTE_IDS)) {
    revisar(await db.from('medicion').delete().eq('id_perfil', uid).in('id_medicion', lote), 'mediciones')
  }

  for (const lote of lotes(cambios.citas.guardar, TAM_LOTE_FILAS)) {
    revisar(await db.from('cita').upsert(lote.map((c) => filaCita(c, uid))), 'citas')
  }
  for (const lote of lotes(cambios.citas.borrar, TAM_LOTE_IDS)) {
    revisar(await db.from('cita').delete().eq('id_perfil', uid).in('id_cita', lote), 'citas')
  }

  // 4. Borrar un medicamento arrastra sus horarios y sus dosis (ON DELETE CASCADE).
  for (const lote of lotes(cambios.medicamentos.borrar, TAM_LOTE_IDS)) {
    revisar(
      await db.from('medicamento').delete().eq('id_perfil', uid).in('id_medicamento', lote),
      'medicamentos',
    )
  }

  // 5. Al final: borrar el perfil arrastra todo lo demás menos las preferencias.
  if (cambios.perfil === 'borrar') {
    revisar(await db.from('perfil').delete().eq('id_perfil', uid), 'perfil')
  }
}

/**
 * Supabase limita cuántas filas devuelve cada consulta (max_rows). Se pide por
 * páginas hasta que una venga vacía: así no depende de cuánto valga ese límite.
 */
async function todas<T extends keyof Tablas>(
  cliente: ClientePulso,
  uid: string,
  tabla: T,
  clave: (keyof Fila<T> & string)[],
): Promise<Fila<T>[]> {
  const filas: Fila<T>[] = []
  for (;;) {
    let consulta = cliente.from(tabla).select('*').eq('id_perfil' as never, uid as never)
    for (const c of clave) consulta = consulta.order(c as never)
    const r = revisar(await consulta.range(filas.length, filas.length + 999), tabla)
    // Con un nombre de tabla genérico el tipado de supabase-js no puede inferir
    // la fila; `select('*')` sobre la tabla T devuelve exactamente Fila<T>.
    const pagina = (r.data ?? []) as unknown as Fila<T>[]
    if (pagina.length === 0) return filas
    filas.push(...pagina)
  }
}

export async function cargarRemoto(cliente: ClientePulso, uid: string): Promise<EstadoPulso> {
  const [perfiles, rangos, preferencias, condiciones, medicamentos, horarios, registros, mediciones, citas] =
    await Promise.all([
      todas(cliente, uid, 'perfil', ['id_perfil']),
      todas(cliente, uid, 'rangos_objetivo', ['id_perfil']),
      todas(cliente, uid, 'preferencias', ['id_perfil']),
      todas(cliente, uid, 'condicion', ['codigo']),
      todas(cliente, uid, 'medicamento', ['id_medicamento']),
      todas(cliente, uid, 'horario', ['id_medicamento', 'hora']),
      todas(cliente, uid, 'registro_dosis', ['id_registro']),
      todas(cliente, uid, 'medicion', ['id_medicion']),
      todas(cliente, uid, 'cita', ['id_cita']),
    ])
  return desdeFilas({
    perfil: perfiles[0] ?? null,
    rangos: rangos[0] ?? null,
    preferencias: preferencias[0] ?? null,
    condiciones,
    medicamentos,
    horarios,
    registros,
    mediciones,
    citas,
  })
}
