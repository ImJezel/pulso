/* Pruebas de las validaciones de los cinco formularios críticos de Pulso:
   cuenta (registro/login), perfil y rangos objetivo, medicamentos, mediciones
   clínicas y citas médicas. */

import { describe, expect, it } from 'vitest'
import {
  avisoPlausible,
  esFechaValida,
  LIMITES_PLAUSIBLES,
  validarCita,
  validarContactoEmergencia,
  validarCredenciales,
  validarFechaNacimiento,
  validarMedicamento,
  validarMedicion,
  validarNombrePerfil,
  validarRangosObjetivo,
} from '../src/lib/validaciones'

describe('esFechaValida', () => {
  it('acepta fechas reales y rechaza fechas inexistentes como el 31 de febrero', () => {
    expect(esFechaValida('2026-08-19')).toBe(true)
    expect(esFechaValida('2026-08-19T08:30:00')).toBe(true)
    expect(esFechaValida('2026-02-31')).toBe(false)
    expect(esFechaValida('no-es-fecha')).toBe(false)
  })
})

describe('validarCredenciales (registro y login)', () => {
  it('acepta correo válido y contraseña de 8+ caracteres al crear cuenta', () => {
    expect(validarCredenciales('maria@gmail.com', 'MiClaveSegura123', true)).toEqual({
      correo: null,
      contrasena: null,
    })
  })

  it('rechaza correo vacío o mal formado con mensaje claro en español', () => {
    expect(validarCredenciales('', '12345678', true).correo).toContain('correo')
    expect(validarCredenciales('maria@sin-dominio', '12345678', true).correo).toContain('correo completo')
  })

  it('exige 8+ caracteres al crear cuenta y rechaza contraseñas vacías o excesivamente largas', () => {
    expect(validarCredenciales('maria@gmail.com', '', false).contrasena).toContain('contraseña')
    expect(validarCredenciales('maria@gmail.com', 'corta', true).contrasena).toContain('8 caracteres')
    expect(validarCredenciales('maria@gmail.com', 'x'.repeat(130), true).contrasena).toContain('128')
  })
})

describe('validarPerfil (nombre, fecha de nacimiento, contacto y rangos)', () => {
  const hoy = new Date('2026-08-19T10:00:00')

  it('valida longitud mínima y máxima del nombre', () => {
    expect(validarNombrePerfil('M')).toContain('nombre')
    expect(validarNombrePerfil('x'.repeat(85))).toContain('80')
    expect(validarNombrePerfil('María Fernández')).toBeNull()
  })

  it('permite fecha de nacimiento vacía pero rechaza fechas futuras o mayores a 130 años', () => {
    expect(validarFechaNacimiento('', hoy)).toBeNull()
    expect(validarFechaNacimiento('1960-05-12', hoy)).toBeNull()
    expect(validarFechaNacimiento('2027-01-01', hoy)).toContain('futuro')
    expect(validarFechaNacimiento('1850-01-01', hoy)).toContain('130 años')
  })

  it('exige nombre y teléfono válidos si se llena el contacto de emergencia', () => {
    expect(validarContactoEmergencia('', '')).toBeNull()
    expect(validarContactoEmergencia('Yaneiris', '')).toContain('teléfono')
    expect(validarContactoEmergencia('', '809-555-1234')).toContain('nombre')
    expect(validarContactoEmergencia('Yaneiris', '123')).toContain('teléfono válido')
    expect(validarContactoEmergencia('Yaneiris', '809-555-1234')).toBeNull()
  })

  it('valida que los rangos objetivo tengan mínimo < máximo y sistólica > diastólica', () => {
    const vacios = {
      sisMin: '',
      sisMax: '',
      diaMin: '',
      diaMax: '',
      ayunasMin: '',
      ayunasMax: '',
      postMin: '',
      postMax: '',
      pesoMin: '',
      pesoMax: '',
    }
    expect(validarRangosObjetivo(vacios)).toBeNull()
    expect(
      validarRangosObjetivo({ ...vacios, sisMin: '140', sisMax: '100', diaMin: '60', diaMax: '85' }),
    ).toContain('mínimo debe ser menor que el máximo')
    expect(
      validarRangosObjetivo({ ...vacios, sisMin: '70', sisMax: '80', diaMin: '75', diaMax: '85' }),
    ).toContain('sistólica (alta) debe ser mayor que la diastólica')
    expect(
      validarRangosObjetivo({ ...vacios, sisMin: '100', sisMax: '130', diaMin: '60', diaMax: '85' }),
    ).toBeNull()
  })
})

