/* ============================================================================
   Pulso — Validaciones de formularios críticos
   ----------------------------------------------------------------------------
   Funciones puras para validar los cinco formularios de entrada de datos:
     1. Cuenta (correo y contraseña para crear cuenta o iniciar sesión)
     2. Perfil y rangos objetivo (nombre, fecha de nacimiento, contacto y rangos)
     3. Medicamentos (nombre, dosis, horarios HH:MM sin duplicados y longitud)
     4. Mediciones (presión arterial, glucosa, peso, fecha/hora y nota)
     5. Citas médicas (especialidad/médico, fecha/hora válida y longitud)

   Reglas de diseño clínico y de usabilidad:
     · Todos los mensajes están en español claro y dicen cómo corregir el dato
       (heurística 9 de Nielsen).
     · En mediciones, los valores extremos pero físicamente posibles por un
       tensiómetro o glucómetro (ej. 200/120 mmHg o 350 mg/dL) generan un AVISO
       (avisoPlausible), nunca un bloqueo: es justo el dato que el médico debe
       ver. Solo se bloquean valores vacíos, no numéricos, ≤ 0, imposibles
       (ej. sistólica ≤ diastólica o fuera de límites físicos absolutos) o con
       fechas inválidas/futuras.
   ========================================================================== */

import type { ContextoGlucosa, Medicion, TipoMedicion } from '../types'
import { LIMITES_PLAUSIBLES } from './rangos'

export const LARGO_MINIMO_CONTRASENA = 8
export const LARGO_MAXIMO_CONTRASENA = 128
export const LARGO_MAXIMO_CORREO = 254
export const LARGO_MAXIMO_NOMBRE = 80
export const LARGO_MAXIMO_TEXTO_CORTO = 100
export const LARGO_MAXIMO_NOTA = 500

/** Límites fisiológicos absolutos para evitar errores de dedo imposibles. */
export const LIMITES_FISIOLOGICOS = {
  sistolica: { min: 40, max: 300 },
  diastolica: { min: 20, max: 200 },
  pulso: { min: 20, max: 250 },
  glucosa: { min: 10, max: 1000 },
  peso: { min: 20, max: 1000 },
} as const

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const PATRON_TELEFONO = /^[0-9+\-() \t]{7,25}$/

const numeroFinito = (v: string): number | null => {
  const limpio = v.trim()
  if (limpio === '') return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

/** Comprueba que una cadena ISO local ('aaaa-mm-dd' o 'aaaa-mm-ddThh:mm') sea una fecha real. */
export function esFechaValida(valor: string): boolean {
  const limpio = valor.trim()
  if (!limpio) return false
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(limpio)
  if (!m) return false
  const anio = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const hora = m[4] !== undefined ? Number(m[4]) : 0
  const min = m[5] !== undefined ? Number(m[5]) : 0
  const seg = m[6] !== undefined ? Number(m[6]) : 0
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false
  if (hora > 23 || min > 59 || seg > 59) return false
  const d = new Date(anio, mes - 1, dia, hora, min, seg)
  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === anio &&
    d.getMonth() === mes - 1 &&
    d.getDate() === dia
  )
}

/* --- 1. Registro e inicio de sesión -------------------------------------- */

export interface ErroresCredenciales {
  correo: string | null
  contrasena: string | null
}

export function validarCredenciales(
  correo: string,
  contrasena: string,
  creando: boolean,
): ErroresCredenciales {
  const c = correo.trim()
  let errorCorreo: string | null = null
  if (c.length === 0) {
    errorCorreo = 'Escribe tu correo electrónico.'
  } else if (c.length > LARGO_MAXIMO_CORREO || !PATRON_CORREO.test(c)) {
    errorCorreo = 'Escribe tu correo completo, por ejemplo maria@gmail.com.'
  }

  let errorContrasena: string | null = null
  if (contrasena.length === 0) {
    errorContrasena = 'Escribe tu contraseña.'
  } else if (contrasena.length > LARGO_MAXIMO_CONTRASENA) {
    errorContrasena = `La contraseña no puede pasar de ${LARGO_MAXIMO_CONTRASENA} caracteres.`
  } else if (creando && contrasena.length < LARGO_MINIMO_CONTRASENA) {
    errorContrasena = `Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Una frase corta se recuerda mejor que una palabra rara.`
  }

  return { correo: errorCorreo, contrasena: errorContrasena }
}

/* --- 2. Perfil y rangos objetivo ----------------------------------------- */

