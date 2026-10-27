/* ============================================================================
   /bienvenida — Configuración inicial en 3 pasos
   ----------------------------------------------------------------------------
   Un paso por pantalla, con "Paso 1 de 3" siempre visible (heurística 1:
   visibilidad del estado del sistema) y "Atrás" siempre disponible
   (heurística 3: control y libertad del usuario).

   El paso 3 es el delicado. Los rangos objetivo NO son valores que Pulso
   sugiera: los pone el médico. Si la persona no los sabe, se deja en blanco y
   la app guarda las mediciones sin clasificarlas. Inventar un rango "normal"
   sería dar una opinión clínica, y eso está fuera de lo que esta app hace
   de esta aplicación.
   ========================================================================== */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, HeartPulse } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { CONDICIONES } from '../types'
import type { Perfil, RangosObjetivo } from '../types'
import Boton from '../components/Boton'
import { Tarjeta } from '../components/Tarjeta'
import { CampoTexto, CampoNumero } from '../components/Campos'
import { Chip } from '../components/Insignia'

const TOTAL_PASOS = 3

/** "" o basura → null. Solo se guarda lo que la persona escribió de verdad. */
const num = (v: string): number | null => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) ? n : null
}

export default function Bienvenida() {
  const { despachar, anunciar } = usePulso()
  const navegar = useNavigate()

  const [paso, setPaso] = useState(1)
  const [nombre, setNombre] = useState('')
  const [nacimiento, setNacimiento] = useState('')
  const [errorNombre, setErrorNombre] = useState<string | null>(null)
  const [condiciones, setCondiciones] = useState<string[]>([])
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoTel, setContactoTel] = useState('')
  const [r, setR] = useState({
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
  })

  const campo = (k: keyof typeof r) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setR((prev) => ({ ...prev, [k]: e.target.value }))

  function alternarCondicion(id: string) {
    setCondiciones((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  }

  function siguiente() {
    if (paso === 1) {
      if (nombre.trim().length < 2) {
        setErrorNombre('Escribe tu nombre para poder saludarte por él.')
        return
      }
      setErrorNombre(null)
    }
    setPaso((p) => Math.min(p + 1, TOTAL_PASOS))
  }

  function terminar() {
    const presion =
      num(r.sisMin) !== null && num(r.sisMax) !== null && num(r.diaMin) !== null && num(r.diaMax) !== null
        ? {
            sisMin: num(r.sisMin)!,
            sisMax: num(r.sisMax)!,
            diaMin: num(r.diaMin)!,
            diaMax: num(r.diaMax)!,
          }
        : null

    const glucosa =
      num(r.ayunasMin) !== null && num(r.ayunasMax) !== null
        ? {
            ayunasMin: num(r.ayunasMin)!,
            ayunasMax: num(r.ayunasMax)!,
            postMin: num(r.postMin) ?? num(r.ayunasMin)!,
            postMax: num(r.postMax) ?? num(r.ayunasMax)!,
          }
        : null

    const peso =
      num(r.pesoMin) !== null && num(r.pesoMax) !== null
        ? { min: num(r.pesoMin)!, max: num(r.pesoMax)! }
        : null

    const rangosObjetivo: RangosObjetivo = { presion, glucosa, peso }

    const perfil: Perfil = {
      nombre: nombre.trim(),
      fechaNacimiento: nacimiento,
      condiciones,
      contactoEmergencia:
        contactoNombre.trim() && contactoTel.trim()
          ? { nombre: contactoNombre.trim(), telefono: contactoTel.trim() }
          : null,
      rangosObjetivo,
    }

    despachar({ tipo: 'GUARDAR_PERFIL', perfil })
    anunciar(`Perfil creado. Bienvenida, ${perfil.nombre}.`)
    navegar('/', { replace: true })
  }

  return (
    <div className="animar-entrar mx-auto max-w-[34rem] py-4">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-salvia-suave text-salvia-fuerte">
          <HeartPulse size={28} aria-hidden="true" />
        </div>
        <h1 className="font-display text-[1.9rem] text-tinta">Bienvenida a Pulso</h1>
        <p className="mt-1 text-bruma-texto">
          Tu libreta de salud, sin papeles que se pierdan.
        </p>
      </div>

      {/* Indicador de progreso: heurística 1 */}
      <div className="mb-5">
        <p className="mb-2 text-center font-semibold text-tinta">
          Paso {paso} de {TOTAL_PASOS}
        </p>
        <div
          role="progressbar"
          aria-valuenow={paso}
          aria-valuemin={1}
          aria-valuemax={TOTAL_PASOS}
          aria-label={`Configuración inicial, paso ${paso} de ${TOTAL_PASOS}`}
          className="flex gap-1.5"
        >
          {[1, 2, 3].map((p) => (
            <span
              key={p}
              className={`h-2 flex-1 rounded-full ${p <= paso ? 'bg-salvia-fuerte' : 'bg-borde'}`}
            />
          ))}
        </div>
      </div>

      <Tarjeta className="px-4 py-5 sm:px-6">
        {paso === 1 && (
          <>
            <h2 className="mb-4 font-display text-[1.3rem]">¿Cómo te llamamos?</h2>
            <CampoTexto
              etiqueta="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={errorNombre}
              autoComplete="given-name"
              placeholder="María"
            />
            <CampoTexto
              etiqueta="Fecha de nacimiento"
              type="date"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
              ayuda="Aparece en el informe que le llevas a tu médico. Puedes dejarla en blanco."
            />
          </>
        )}

        {paso === 2 && (
          <>
            <h2 className="mb-2 font-display text-[1.3rem]">¿Qué llevas en control?</h2>
            <p className="mb-4 text-bruma-texto">
              Toca las que apliquen. Puedes cambiarlas después en Ajustes.
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {CONDICIONES.map((c) => (
                <Chip
                  key={c.id}
                  activo={condiciones.includes(c.id)}
                  onClick={() => alternarCondicion(c.id)}
                >
                  {c.etiqueta}
                </Chip>
              ))}
            </div>

            <h3 className="mb-1 font-display text-[1.15rem]">Contacto de emergencia</h3>
            <p className="mb-3 text-[0.95rem] text-bruma-texto">
              Opcional. Solo aparece en tu informe impreso; no se envía a ningún lado.
            </p>
            <CampoTexto
              etiqueta="Nombre"
              value={contactoNombre}
              onChange={(e) => setContactoNombre(e.target.value)}
              placeholder="Yaneiris (hija)"
            />
            <CampoTexto
              etiqueta="Teléfono"
              type="tel"
              inputMode="tel"
              value={contactoTel}
              onChange={(e) => setContactoTel(e.target.value)}
              placeholder="809-000-0000"
            />
          </>
        )}

        {paso === 3 && (
          <>
            <h2 className="mb-2 font-display text-[1.3rem]">Tus rangos objetivo</h2>
            <div className="mb-5 rounded-xl border-2 border-salvia-fuerte/30 bg-salvia-suave px-4 py-3">
              <p className="text-[1.02rem] leading-relaxed text-tinta">
                <strong>Estos valores los define tu médico.</strong> Si no los sabes, déjalo en
                blanco y Pulso guardará tus mediciones sin clasificarlas.
              </p>
            </div>

            <fieldset className="mb-4 border-0 p-0">
              <legend className="mb-3 font-display text-[1.1rem]">Presión arterial (mmHg)</legend>
              <div className="grid grid-cols-2 gap-x-4">
                <CampoNumero etiqueta="Sistólica mín." value={r.sisMin} onChange={campo('sisMin')} />
                <CampoNumero etiqueta="Sistólica máx." value={r.sisMax} onChange={campo('sisMax')} />
                <CampoNumero etiqueta="Diastólica mín." value={r.diaMin} onChange={campo('diaMin')} />
                <CampoNumero etiqueta="Diastólica máx." value={r.diaMax} onChange={campo('diaMax')} />
              </div>
            </fieldset>

            <fieldset className="mb-4 border-0 p-0">
              <legend className="mb-3 font-display text-[1.1rem]">Glucosa (mg/dL)</legend>
              <div className="grid grid-cols-2 gap-x-4">
                <CampoNumero
                  etiqueta="En ayunas mín."
                  value={r.ayunasMin}
                  onChange={campo('ayunasMin')}
                />
                <CampoNumero
                  etiqueta="En ayunas máx."
                  value={r.ayunasMax}
                  onChange={campo('ayunasMax')}
                />
                <CampoNumero
                  etiqueta="Después de comer mín."
                  value={r.postMin}
                  onChange={campo('postMin')}
                  ayuda="Dos horas después de una comida."
                />
                <CampoNumero
                  etiqueta="Después de comer máx."
                  value={r.postMax}
                  onChange={campo('postMax')}
                />
              </div>
            </fieldset>

            <fieldset className="border-0 p-0">
              <legend className="mb-3 font-display text-[1.1rem]">Peso (libras)</legend>
              <div className="grid grid-cols-2 gap-x-4">
                <CampoNumero etiqueta="Mínimo" value={r.pesoMin} onChange={campo('pesoMin')} />
                <CampoNumero etiqueta="Máximo" value={r.pesoMax} onChange={campo('pesoMax')} />
              </div>
            </fieldset>
          </>
        )}
      </Tarjeta>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Boton
          onClick={() => (paso === 1 ? navegar(-1) : setPaso((p) => p - 1))}
          disabled={paso === 1}
          icono={<ArrowLeft size={20} aria-hidden="true" />}
        >
          Atrás
        </Boton>

        {paso < TOTAL_PASOS ? (
          <Boton
            variante="primario"
            tamano="grande"
            onClick={siguiente}
            icono={<ArrowRight size={20} aria-hidden="true" />}
          >
            Continuar
          </Boton>
        ) : (
          <Boton
            variante="primario"
            tamano="grande"
            onClick={terminar}
            icono={<Check size={20} aria-hidden="true" />}
          >
            Empezar a usar Pulso
          </Boton>
        )}
      </div>

      {paso === 2 && (
        <p className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setPaso(3)}
            className="min-h-[3rem] px-3 text-salvia-fuerte underline underline-offset-4"
          >
            Saltar este paso
          </button>
        </p>
      )}
      {paso === 3 && (
        <p className="mt-3 text-center">
          <button
            type="button"
            onClick={terminar}
            className="min-h-[3rem] px-3 text-salvia-fuerte underline underline-offset-4"
          >
            No sé mis rangos, continuar sin ellos
          </button>
        </p>
      )}
    </div>
  )
}