describe('validarMedicamento', () => {
  it('exige nombre de al menos 2 letras, horario válido HH:MM sin duplicados y respeta longitudes', () => {
    expect(
      validarMedicamento({ nombre: 'L', dosis: '50 mg', horarios: ['08:00'], instruccion: '' }),
    ).toContain('nombre')
    expect(
      validarMedicamento({ nombre: 'Losartán', dosis: '50 mg', horarios: [], instruccion: '' }),
    ).toContain('horario')
    expect(
      validarMedicamento({
        nombre: 'Losartán',
        dosis: '50 mg',
        horarios: ['08:00', '08:00'],
        instruccion: '',
      }),
    ).toContain('repetidos')
    expect(
      validarMedicamento({
        nombre: 'Losartán',
        dosis: '50 mg',
        horarios: ['25:99'],
        instruccion: '',
      }),
    ).toContain('formato válido')
    expect(
      validarMedicamento({
        nombre: 'Losartán',
        dosis: '50 mg',
        horarios: ['08:00', '20:00'],
        instruccion: 'Con alimentos',
      }),
    ).toBeNull()
  })
})

describe('validarMedicion y avisoPlausible', () => {
  const ahora = new Date('2026-08-19T10:00:00')
  const base = {
    tipo: 'presion' as const,
    sistolica: '125',
    diastolica: '80',
    pulso: '72',
    glucosa: '',
    contexto: 'ayunas' as const,
    peso: '',
    cuando: '2026-08-19T09:30',
    nota: '',
  }

  it('acepta una presión válida pero rechaza valores vacíos, fuera de límites fisiológicos o sistólica <= diastólica', () => {
    expect(validarMedicion(base, ahora).ok).toBe(true)
    const sinBaja = validarMedicion({ ...base, diastolica: '' }, ahora)
    expect(sinBaja.ok).toBe(false)
    const invertida = validarMedicion({ ...base, sistolica: '80', diastolica: '95' }, ahora)
    expect(invertida.ok).toBe(false)
    if (!invertida.ok) expect(invertida.error).toContain('mayor que la diastólica')

    const imposible = validarMedicion({ ...base, sistolica: '450', diastolica: '80' }, ahora)
    expect(imposible.ok).toBe(false)
  })

  it('permite guardar un valor alto pero plausible (200/120) dando un aviso suave sin bloquear', () => {
    expect(avisoPlausible('260', LIMITES_PLAUSIBLES.sistolica, 'La sistólica')).toContain(
      'puedes guardarlo igual',
    )
    expect(validarMedicion({ ...base, sistolica: '200', diastolica: '120' }, ahora).ok).toBe(true)
  })

  it('valida glucosa, peso y rechaza fechas en el futuro o notas de más de 500 caracteres', () => {
    expect(
      validarMedicion({ ...base, tipo: 'glucosa', glucosa: '105' }, ahora).ok,
    ).toBe(true)
    expect(
      validarMedicion({ ...base, tipo: 'glucosa', glucosa: '5' }, ahora).ok,
    ).toBe(false)
    expect(
      validarMedicion({ ...base, tipo: 'peso', peso: '155' }, ahora).ok,
    ).toBe(true)
    const futura = validarMedicion({ ...base, cuando: '2026-08-20T10:00' }, ahora)
    expect(futura.ok).toBe(false)
    if (!futura.ok) expect(futura.error).toContain('futuro')

    const notaLarga = validarMedicion({ ...base, nota: 'a'.repeat(505) }, ahora)
    expect(notaLarga.ok).toBe(false)
  })
})

describe('validarCita', () => {
  it('exige especialidad o médico, fecha válida y longitudes razonables', () => {
    expect(
      validarCita({ medico: '', especialidad: '', fechaHora: '2026-08-25T09:00', lugar: '', motivo: '' }),
    ).toContain('especialidad o el nombre del médico')
    expect(
      validarCita({ medico: 'Dra. Peña', especialidad: '', fechaHora: '', lugar: '', motivo: '' }),
    ).toContain('fecha y la hora')
    expect(
      validarCita({
        medico: 'Dra. Peña',
        especialidad: 'Cardiología',
        fechaHora: '2026-08-25T09:00',
        lugar: 'Consultorio 4',
        motivo: 'Control trimestral',
      }),
    ).toBeNull()
  })
})
