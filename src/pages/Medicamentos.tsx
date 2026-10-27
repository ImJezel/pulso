/* ============================================================================
   /medicamentos — Medicamentos
   ----------------------------------------------------------------------------
   Dos ideas de diseño que valen más que el CRUD:

   1. "Desactivar" está al mismo nivel que "Eliminar". Un tratamiento que se
      suspende no debería obligar a borrar tres meses de historial: eso es
      justo lo que el médico querrá revisar.
   2. El diálogo de eliminar dice CUÁNTO se pierde, con el número contado de
      verdad: "se eliminarán 42 registros de dosis". Un "¿Estás seguro?" sin
      cifra no informa nada (heurística 5: prevención de errores).
   ========================================================================== */

import { useMemo, useState } from 'react'
import { Pill, Plus, Trash2, Power, Pencil, Clock, X } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion } from '../components/Tarjeta'
import EstadoVacio from '../components/EstadoVacio'
import Boton from '../components/Boton'
import Panel, { Confirmacion } from '../components/Panel'
import { CampoTexto } from '../components/Campos'
import { horaTexto } from '../lib/fechas'
import { isoLocal } from '../lib/fechas'
import type { Medicamento } from '../types'

const HORARIOS_SUGERIDOS = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00']

interface Borrador {
  id: string | null
  nombre: string
  dosis: string
  horarios: string[]
  instruccion: string
}

const BORRADOR_VACIO: Borrador = {
  id: null,
  nombre: '',
  dosis: '',
  horarios: [],
  instruccion: '',
}

