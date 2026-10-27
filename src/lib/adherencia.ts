/* ============================================================================
   Pulso — Adherencia terapéutica
   ----------------------------------------------------------------------------
        adherencia(periodo) = dosisTomadas / dosisProgramadas * 100

   Detalle que sí importa: las dosis de HOY que todavía no han llegado no
   entran en el denominador. Si son las 9 de la mañana y quedan dos tomas
   pendientes para la noche, la app no puede decirle a nadie que va al 33%.
   ========================================================================== */

import type { EstadoDosis, Medicamento, RegistroDosis } from '../types'
import { claveDia, inicioDia, isoLocal, sumarDias } from './fechas'

/** Id determinista: mismo medicamento + misma hora = mismo registro, siempre. */
export function idDosis(medicamentoId: string, fechaHoraProgramada: string): string {
  return `${medicamentoId}@${fechaHoraProgramada}`
}

/** Las tomas que un medicamento programa para un día concreto. */
export function dosisProgramadasDelDia(
  medicamentos: Medicamento[],
  dia: Date,
): { medicamentoId: string; fechaHoraProgramada: string }[] {
  const base = claveDia(dia)
  return medicamentos
    .filter((m) => m.activo)
    .flatMap((m) =>
      m.horarios.map((h) => ({
        medicamentoId: m.id,
        fechaHoraProgramada: `${base}T${h}:00`,
      })),
    )
}

/**
 * Materializa los registros que faltan, desde `diasAtras` hasta hoy, sin tocar
 * los que ya existen: no se pisa lo que la persona marcó. Nunca crea dosis
 * anteriores a la fecha en que se agregó el medicamento.
 */
export function sincronizarDosis(
  medicamentos: Medicamento[],
  registros: RegistroDosis[],
  hasta: Date = new Date(),
  diasAtras = 45,
): RegistroDosis[] {
  const existentes = new Set(registros.map((r) => r.id))
  const nuevos: RegistroDosis[] = []
  const creados = new Map(medicamentos.map((m) => [m.id, new Date(m.creadoEn).getTime()]))

  for (let i = diasAtras; i >= 0; i--) {
    const dia = sumarDias(hasta, -i)
    for (const d of dosisProgramadasDelDia(medicamentos, dia)) {
      const id = idDosis(d.medicamentoId, d.fechaHoraProgramada)
      if (existentes.has(id)) continue
      const creadoEn = creados.get(d.medicamentoId)
      if (creadoEn && new Date(d.fechaHoraProgramada).getTime() < creadoEn) continue
      existentes.add(id)
      nuevos.push({ id, ...d, estado: 'pendiente', registradoEn: null })
    }
  }

  if (nuevos.length === 0) return registros
  return [...registros, ...nuevos].sort((a, b) =>
    a.fechaHoraProgramada.localeCompare(b.fechaHoraProgramada),
  )
}

export interface ResumenAdherencia {
  programadas: number
  tomadas: number
  omitidas: number
  pendientes: number
  /** null cuando no hay ni una dosis programada: 0% sería mentira. */
  porcentaje: number | null
}

/**
 * Adherencia dentro de [desde, hasta]. `ahora` se inyecta para poder probar
 * la regla de las dosis futuras sin depender del reloj de la máquina.
 */
export function calcularAdherencia(
  registros: RegistroDosis[],
  desde: Date,
  hasta: Date,
  ahora: Date = new Date(),
): ResumenAdherencia {
  const desdeMs = inicioDia(desde).getTime()
  const hastaMs = hasta.getTime()
  const ahoraMs = ahora.getTime()

  let tomadas = 0
  let omitidas = 0
  let pendientes = 0

  for (const r of registros) {
    const t = new Date(r.fechaHoraProgramada).getTime()
    if (t < desdeMs || t > hastaMs) continue
    // Dosis que todavía no toca: no cuenta ni a favor ni en contra.
    if (t > ahoraMs && r.estado === 'pendiente') continue
    if (r.estado === 'tomada') tomadas++
    else if (r.estado === 'omitida') omitidas++
    else pendientes++
  }

  const programadas = tomadas + omitidas + pendientes
  return {
    programadas,
    tomadas,
    omitidas,
    pendientes,
    porcentaje: programadas === 0 ? null : Math.round((tomadas / programadas) * 100),
  }
}

/** Etiqueta en palabras del porcentaje, para no comunicar solo con número. */
export function etiquetaAdherencia(porcentaje: number | null): string {
  if (porcentaje === null) return 'Sin dosis programadas en el período'
  if (porcentaje >= 90) return 'Cumplimiento muy alto'
  if (porcentaje >= 75) return 'Cumplimiento alto'
  if (porcentaje >= 50) return 'Cumplimiento medio'
  return 'Cumplimiento bajo'
}

/** Los segmentos de la cinta del día, ordenados por hora. */
export interface MarcaCinta {
  registro: RegistroDosis
  medicamento: Medicamento | undefined
  /** Posición 0–1 dentro de las 24 horas. */
  posicion: number
  estado: EstadoDosis
  vencida: boolean
}

export function marcasDelDia(
  medicamentos: Medicamento[],
  registros: RegistroDosis[],
  dia: Date,
  ahora: Date = new Date(),
): MarcaCinta[] {
  const clave = claveDia(dia)
  const porId = new Map(medicamentos.map((m) => [m.id, m]))
  return registros
    .filter((r) => r.fechaHoraProgramada.slice(0, 10) === clave)
    .map((r) => {
      const d = new Date(r.fechaHoraProgramada)
      return {
        registro: r,
        medicamento: porId.get(r.medicamentoId),
        posicion: (d.getHours() * 60 + d.getMinutes()) / (24 * 60),
        estado: r.estado,
        vencida: r.estado === 'pendiente' && d.getTime() < ahora.getTime(),
      }
    })
    .sort((a, b) => a.posicion - b.posicion)
}

/** Hora actual como fracción del día, para la aguja de la cinta. */
export function posicionAhora(ahora: Date = new Date()): number {
  return (ahora.getHours() * 60 + ahora.getMinutes()) / (24 * 60)
}

/** Utilidad para el generador de demo y para las pruebas. */
export function fechaHoraDosis(dia: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = inicioDia(dia)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return isoLocal(d)
}
