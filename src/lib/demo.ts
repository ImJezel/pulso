/* ============================================================================
   Pulso — Datos de demostración
   ----------------------------------------------------------------------------
   ⚠ TODO LO DE ESTE ARCHIVO ES FICTICIO. «María Fernández» no existe. Ningún
   dato de aquí corresponde a una persona real ni a un caso clínico real, y la
   app lo rotula como demostración mientras esté cargado (estado.datosDemo).

   El generador es determinista (semilla fija): la demo de la presentación se
   ve igual hoy que mañana, y si algo se rompe se puede reproducir.
   ========================================================================== */

import type { Cita, EstadoPulso, Medicamento, Medicion, RegistroDosis } from '../types'
import { fechaHoraDosis } from './adherencia'
import { inicioDia, isoLocal, sumarDias } from './fechas'
import { ESTADO_INICIAL, VERSION_ESQUEMA } from './storage'

/** PRNG mulberry32: 8 líneas, reproducible, suficiente para datos de ejemplo. */
function generador(semilla: number) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DIAS_DEMO = 45

export function generarDatosDemo(hoy: Date = new Date()): EstadoPulso {
  const azar = generador(20262067)
  const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1))

  const creadoEn = isoLocal(sumarDias(inicioDia(hoy), -DIAS_DEMO))

  const medicamentos: Medicamento[] = [
    {
      id: 'med_demo_losartan',
      nombre: 'Losartán',
      dosis: '50 mg',
      horarios: ['08:00', '20:00'],
      instruccion: 'Con un vaso de agua',
      activo: true,
      creadoEn,
    },
    {
      id: 'med_demo_metformina',
      nombre: 'Metformina',
      dosis: '850 mg',
      horarios: ['08:00', '19:00'],
      instruccion: 'Con alimentos, para que no caiga pesada',
      activo: true,
      creadoEn,
    },
    {
      id: 'med_demo_aspirina',
      nombre: 'Aspirina',
      dosis: '81 mg',
      horarios: ['08:00'],
      instruccion: 'Después del desayuno',
      activo: true,
      creadoEn,
    },
  ]

  /* --- Dosis: adherencia ~85%, con un bache en los días 20–24 --------------
     No es 100% a propósito: una demo perfecta no enseña para qué sirve la
     app, y el informe del médico saldría sin nada que conversar. */
  const registrosDosis: RegistroDosis[] = []
  for (let i = DIAS_DEMO; i >= 0; i--) {
    const dia = sumarDias(hoy, -i)
    const semanaFloja = i >= 20 && i <= 24
    for (const m of medicamentos) {
      for (const h of m.horarios) {
        const fechaHoraProgramada = fechaHoraDosis(dia, h)
        const programada = new Date(fechaHoraProgramada)
        const esFutura = programada.getTime() > hoy.getTime()

        let estado: RegistroDosis['estado'] = 'tomada'
        if (esFutura) {
          estado = 'pendiente'
        } else {
          const suerte = azar()
          const umbral = semanaFloja ? 0.62 : 0.9
          // La toma de la noche se olvida más que la de la mañana: es lo que pasa.
          const ajuste = h >= '19:00' ? 0.06 : 0
          if (suerte > umbral + (1 - umbral) * 0.5) estado = 'omitida'
          else if (suerte > umbral - ajuste) estado = 'pendiente'
        }

        registrosDosis.push({
          id: `${m.id}@${fechaHoraProgramada}`,
          medicamentoId: m.id,
          fechaHoraProgramada,
          estado,
          registradoEn: estado === 'pendiente' ? null : fechaHoraProgramada,
        })
      }
    }
  }

  /* --- Mediciones: 45 días con tendencia y algún valor fuera de rango ------ */
  const mediciones: Medicion[] = []
  const notas = [
    '',
    '',
    '',
    'Me sentí mareada al levantarme',
    'Después de caminar 20 minutos',
    'Dormí mal anoche',
    '',
    'Comí arroz con habichuelas al mediodía',
  ]

  for (let i = DIAS_DEMO; i >= 0; i--) {
    const dia = sumarDias(hoy, -i)
    const tendencia = (DIAS_DEMO - i) / DIAS_DEMO // la presión baja poco a poco
    const semanaFloja = i >= 20 && i <= 24

    // Presión: 5 de cada 7 días, mañana y a veces también en la tarde.
    if (azar() > 0.25) {
      const sistolicaBase = 142 - tendencia * 14 + (semanaFloja ? 9 : 0)
      const sistolica = Math.round(sistolicaBase + entero(-7, 8))
      const diastolica = Math.round(sistolica * 0.6 + entero(-4, 5))
      const fh = new Date(dia)
      fh.setHours(entero(6, 9), entero(0, 59), 0, 0)
      mediciones.push({
        id: `mid_p_${i}`,
        tipo: 'presion',
        fechaHora: isoLocal(fh),
        valores: { sistolica, diastolica, pulso: entero(62, 88) },
        nota: notas[entero(0, notas.length - 1)] ?? '',
      })
    }

    // Glucosa: en ayunas casi todos los días; después de comer un par por semana.
    if (azar() > 0.3) {
      const fh = new Date(dia)
      fh.setHours(entero(6, 8), entero(0, 59), 0, 0)
      mediciones.push({
        id: `mid_ga_${i}`,
        tipo: 'glucosa',
        fechaHora: isoLocal(fh),
        valores: {
          glucosa: Math.round(104 - tendencia * 6 + entero(-11, 22) + (semanaFloja ? 12 : 0)),
          contexto: 'ayunas',
        },
        nota: '',
      })
    }
    if (azar() > 0.72) {
      const fh = new Date(dia)
      fh.setHours(entero(13, 15), entero(0, 59), 0, 0)
      mediciones.push({
        id: `mid_gp_${i}`,
        tipo: 'glucosa',
        fechaHora: isoLocal(fh),
        valores: {
          glucosa: Math.round(148 + entero(-18, 34) + (semanaFloja ? 15 : 0)),
          contexto: 'postprandial',
        },
        nota: azar() > 0.7 ? 'Dos horas después del almuerzo' : '',
      })
    }

    // Peso: los domingos.
    if (dia.getDay() === 0) {
      const fh = new Date(dia)
      fh.setHours(7, 15, 0, 0)
      mediciones.push({
        id: `mid_w_${i}`,
        tipo: 'peso',
        fechaHora: isoLocal(fh),
        valores: { peso: Math.round((158 - tendencia * 5 + entero(-2, 2)) * 10) / 10 },
        nota: '',
      })
    }
  }

  mediciones.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  /* --- Citas: dos próximas y una pasada, para ver las dos secciones -------- */
  const citaProxima = new Date(sumarDias(hoy, 9))
  citaProxima.setHours(10, 30, 0, 0)
  const citaLejana = new Date(sumarDias(hoy, 38))
  citaLejana.setHours(8, 0, 0, 0)
  const citaPasada = new Date(sumarDias(hoy, -32))
  citaPasada.setHours(9, 0, 0, 0)

  const citas: Cita[] = [
    {
      id: 'cita_demo_1',
      medico: 'Dra. Carmen Peña',
      especialidad: 'Cardiología',
      fechaHora: isoLocal(citaProxima),
      lugar: 'Centro de Salud Los Alcarrizos, consultorio 4',
      motivo: 'Control de presión. Llevar el informe de los últimos 30 días.',
    },
    {
      id: 'cita_demo_2',
      medico: 'Dr. Luis Mercedes',
      especialidad: 'Endocrinología',
      fechaHora: isoLocal(citaLejana),
      lugar: 'Hospital Regional, segundo piso',
      motivo: 'Revisión de hemoglobina glicosilada',
    },
    {
      id: 'cita_demo_3',
      medico: 'Dra. Carmen Peña',
      especialidad: 'Cardiología',
      fechaHora: isoLocal(citaPasada),
      lugar: 'Centro de Salud Los Alcarrizos, consultorio 4',
      motivo: 'Primera consulta. Aquí definió los rangos objetivo.',
    },
  ]

  return {
    ...ESTADO_INICIAL,
    perfil: {
      nombre: 'María Fernández',
      fechaNacimiento: '1962-04-17',
      condiciones: ['hipertension', 'diabetes_t2'],
      contactoEmergencia: { nombre: 'Yaneiris (hija)', telefono: '809-555-0142' },
      rangosObjetivo: {
        presion: { sisMin: 100, sisMax: 130, diaMin: 60, diaMax: 85 },
        glucosa: { ayunasMin: 70, ayunasMax: 110, postMin: 70, postMax: 160 },
        peso: { min: 130, max: 160 },
      },
    },
    medicamentos,
    registrosDosis,
    mediciones,
    citas,
    datosDemo: true,
    version: VERSION_ESQUEMA,
  }
}