export function validarNombrePerfil(nombre: string): string | null {
  const limpio = nombre.trim()
  if (limpio.length < 2) return 'Escribe tu nombre para poder saludarte por él.'
  if (limpio.length > LARGO_MAXIMO_NOMBRE)
    return `El nombre es demasiado largo (máximo ${LARGO_MAXIMO_NOMBRE} caracteres).`
  return null
}

export function validarFechaNacimiento(fechaNacimiento: string, hoy: Date = new Date()): string | null {
  const limpio = fechaNacimiento.trim()
  if (!limpio) return null // Es opcional en Pulso
  if (!esFechaValida(limpio)) return 'Esa fecha de nacimiento no es válida. Revisa el día, mes y año.'
  const fecha = new Date(`${limpio}T00:00:00`)
  if (fecha.getTime() > hoy.getTime()) return 'La fecha de nacimiento no puede estar en el futuro.'
  const edadMaxMs = 130 * 365.25 * 24 * 60 * 60 * 1000
  if (hoy.getTime() - fecha.getTime() > edadMaxMs)
    return 'Revisa el año de nacimiento: la fecha es de hace más de 130 años.'
  return null
}

export function validarContactoEmergencia(nombre: string, telefono: string): string | null {
  const n = nombre.trim()
  const t = telefono.trim()
  if (!n && !t) return null
  if (n && !t) return 'Escribe también el teléfono del contacto de emergencia, o deja ambos en blanco.'
  if (!n && t) return 'Escribe el nombre del contacto de emergencia, o deja ambos en blanco.'
  if (n.length > LARGO_MAXIMO_NOMBRE)
    return `El nombre del contacto no puede pasar de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  if (!PATRON_TELEFONO.test(t))
    return 'Escribe un teléfono válido (al menos 7 dígitos, por ejemplo 809-000-0000).'
  return null
}

export interface BorradorRangos {
  sisMin: string
  sisMax: string
  diaMin: string
  diaMax: string
  ayunasMin: string
  ayunasMax: string
  postMin: string
  postMax: string
  pesoMin: string
  pesoMax: string
}

export function validarRangosObjetivo(r: BorradorRangos): string | null {
  const revisarPar = (
    minTxt: string,
    maxTxt: string,
    etiqueta: string,
    limites: { min: number; max: number },
  ): string | null => {
    const vacioMin = minTxt.trim() === ''
    const vacioMax = maxTxt.trim() === ''
    if (vacioMin && vacioMax) return null
    if (vacioMin || vacioMax)
      return `En ${etiqueta}, escribe tanto el mínimo como el máximo, o deja ambos en blanco.`
    const min = numeroFinito(minTxt)
    const max = numeroFinito(maxTxt)
    if (min === null || max === null) return `En ${etiqueta}, escribe solo números.`
    if (min < limites.min || max > limites.max)
      return `Los rangos de ${etiqueta} deben estar entre ${limites.min} y ${limites.max}.`
    if (min >= max) return `En ${etiqueta}, el mínimo debe ser menor que el máximo.`
    return null
  }

  // En presión arterial, o se dejan los 4 en blanco o se completan los 4
  const camposPresion = [r.sisMin, r.sisMax, r.diaMin, r.diaMax].map((x) => x.trim() !== '')
  if (camposPresion.some(Boolean) && !camposPresion.every(Boolean)) {
    return 'En presión arterial, completa los cuatro valores (sistólica y diastólica, mínima y máxima) o déjalos todos en blanco.'
  }

  const errSis = revisarPar(r.sisMin, r.sisMax, 'presión sistólica', LIMITES_FISIOLOGICOS.sistolica)
  if (errSis) return errSis
  const errDia = revisarPar(r.diaMin, r.diaMax, 'presión diastólica', LIMITES_FISIOLOGICOS.diastolica)
  if (errDia) return errDia

  if (camposPresion.every(Boolean)) {
    if (Number(r.sisMin) <= Number(r.diaMin) || Number(r.sisMax) <= Number(r.diaMax)) {
      return 'En presión arterial, la sistólica (alta) debe ser mayor que la diastólica (baja).'
    }
  }

  const errAyunas = revisarPar(r.ayunasMin, r.ayunasMax, 'glucosa en ayunas', LIMITES_FISIOLOGICOS.glucosa)
  if (errAyunas) return errAyunas

  const tienePost = r.postMin.trim() !== '' || r.postMax.trim() !== ''
  if (tienePost && r.ayunasMin.trim() === '' && r.ayunasMax.trim() === '') {
    return 'Para guardar el rango de glucosa después de comer, completa también el rango en ayunas.'
  }
  const errPost = revisarPar(
    r.postMin,
    r.postMax,
    'glucosa después de comer',
    LIMITES_FISIOLOGICOS.glucosa,
  )
  if (errPost) return errPost

  const errPeso = revisarPar(r.pesoMin, r.pesoMax, 'peso', LIMITES_FISIOLOGICOS.peso)
  if (errPeso) return errPeso

  return null
}

/* --- 3. Medicamentos ----------------------------------------------------- */

export interface EntradaMedicamento {
  nombre: string
  dosis: string
  horarios: string[]
  instruccion: string
}

export function validarMedicamento(m: EntradaMedicamento): string | null {
  const nombre = m.nombre.trim()
  if (nombre.length < 2) return 'Escribe el nombre del medicamento (al menos 2 letras).'
  if (nombre.length > LARGO_MAXIMO_NOMBRE)
    return `El nombre del medicamento no puede pasar de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  if (m.dosis.trim().length > LARGO_MAXIMO_TEXTO_CORTO)
    return `La dosis es demasiado larga (máximo ${LARGO_MAXIMO_TEXTO_CORTO} caracteres).`
  if (m.instruccion.trim().length > LARGO_MAXIMO_NOTA)
    return `La instrucción no puede pasar de ${LARGO_MAXIMO_NOTA} caracteres.`
  if (m.horarios.length === 0)
    return 'Agrega al menos un horario. Sin horario, Pulso no puede recordarte la toma.'
  for (const h of m.horarios) {
    if (!PATRON_HORA.test(h)) return `El horario «${h}» no tiene un formato válido (HH:MM).`
  }
  if (new Set(m.horarios).size !== m.horarios.length)
    return 'Hay horarios repetidos en la lista. Deja cada hora una sola vez.'
  return null
}

