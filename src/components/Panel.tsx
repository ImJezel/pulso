/* ============================================================================
   Panel modal y diálogo de confirmación
   ----------------------------------------------------------------------------
   Se usa el <dialog> nativo del navegador a propósito. Con showModal() se
   obtienen gratis, y bien hechas, cuatro cosas que a mano salen mal:
   atrapar el foco dentro del panel, cerrar con Escape, el fondo inerte y el
   ::backdrop. Escribir eso con divs sería más código y peor accesibilidad.
   ========================================================================== */

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import Boton from './Boton'

export default function Panel({
  abierto,
  titulo,
  onCerrar,
  children,
  pie,
}: {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
  pie?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onClose={onCerrar}
      aria-labelledby="titulo-panel"
      className="m-0 mt-auto w-full max-w-contenido rounded-t-2xl border border-borde bg-papel p-0
                 text-tinta backdrop:bg-tinta/55 sm:m-auto sm:rounded-2xl"
    >
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <h2 id="titulo-panel" className="font-display text-[1.25rem]">
          {titulo}
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={`Cerrar ${titulo}`}
          className="flex min-h-[3rem] min-w-[3rem] items-center justify-center rounded-lg hover:bg-lino"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>

      {pie && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-4 py-3">{pie}</div>
      )}
    </dialog>
  )
}

/**
 * Confirmación destructiva. El texto explica LA CONSECUENCIA, no pregunta
 * "¿Estás seguro?": nadie está seguro de nada si no le dicen qué va a pasar.
 */
export function Confirmacion({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  onConfirmar,
  onCancelar,
  palabraClave,
  valorPalabra,
  onCambiarPalabra,
}: {
  abierto: boolean
  titulo: string
  mensaje: string
  textoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
  /** Si se indica, hay que escribirla para habilitar el botón. */
  palabraClave?: string
  valorPalabra?: string
  onCambiarPalabra?: (v: string) => void
}) {
  const bloqueado = palabraClave ? valorPalabra?.trim().toUpperCase() !== palabraClave : false

  return (
    <Panel
      abierto={abierto}
      titulo={titulo}
      onCerrar={onCancelar}
      pie={
        <>
          <Boton onClick={onCancelar}>Cancelar</Boton>
          <Boton variante="peligro" onClick={onConfirmar} disabled={bloqueado}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      <p className="text-[1.05rem] leading-relaxed">{mensaje}</p>
      {palabraClave && (
        <label className="mt-4 block">
          <span className="mb-1.5 block font-semibold">
            Para confirmar, escribe {palabraClave}
          </span>
          <input
            value={valorPalabra ?? ''}
            onChange={(e) => onCambiarPalabra?.(e.target.value)}
            autoComplete="off"
            className="w-full min-h-[3rem] rounded-xl border-2 border-borde-fuerte bg-papel px-3"
          />
        </label>
      )}
    </Panel>
  )
}
