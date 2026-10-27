/* ============================================================================
   /registrar — Registrar medición
   ----------------------------------------------------------------------------
   Meta de rendimiento: una glucosa en 3 toques y menos de 15 segundos.
   Toque 1: el tipo. Toque 2: el campo (ya viene enfocado el primero).
   Toque 3: Guardar. La fecha y la hora vienen puestas en "ahora".

   La validación es un AVISO, nunca un candado. Si alguien midió 200/120, ese
   número tiene que poder guardarse: es justo el que el médico necesita ver.
   Lo que hace la app es preguntar "¿revisaste el número?" y seguir adelante
   (heurísticas 5 y 9).
   ========================================================================== */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Check, Droplet, Scale, Plus } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, Cifra } from '../components/Tarjeta'
import { CampoNumero, CampoArea, CampoTexto } from '../components/Campos'
import Boton from '../components/Boton'
import Insignia from '../components/Insignia'
import {
  clasificar,
  LIMITES_PLAUSIBLES,
  mensajeClasificacion,
  NOMBRE_TIPO,
  UNIDADES,
  valorPrincipal,
} from '../lib/rangos'
import { fechaHoraCorta, isoLocal, paraInput } from '../lib/fechas'
import type { ContextoGlucosa, Medicion, TipoMedicion } from '../types'

const TIPOS: { id: TipoMedicion; etiqueta: string; Icono: typeof Activity }[] = [
  { id: 'presion', etiqueta: 'Presión', Icono: Activity },
  { id: 'glucosa', etiqueta: 'Glucosa', Icono: Droplet },
  { id: 'peso', etiqueta: 'Peso', Icono: Scale },
]

