/* ============================================================================
   /citas — Citas médicas
   ----------------------------------------------------------------------------
   Las citas pasadas van en un <details> nativo del navegador: se pliega y se
   despliega con teclado, lo anuncian los lectores de pantalla y no cuesta ni
   una línea de JavaScript.

   "Agregar al calendario" genera un archivo .ics de verdad (lib/ics.ts). Es el
   único puente de Pulso con el resto del teléfono, y va en una dirección:
   sale un archivo, no entra nada ni se envía nada.
   ========================================================================== */

import { useState } from 'react'
import { CalendarDays, CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion } from '../components/Tarjeta'
import EstadoVacio from '../components/EstadoVacio'
import Boton from '../components/Boton'
import Panel, { Confirmacion } from '../components/Panel'
import { CampoTexto, CampoArea } from '../components/Campos'
import { descargarICS } from '../lib/ics'
import { fechaHoraCorta, paraInput, relativo } from '../lib/fechas'
import type { Cita } from '../types'

interface Borrador {
  id: string | null
  medico: string
  especialidad: string
  fechaHora: string
  lugar: string
  motivo: string
}

export default function Citas() {
  const { estado, despachar, despacharConDeshacer, anunciar, nuevoId } = usePulso()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<Cita | null>(null)

  const ahora = new Date()
  const ordenadas = [...estado.citas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
  const proximas = ordenadas.filter((c) => new Date(c.fechaHora) >= ahora)
  const pasadas = ordenadas.filter((c) => new Date(c.fechaHora) < ahora).reverse()

  function abrirNueva() {
    const enUnaSemana = new Date()
    enUnaSemana.setDate(enUnaSemana.getDate() + 7)
    enUnaSemana.setHours(9, 0, 0, 0)
    setBorrador({
      id: null,
      medico: '',
      especialidad: '',
      fechaHora: paraInput(enUnaSemana),
      lugar: '',
      motivo: '',
    })
    setError(null)
  }

  function abrirEdicion(c: Cita) {
    setBorrador({ ...c, fechaHora: c.fechaHora.slice(0, 16) })
    setError(null)
  }

  function guardar() {
    if (!borrador) return
    if (!borrador.especialidad.trim() && !borrador.medico.trim()) {
      setError('Escribe al menos la especialidad o el nombre del médico.')
      return
    }
    if (!borrador.fechaHora) {
      setError('Falta la fecha y la hora de la cita.')
      return
    }

    const cita: Cita = {
      id: borrador.id ?? nuevoId('cita'),
      medico: borrador.medico.trim(),
      especialidad: borrador.especialidad.trim() || 'Consulta',
      fechaHora: `${borrador.fechaHora}:00`,
      lugar: borrador.lugar.trim(),
      motivo: borrador.motivo.trim(),
    }

    despachar(borrador.id ? { tipo: 'ACTUALIZAR_CITA', cita } : { tipo: 'AGREGAR_CITA', cita })
    anunciar(`Cita de ${cita.especialidad} guardada para el ${fechaHoraCorta(cita.fechaHora)}.`)
    setBorrador(null)
  }

  function renderCita(c: Cita, pasada = false) {
    return (
      <Tarjeta as="li" key={c.id} className={`px-4 py-4 ${pasada ? 'bg-lino' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[12rem] flex-1">
            <p className="font-display text-[1.2rem] text-tinta">
              {c.especialidad}
              {c.medico ? ` — ${c.medico}` : ''}
            </p>
            <p className="text-tinta">
              <span className="cifra">{fechaHoraCorta(c.fechaHora)}</span>{' '}
              <span className="text-bruma-texto">({relativo(c.fechaHora)})</span>
            </p>
            {c.lugar && <p className="text-bruma-texto">{c.lugar}</p>}
            {c.motivo && <p className="mt-1 text-tinta">{c.motivo}</p>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {!pasada && (
              <Boton
                tamano="compacto"
                onClick={() => {
                  descargarICS(c)
                  anunciar('Archivo de calendario descargado.')
                }}
                icono={<CalendarPlus size={16} aria-hidden="true" />}
              >
                Agregar al calendario
              </Boton>
            )}
            <Boton tamano="compacto" onClick={() => abrirEdicion(c)} icono={<Pencil size={16} aria-hidden="true" />}>
              Editar
            </Boton>
            <Boton
              tamano="compacto"
              variante="sutil"
              className="text-ladrillo"
              onClick={() => setAEliminar(c)}
              icono={<Trash2 size={16} aria-hidden="true" />}
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
        <h1 className="font-display text-[1.8rem] text-tinta">Citas</h1>
        <Boton variante="primario" onClick={abrirNueva} icono={<Plus size={20} aria-hidden="true" />}>
          Agregar
        </Boton>
      </div>

      {estado.citas.length === 0 ? (
        <EstadoVacio
          icono={<CalendarDays size={26} aria-hidden="true" />}
          titulo="No tienes citas guardadas"
          mensaje="Anota tu próxima consulta. Pulso te la recuerda en la pantalla de Hoy cuando falten menos de 14 días."
          accion={
            <Boton variante="primario" tamano="grande" onClick={abrirNueva} icono={<Plus size={20} aria-hidden="true" />}>
              Agregar cita
            </Boton>
          }
        />
      ) : (
        <>
          <section aria-labelledby="t-proximas">
            <TituloSeccion id="t-proximas">Próximas</TituloSeccion>
            {proximas.length === 0 ? (
              <p className="rounded-tarjeta border border-dashed border-borde-fuerte bg-lino px-4 py-6 text-center text-bruma-texto">
                No tienes citas próximas. Cuando tu médico te dé la siguiente, anótala aquí.
              </p>
            ) : (
              <ul className="space-y-3">{proximas.map((c) => renderCita(c))}</ul>
            )}
          </section>

          {pasadas.length > 0 && (
            <details className="rounded-tarjeta border border-borde bg-papel">
              <summary className="min-h-[3rem] cursor-pointer content-center px-4 font-semibold text-tinta">
                Citas pasadas ({pasadas.length})
              </summary>
              <ul className="space-y-3 px-3 pb-3">{pasadas.map((c) => renderCita(c, true))}</ul>
            </details>
          )}
        </>
      )}

      <Panel
        abierto={borrador !== null}
        titulo={borrador?.id ? 'Editar cita' : 'Agregar cita'}
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
              etiqueta="Especialidad"
              value={borrador.especialidad}
              onChange={(e) => setBorrador({ ...borrador, especialidad: e.target.value })}
              placeholder="Cardiología"
              autoFocus
            />
            <CampoTexto
              etiqueta="Médico"
              value={borrador.medico}
              onChange={(e) => setBorrador({ ...borrador, medico: e.target.value })}
              placeholder="Dra. Carmen Peña"
            />
            <CampoTexto
              etiqueta="Fecha y hora"
              type="datetime-local"
              value={borrador.fechaHora}
              onChange={(e) => setBorrador({ ...borrador, fechaHora: e.target.value })}
            />
            <CampoTexto
              etiqueta="Lugar"
              value={borrador.lugar}
              onChange={(e) => setBorrador({ ...borrador, lugar: e.target.value })}
              placeholder="Centro de Salud, consultorio 4"
            />
            <CampoArea
              etiqueta="Motivo o recordatorio"
              value={borrador.motivo}
              onChange={(e) => setBorrador({ ...borrador, motivo: e.target.value })}
              ayuda="Por ejemplo: «llevar el informe de los últimos 30 días»."
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

      <Confirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar cita"
        mensaje={
          aEliminar
            ? `Se eliminará la cita de ${aEliminar.especialidad} del ${fechaHoraCorta(
                aEliminar.fechaHora,
              )}. Puedes deshacerlo durante los próximos 8 segundos.`
            : ''
        }
        textoConfirmar="Sí, eliminar"
        onConfirmar={() => {
          if (!aEliminar) return
          despacharConDeshacer({ tipo: 'ELIMINAR_CITA', id: aEliminar.id }, 'Cita eliminada.')
          setAEliminar(null)
        }}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  )
}