export default function Medicamentos() {
  const { estado, despachar, despacharConDeshacer, anunciar, nuevoId } = usePulso()

  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [horaNueva, setHoraNueva] = useState('08:00')
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<Medicamento | null>(null)

  const activos = estado.medicamentos.filter((m) => m.activo)
  const inactivos = estado.medicamentos.filter((m) => !m.activo)

  const conteoDosis = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const r of estado.registrosDosis) {
      mapa.set(r.medicamentoId, (mapa.get(r.medicamentoId) ?? 0) + 1)
    }
    return mapa
  }, [estado.registrosDosis])

  function abrirNuevo() {
    setBorrador({ ...BORRADOR_VACIO })
    setError(null)
  }

  function abrirEdicion(m: Medicamento) {
    setBorrador({
      id: m.id,
      nombre: m.nombre,
      dosis: m.dosis,
      horarios: [...m.horarios],
      instruccion: m.instruccion,
    })
    setError(null)
  }

  function agregarHora() {
    if (!borrador || !horaNueva) return
    if (borrador.horarios.includes(horaNueva)) {
      setError(`Ya tienes una toma a las ${horaTexto(horaNueva)}.`)
      return
    }
    setError(null)
    setBorrador({ ...borrador, horarios: [...borrador.horarios, horaNueva].sort() })
  }

  function quitarHora(h: string) {
    if (!borrador) return
    setBorrador({ ...borrador, horarios: borrador.horarios.filter((x) => x !== h) })
  }

  function guardar() {
    if (!borrador) return
    if (borrador.nombre.trim().length < 2) {
      setError('Escribe el nombre del medicamento.')
      return
    }
    if (borrador.horarios.length === 0) {
      setError('Agrega al menos un horario. Sin horario, Pulso no puede recordarte la toma.')
      return
    }

    if (borrador.id) {
      const original = estado.medicamentos.find((m) => m.id === borrador.id)
      if (!original) return
      despachar({
        tipo: 'ACTUALIZAR_MEDICAMENTO',
        medicamento: {
          ...original,
          nombre: borrador.nombre.trim(),
          dosis: borrador.dosis.trim(),
          horarios: borrador.horarios,
          instruccion: borrador.instruccion.trim(),
        },
      })
      anunciar(`${borrador.nombre.trim()} actualizado.`)
    } else {
      despachar({
        tipo: 'AGREGAR_MEDICAMENTO',
        medicamento: {
          id: nuevoId('med'),
          nombre: borrador.nombre.trim(),
          dosis: borrador.dosis.trim(),
          horarios: borrador.horarios,
          instruccion: borrador.instruccion.trim(),
          activo: true,
          creadoEn: isoLocal(new Date()),
        },
      })
      anunciar(`${borrador.nombre.trim()} agregado con ${borrador.horarios.length} horario(s).`)
    }
    setBorrador(null)
  }

  function eliminar() {
    if (!aEliminar) return
    despacharConDeshacer(
      { tipo: 'ELIMINAR_MEDICAMENTO', id: aEliminar.id },
      `${aEliminar.nombre} eliminado.`,
    )
    setAEliminar(null)
  }

  function renderMedicamento(m: Medicamento) {
    return (
      <Tarjeta as="li" key={m.id} className={`px-4 py-4 ${m.activo ? '' : 'bg-lino'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[12rem] flex-1">
            <p className="font-display text-[1.25rem] text-tinta">
              {m.nombre} <span className="cifra text-[1rem]">{m.dosis}</span>
            </p>
            {m.instruccion && <p className="text-bruma-texto">{m.instruccion}</p>}
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {m.horarios.map((h) => (
                <li
                  key={h}
                  className="cifra rounded-full border border-borde bg-lino px-2.5 py-1 text-[0.9rem] text-tinta"
                >
                  {horaTexto(h)}
                </li>
              ))}
            </ul>
            {!m.activo && (
              <p className="mt-2 text-[0.9rem] font-semibold text-bruma-texto">
                Desactivado. No aparece en Hoy, pero su historial se conserva.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Boton tamano="compacto" onClick={() => abrirEdicion(m)} icono={<Pencil size={16} aria-hidden="true" />}>
              Editar
            </Boton>
            <Boton
              tamano="compacto"
              onClick={() => {
                despachar({ tipo: 'ALTERNAR_MEDICAMENTO', id: m.id })
                anunciar(`${m.nombre} ${m.activo ? 'desactivado' : 'activado'}.`)
              }}
              icono={<Power size={16} aria-hidden="true" />}
            >
              {m.activo ? 'Desactivar' : 'Activar'}
            </Boton>
            <Boton
              tamano="compacto"
              variante="sutil"
              onClick={() => setAEliminar(m)}
              icono={<Trash2 size={16} aria-hidden="true" />}
              className="text-ladrillo"
            >
              Eliminar
            </Boton>
          </div>
        </div>
      </Tarjeta>
    )
  }

  return (
    <div className="animar-entrar space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[1.8rem] text-tinta">Medicamentos</h1>
        <Boton variante="primario" onClick={abrirNuevo} icono={<Plus size={20} aria-hidden="true" />}>
          Agregar
        </Boton>
      </div>

      {estado.medicamentos.length === 0 ? (
        <EstadoVacio
          icono={<Pill size={26} aria-hidden="true" />}
          titulo="Todavía no hay medicamentos"
          mensaje="Agrega el primero con su dosis y sus horarios. Pulso se encarga de recordártelo cada día."
          accion={
            <Boton variante="primario" tamano="grande" onClick={abrirNuevo} icono={<Plus size={20} aria-hidden="true" />}>
              Agregar medicamento
            </Boton>
          }
        />
      ) : (
        <>
          <section aria-labelledby="t-activos">
            <TituloSeccion id="t-activos">
              Activos <span className="cifra text-[1rem] text-bruma-texto">({activos.length})</span>
            </TituloSeccion>
            {activos.length === 0 ? (
              <p className="rounded-tarjeta border border-dashed border-borde-fuerte bg-lino px-4 py-6 text-center text-bruma-texto">
                No tienes medicamentos activos. Activa uno de la lista de abajo o agrega otro.
              </p>
            ) : (
              <ul className="space-y-3">{activos.map(renderMedicamento)}</ul>
            )}
          </section>

          {inactivos.length > 0 && (
            <section aria-labelledby="t-inactivos">
              <TituloSeccion id="t-inactivos">
                Inactivos{' '}
                <span className="cifra text-[1rem] text-bruma-texto">({inactivos.length})</span>
              </TituloSeccion>
              <ul className="space-y-3">{inactivos.map(renderMedicamento)}</ul>
            </section>
          )}
        </>
      )}

      {/* --- Panel de alta / edición ------------------------------------- */}
      <Panel
        abierto={borrador !== null}
        titulo={borrador?.id ? 'Editar medicamento' : 'Agregar medicamento'}
        onCerrar={() => setBorrador(null)}
        pie={
          <>
            <Boton onClick={() => setBorrador(null)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardar}>
              Guardar
            </Boton>
          </>
        }
      >
        {borrador && (
          <>
            <CampoTexto
              etiqueta="Nombre"
              value={borrador.nombre}
              onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
              placeholder="Losartán"
              autoFocus
            />
            <CampoTexto
              etiqueta="Dosis"
              value={borrador.dosis}
              onChange={(e) => setBorrador({ ...borrador, dosis: e.target.value })}
              placeholder="50 mg"
              ayuda="Como aparece en la caja: «50 mg», «una tableta», «10 unidades»."
            />

            <fieldset className="mb-4 border-0 p-0">
              <legend className="mb-1.5 font-semibold text-tinta">Horarios</legend>
              <p className="mb-2 text-[0.9rem] text-bruma-texto">
                Agrega una hora por cada toma del día.
              </p>

              {borrador.horarios.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {borrador.horarios.map((h) => (
                    <li key={h}>
                      <button
                        type="button"
                        onClick={() => quitarHora(h)}
                        className="cifra flex min-h-[3rem] items-center gap-2 rounded-full border-2 border-salvia-fuerte bg-salvia-suave px-3 text-salvia-fuerte"
                      >
                        <Clock size={16} aria-hidden="true" />
                        {horaTexto(h)}
                        <X size={16} aria-hidden="true" />
                        <span className="solo-lectores">Quitar esta hora</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="mb-1.5 block text-[0.9rem] font-semibold">Nueva hora</span>
                  <input
                    type="time"
                    value={horaNueva}
                    onChange={(e) => setHoraNueva(e.target.value)}
                    className="cifra w-full min-h-[3rem] rounded-xl border-2 border-borde-fuerte bg-papel px-3"
                  />
                </label>
                <Boton onClick={agregarHora} icono={<Plus size={18} aria-hidden="true" />}>
                  Agregar hora
                </Boton>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {HORARIOS_SUGERIDOS.filter((h) => !borrador.horarios.includes(h)).map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() =>
                        setBorrador({ ...borrador, horarios: [...borrador.horarios, h].sort() })
                      }
                      className="cifra min-h-[3rem] rounded-full border border-borde bg-lino px-3 text-[0.9rem] hover:bg-salvia-suave"
                    >
                      + {horaTexto(h)}
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>

            <CampoTexto
              etiqueta="Instrucción (opcional)"
              value={borrador.instruccion}
              onChange={(e) => setBorrador({ ...borrador, instruccion: e.target.value })}
              placeholder="Con alimentos"
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl border-2 border-ambar-texto bg-ambar-suave px-3 py-2.5 font-semibold text-ambar-texto"
              >
                {error}
              </p>
            )}
          </>
        )}
      </Panel>

      {/* --- Confirmación de borrado ------------------------------------- */}
      <Confirmacion
        abierto={aEliminar !== null}
        titulo={`Eliminar ${aEliminar?.nombre ?? ''}`}
        mensaje={
          aEliminar
            ? `Se eliminará ${aEliminar.nombre} y sus ${
                conteoDosis.get(aEliminar.id) ?? 0
              } registros de dosis. Esta acción no se puede deshacer una vez que cierres la barra de "Deshacer". Si solo dejaste de tomarlo, es mejor desactivarlo: así conservas el historial.`
            : ''
        }
        textoConfirmar="Sí, eliminar"
        onConfirmar={eliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  )
}
