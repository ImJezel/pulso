/* ============================================================================
   Pulso — Modelo de datos
   ----------------------------------------------------------------------------
   TypeScript aquí no es decoración: este archivo ES la documentación del
   modelo. Si un registro clínico cambia de forma, el compilador avisa antes
   de que un dato de salud se guarde mal.
   ========================================================================== */

export type TipoMedicion = 'presion' | 'glucosa' | 'peso'
export type EstadoDosis = 'pendiente' | 'tomada' | 'omitida'
export type ContextoGlucosa = 'ayunas' | 'postprandial'

/** Resultado de comparar una medición contra los rangos que puso el médico. */
export type Clasificacion = 'en-rango' | 'atencion' | 'fuera-de-rango' | 'sin-referencia'

export interface RangosObjetivo {
  presion: { sisMin: number; sisMax: number; diaMin: number; diaMax: number } | null
  glucosa: { ayunasMin: number; ayunasMax: number; postMin: number; postMax: number } | null
  peso: { min: number; max: number } | null
}

export interface Perfil {
  nombre: string
  fechaNacimiento: string // ISO (aaaa-mm-dd)
  condiciones: string[] // ['hipertension', 'diabetes_t2']
  contactoEmergencia: { nombre: string; telefono: string } | null
  rangosObjetivo: RangosObjetivo // los define el médico, no la app
}

export interface Medicamento {
  id: string
  nombre: string
  dosis: string // "50 mg"
  horarios: string[] // ['08:00', '20:00']
  instruccion: string // "Con alimentos"
  activo: boolean
  creadoEn: string
}

export interface RegistroDosis {
  id: string
  medicamentoId: string
  fechaHoraProgramada: string // ISO
  estado: EstadoDosis
  registradoEn: string | null
}

export interface ValoresMedicion {
  sistolica?: number
  diastolica?: number
  pulso?: number
  glucosa?: number
  contexto?: ContextoGlucosa
  peso?: number
}

export interface Medicion {
  id: string
  tipo: TipoMedicion
  fechaHora: string // ISO
  valores: ValoresMedicion
  nota: string
}

export interface Cita {
  id: string
  medico: string
  especialidad: string
  fechaHora: string // ISO
  lugar: string
  motivo: string
}

export interface Preferencias {
  escalaTexto: 'normal' | 'grande' | 'muy-grande' // 1 / 1.15 / 1.35
  altoContraste: boolean
  modoSimple: boolean // oculta Historial y Citas; deja Hoy y Registrar
}

/** Todo lo que Pulso guarda. Una sola forma, un solo lugar. */
export interface EstadoPulso {
  perfil: Perfil | null
  medicamentos: Medicamento[]
  registrosDosis: RegistroDosis[]
  mediciones: Medicion[]
  citas: Cita[]
  preferencias: Preferencias
  /** Marca los datos de demostración para poder decir en pantalla que son ficticios. */
  datosDemo: boolean
  /** Versión del esquema, para migrar sin perder datos del paciente. */
  version: number
}

export const CONDICIONES: { id: string; etiqueta: string }[] = [
  { id: 'hipertension', etiqueta: 'Hipertensión' },
  { id: 'diabetes_t2', etiqueta: 'Diabetes tipo 2' },
  { id: 'diabetes_t1', etiqueta: 'Diabetes tipo 1' },
  { id: 'colesterol', etiqueta: 'Colesterol alto' },
  { id: 'cardiaca', etiqueta: 'Condición cardíaca' },
  { id: 'renal', etiqueta: 'Condición renal' },
  { id: 'tiroides', etiqueta: 'Tiroides' },
]