/** Aviso suave cuando un número se sale de lo que un aparato suele medir. */
function avisoPlausible(
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

export default function Registrar() {
  const { estado, despacharConDeshacer, nuevoId } = usePulso()

  const [tipo, setTipo] = useState<TipoMedicion>('presion')
  const [sistolica, setSistolica] = useState('')
  const [diastolica, setDiastolica] = useState('')
  const [pulso, setPulso] = useState('')
  const [glucosa, setGlucosa] = useState('')
  const [contexto, setContexto] = useState<ContextoGlucosa>('ayunas')
  const [peso, setPeso] = useState('')
  const [nota, setNota] = useState('')
  const [cuando, setCuando] = useState(() => paraInput(new Date()))
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardada, setGuardada] = useState<Medicion | null>(null)

  function limpiar() {
    setSistolica('')
    setDiastolica('')
    setPulso('')
    setGlucosa('')
    setPeso('')
    setNota('')
    setCuando(paraInput(new Date()))
    setErrorGeneral(null)
    setGuardada(null)
  }

  function guardar() {
    const fechaHora = cuando ? `${cuando}:00` : isoLocal(new Date())

    let valores: Medicion['valores']
    if (tipo === 'presion') {
      if (!sistolica.trim() || !diastolica.trim()) {
        setErrorGeneral('Para guardar una presión hacen falta los dos números: la alta y la baja.')
        return
      }
      valores = {
        sistolica: Number(sistolica),
        diastolica: Number(diastolica),
        ...(pulso.trim() ? { pulso: Number(pulso) } : {}),
      }
    } else if (tipo === 'glucosa') {
      if (!glucosa.trim()) {
        setErrorGeneral('Escribe el valor de la glucosa para poder guardarlo.')
        return
      }
      valores = { glucosa: Number(glucosa), contexto }
    } else {
      if (!peso.trim()) {
        setErrorGeneral('Escribe tu peso para poder guardarlo.')
        return
      }
      valores = { peso: Number(peso) }
    }

    const medicion: Medicion = {
      id: nuevoId('med'),
      tipo,
      fechaHora,
      valores,
      nota: nota.trim(),
    }

    const clasificacion = clasificar(medicion, estado.perfil?.rangosObjetivo)
    setErrorGeneral(null)
    setGuardada(medicion)
    despacharConDeshacer(
      { tipo: 'AGREGAR_MEDICION', medicion },
      `${NOMBRE_TIPO[tipo]} guardada: ${valorPrincipal(medicion)} ${UNIDADES[tipo]}.`,
    )
    // El anuncio para lector de pantalla ya salió; el detalle se ve en pantalla.
    void clasificacion
  }

  /* --- Pantalla de confirmación ------------------------------------------ */
  if (guardada) {
    const clasificacion = clasificar(guardada, estado.perfil?.rangosObjetivo)
    return (
      <div className="animar-entrar space-y-5">
        <h1 className="font-display text-[1.8rem] text-tinta">Medición guardada</h1>

        <Tarjeta className="px-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-bruma-texto">{NOMBRE_TIPO[guardada.tipo]}</p>
              <Cifra valor={valorPrincipal(guardada)} unidad={UNIDADES[guardada.tipo]} />
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-salvia-suave text-salvia-fuerte">
              <Check size={26} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 border-t border-borde pt-4">
            <Insignia clasificacion={clasificacion} />
            <p className="mt-2 text-[1.05rem] leading-relaxed">
              {mensajeClasificacion(clasificacion)}
            </p>
            {clasificacion === 'sin-referencia' && (
              <Link
                to="/ajustes"
                className="mt-2 inline-block min-h-[3rem] content-center text-salvia-fuerte underline underline-offset-4"
              >
                Agregar los rangos que me dio mi médico
              </Link>
            )}
          </div>
        </Tarjeta>

        <p className="text-bruma-texto">
          Si te equivocaste, usa <strong>Deshacer</strong> en la barra de abajo.
        </p>

        <div className="flex flex-wrap gap-3">
          <Boton variante="primario" tamano="grande" onClick={limpiar} icono={<Plus size={20} aria-hidden="true" />}>
            Registrar otra
          </Boton>
          <Link to="/">
            <Boton tamano="grande">Volver a Hoy</Boton>
          </Link>
        </div>
      </div>
    )
  }

  /* --- Formulario --------------------------------------------------------- */
  const avisoSis = avisoPlausible(sistolica, LIMITES_PLAUSIBLES.sistolica, 'La sistólica (la alta)')
  const avisoDia = avisoPlausible(diastolica, LIMITES_PLAUSIBLES.diastolica, 'La diastólica (la baja)')
  const avisoPul = avisoPlausible(pulso, LIMITES_PLAUSIBLES.pulso, 'El pulso')
  const avisoGlu = avisoPlausible(glucosa, LIMITES_PLAUSIBLES.glucosa, 'La glucosa')
  const avisoPeso = avisoPlausible(peso, LIMITES_PLAUSIBLES.peso, 'El peso')

  return (
    <div className="animar-entrar">
      <h1 className="mb-4 font-display text-[1.8rem] text-tinta">Registrar medición</h1>

      {/* Toque 1: el tipo */}
      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-2 font-semibold text-tinta">¿Qué vas a registrar?</legend>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tipo === id}
              onClick={() => {
                setTipo(id)
                setErrorGeneral(null)
              }}
              className={`flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-tarjeta border-2 px-2 py-3 font-semibold transition-colors duration-200 ${
                tipo === id
                  ? 'border-salvia-fuerte bg-salvia-fuerte text-white'
                  : 'border-borde-fuerte bg-papel text-tinta hover:bg-salvia-suave'
              }`}
            >
              <Icono size={26} aria-hidden="true" />
              {etiqueta}
            </button>
          ))}
        </div>
      </fieldset>

      <Tarjeta className="px-4 py-5">
        {tipo === 'presion' && (
          <>
            <div className="grid grid-cols-2 gap-x-4">
              <CampoNumero
                etiqueta="Sistólica (alta)"
                value={sistolica}
                onChange={(e) => setSistolica(e.target.value)}
                error={avisoSis}
                sufijo="mmHg"
                autoFocus
                placeholder="120"
              />
              <CampoNumero
                etiqueta="Diastólica (baja)"
                value={diastolica}
                onChange={(e) => setDiastolica(e.target.value)}
                error={avisoDia}
                sufijo="mmHg"
                placeholder="80"
              />
            </div>
            <CampoNumero
              etiqueta="Pulso (opcional)"
              value={pulso}
              onChange={(e) => setPulso(e.target.value)}
              error={avisoPul}
              sufijo="lpm"
              ayuda="Los latidos por minuto, si tu aparato los muestra."
              placeholder="72"
            />
          </>
        )}

        {tipo === 'glucosa' && (
          <>
            <CampoNumero
              etiqueta="Glucosa"
              value={glucosa}
              onChange={(e) => setGlucosa(e.target.value)}
              error={avisoGlu}
              sufijo="mg/dL"
              autoFocus
              placeholder="95"
            />
            <fieldset className="mb-4 border-0 p-0">
              <legend className="mb-1.5 font-semibold text-tinta">¿Cuándo te la mediste?</legend>
              <p className="mb-2 text-[0.9rem] text-bruma-texto">
                «Después de comer» significa unas dos horas después de una comida. El rango objetivo
                es distinto en cada caso.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['ayunas', 'En ayunas'],
                    ['postprandial', 'Después de comer'],
                  ] as [ContextoGlucosa, string][]
                ).map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={contexto === valor}
                    onClick={() => setContexto(valor)}
                    className={`min-h-[3.25rem] rounded-xl border-2 px-3 font-semibold transition-colors duration-200 ${
                      contexto === valor
                        ? 'border-salvia-fuerte bg-salvia-fuerte text-white'
                        : 'border-borde-fuerte bg-papel text-tinta hover:bg-salvia-suave'
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {tipo === 'peso' && (
          <CampoNumero
            etiqueta="Peso"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            error={avisoPeso}
            sufijo="lb"
            autoFocus
            placeholder="150"
          />
        )}

        {/* Corrección H-10: el control nativo de fecha se pinta en el formato
            del navegador (08/19/2026 en un Windows en inglés). No se puede
            cambiar por CSS ni por atributo, así que debajo se repite el valor
            en formato dominicano, que es lo que la persona espera leer. */}
        <CampoTexto
          etiqueta="Fecha y hora"
          type="datetime-local"
          value={cuando}
          onChange={(e) => setCuando(e.target.value)}
          ayuda={
            cuando
              ? `Guardarás esta medición con fecha ${fechaHoraCorta(`${cuando}:00`)}. Cámbiala solo si estás anotando algo de antes.`
              : 'Viene puesta en este momento. Cámbiala solo si estás anotando algo de antes.'
          }
        />

        <CampoArea
          etiqueta="Nota (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          ayuda="Por ejemplo: «me sentí mareada» o «después de caminar»."
        />

        {errorGeneral && (
          <p
            role="alert"
            className="mb-4 rounded-xl border-2 border-ladrillo bg-ladrillo-suave px-3 py-2.5 font-semibold text-ladrillo"
          >
            {errorGeneral}
          </p>
        )}

        <Boton
          variante="primario"
          tamano="grande"
          anchoCompleto
          onClick={guardar}
          icono={<Check size={22} aria-hidden="true" />}
        >
          Guardar medición
        </Boton>
      </Tarjeta>

      <p className="mt-4 text-center text-[0.9rem] text-bruma-texto">
        Pulso guarda lo que escribes. No interpreta síntomas ni ajusta tratamientos.
      </p>
    </div>
  )
}