/* --- 4. Mediciones clínicas ---------------------------------------------- */

/** Aviso suave cuando un número se sale de lo que un aparato suele medir. */
export function avisoPlausible(
  valor: string,
  limites: { min: number; max: number },
  nombre: string,
): string | null {
  if (valor.trim() === '') return null
  const n = Number(valor)
  if (!Number.isFinite(n)) return 'Escribe solo números.'
  if (n < limites.min || n > limites.max) {
    return `${nombre} suele estar entre ${limites.min} y ${limites.max}. Revisa el número. Si es correcto, puedes guardarlo igual.`
  }
  return null
}

export interface EntradaMedicion {
  tipo: TipoMedicion
  sistolica: string
  diastolica: string
  pulso: string
  glucosa: string
  contexto: ContextoGlucosa
  peso: string
  cuando: string
  nota: string
}

export type ResultadoValidarMedicion =
  | { ok: true; valores: Medicion['valores']; fechaHora: string; nota: string }
  | { ok: false; error: string }

export function validarMedicion(
  entrada: EntradaMedicion,
  ahora: Date = new Date(),
): ResultadoValidarMedicion {
  const nota = entrada.nota.trim()
  if (nota.length > LARGO_MAXIMO_NOTA) {
    return {
      ok: false,
      error: `La nota es demasiado larga (máximo ${LARGO_MAXIMO_NOTA} caracteres).`,
    }
  }

  let fechaHora: string
  if (entrada.cuando.trim() !== '') {
    const candidata =
      entrada.cuando.trim().length === 16 ? `${entrada.cuando.trim()}:00` : entrada.cuando.trim()
    if (!esFechaValida(candidata)) {
      return { ok: false, error: 'La fecha y hora de la medición no es válida.' }
    }
    // Margen de 5 minutos por pequeños desfases de reloj
    if (new Date(candidata).getTime() > ahora.getTime() + 5 * 60 * 1000) {
      return {
        ok: false,
        error: 'No puedes registrar una medición en el futuro. Revisa la fecha y la hora.',
      }
    }
    fechaHora = candidata
  } else {
    const p = (n: number) => String(n).padStart(2, '0')
    fechaHora = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}T${p(
      ahora.getHours(),
    )}:${p(ahora.getMinutes())}:00`
  }

  if (entrada.tipo === 'presion') {
    if (!entrada.sistolica.trim() || !entrada.diastolica.trim()) {
      return {
        ok: false,
        error: 'Para guardar una presión hacen falta los dos números: la alta y la baja.',
      }
    }
    const sis = numeroFinito(entrada.sistolica)
    const dia = numeroFinito(entrada.diastolica)
    if (sis === null || dia === null) {
      return { ok: false, error: 'Escribe solo números en la presión sistólica y diastólica.' }
    }
    const limSis = LIMITES_FISIOLOGICOS.sistolica
    const limDia = LIMITES_FISIOLOGICOS.diastolica
    if (sis < limSis.min || sis > limSis.max) {
      return {
        ok: false,
        error: `La presión sistólica debe estar entre ${limSis.min} y ${limSis.max} mmHg.`,
      }
    }
    if (dia < limDia.min || dia > limDia.max) {
      return {
        ok: false,
        error: `La presión diastólica debe estar entre ${limDia.min} y ${limDia.max} mmHg.`,
      }
    }
    if (sis <= dia) {
      return {
        ok: false,
        error: 'La presión sistólica (la alta) debe ser mayor que la diastólica (la baja).',
      }
    }

    let pulsoNum: number | undefined
    if (entrada.pulso.trim() !== '') {
      const p = numeroFinito(entrada.pulso)
      const limPul = LIMITES_FISIOLOGICOS.pulso
      if (p === null || p < limPul.min || p > limPul.max) {
        return {
          ok: false,
          error: `El pulso debe ser un número entre ${limPul.min} y ${limPul.max} lpm.`,
        }
      }
      pulsoNum = p
    }

    return {
      ok: true,
      valores: {
        sistolica: sis,
        diastolica: dia,
        ...(pulsoNum !== undefined ? { pulso: pulsoNum } : {}),
      },
      fechaHora,
      nota,
    }
  }

  if (entrada.tipo === 'glucosa') {
    if (!entrada.glucosa.trim()) {
      return { ok: false, error: 'Escribe el valor de la glucosa para poder guardarlo.' }
    }
    const glu = numeroFinito(entrada.glucosa)
    const limGlu = LIMITES_FISIOLOGICOS.glucosa
    if (glu === null) {
      return { ok: false, error: 'Escribe solo números en el valor de la glucosa.' }
    }
    if (glu < limGlu.min || glu > limGlu.max) {
      return {
        ok: false,
        error: `La glucosa debe estar entre ${limGlu.min} y ${limGlu.max} mg/dL.`,
      }
    }
    return {
      ok: true,
      valores: { glucosa: glu, contexto: entrada.contexto },
      fechaHora,
      nota,
    }
  }

  if (!entrada.peso.trim()) {
    return { ok: false, error: 'Escribe tu peso para poder guardarlo.' }
  }
  const pesoNum = numeroFinito(entrada.peso)
  const limPeso = LIMITES_FISIOLOGICOS.peso
  if (pesoNum === null) {
    return { ok: false, error: 'Escribe solo números en el peso.' }
  }
  if (pesoNum < limPeso.min || pesoNum > limPeso.max) {
    return {
      ok: false,
      error: `El peso debe estar entre ${limPeso.min} y ${limPeso.max} lb.`,
    }
  }

  return {
    ok: true,
    valores: { peso: pesoNum },
    fechaHora,
    nota,
  }
}

/* --- 5. Citas médicas ---------------------------------------------------- */

export interface EntradaCita {
  medico: string
  especialidad: string
  fechaHora: string
  lugar: string
  motivo: string
}

export function validarCita(c: EntradaCita): string | null {
  const esp = c.especialidad.trim()
  const med = c.medico.trim()
  if (!esp && !med) {
    return 'Escribe al menos la especialidad o el nombre del médico.'
  }
  if (esp.length > LARGO_MAXIMO_NOMBRE) {
    return `La especialidad no puede pasar de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  }
  if (med.length > LARGO_MAXIMO_NOMBRE) {
    return `El nombre del médico no puede pasar de ${LARGO_MAXIMO_NOMBRE} caracteres.`
  }
  if (!c.fechaHora.trim()) {
    return 'Falta la fecha y la hora de la cita.'
  }
  const iso = c.fechaHora.trim().length === 16 ? `${c.fechaHora.trim()}:00` : c.fechaHora.trim()
  if (!esFechaValida(iso)) {
    return 'La fecha y la hora de la cita no son válidas.'
  }
  if (c.lugar.trim().length > LARGO_MAXIMO_TEXTO_CORTO) {
    return `El lugar es demasiado largo (máximo ${LARGO_MAXIMO_TEXTO_CORTO} caracteres).`
  }
  if (c.motivo.trim().length > LARGO_MAXIMO_NOTA) {
    return `El motivo no puede pasar de ${LARGO_MAXIMO_NOTA} caracteres.`
  }
  return null
}

export { LIMITES_PLAUSIBLES }
