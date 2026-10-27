/* ============================================================================
   Campos de formulario
   ----------------------------------------------------------------------------
   Un solo componente por tipo de campo, y cada uno trae de fábrica:
     · <label for> asociado de verdad,
     · ayuda y error enlazados con aria-describedby,
     · el error con role="alert" para que el lector de pantalla lo diga,
     · teclado numérico en móvil (inputMode) donde toca.

   El aviso de un valor raro es SUGERENCIA, no bloqueo: si la persona midió
   200/120, ese dato tiene que poder guardarse. La app no está para discutir
   con la realidad (heurística 5 y 9).
   ========================================================================== */

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

function Envoltura({
  id,
  etiqueta,
  ayuda,
  error,
  children,
  sufijo,
}: {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string | null
  children: ReactNode
  sufijo?: string
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block font-semibold text-tinta">
        {etiqueta}
      </label>
      <div className="flex items-center gap-2">
        {children}
        {sufijo && <span className="shrink-0 text-bruma-texto">{sufijo}</span>}
      </div>
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-[0.9rem] text-bruma-texto">
          {ayuda}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex gap-1.5 text-[0.9rem] font-semibold text-ambar-texto"
        >
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      )}
    </div>
  )
}

type PropsTexto = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  ayuda?: string
  error?: string | null
  sufijo?: string
}

const CLASES_ENTRADA =
  'w-full min-h-[3rem] rounded-xl border-2 border-borde-fuerte bg-papel px-3 py-2 text-tinta ' +
  'placeholder:text-bruma focus:border-salvia-fuerte'

export function CampoTexto({ etiqueta, ayuda, error, sufijo, id, ...resto }: PropsTexto) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} sufijo={sufijo}>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idCampo}-error` : ayuda ? `${idCampo}-ayuda` : undefined}
        className={CLASES_ENTRADA}
        {...resto}
      />
    </Envoltura>
  )
}

/** Campo numérico grande: la cifra se ve en la fuente de datos, a 32px. */
export function CampoNumero({ etiqueta, ayuda, error, sufijo, id, ...resto }: PropsTexto) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} sufijo={sufijo}>
      <input
        id={idCampo}
        type="number"
        inputMode="decimal"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idCampo}-error` : ayuda ? `${idCampo}-ayuda` : undefined}
        className={`${CLASES_ENTRADA} cifra min-h-[3.75rem] text-[2rem] leading-none`}
        {...resto}
      />
    </Envoltura>
  )
}

type PropsSelect = SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string
  ayuda?: string
  error?: string | null
  children: ReactNode
}

export function CampoSelect({ etiqueta, ayuda, error, id, children, ...resto }: PropsSelect) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error}>
      <select
        id={idCampo}
        aria-describedby={error ? `${idCampo}-error` : ayuda ? `${idCampo}-ayuda` : undefined}
        className={CLASES_ENTRADA}
        {...resto}
      >
        {children}
      </select>
    </Envoltura>
  )
}

export function CampoArea({
  etiqueta,
  ayuda,
  id,
  ...resto
}: {
  etiqueta: string
  ayuda?: string
  id?: string
} & InputHTMLAttributes<HTMLTextAreaElement>) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda}>
      <textarea
        id={idCampo}
        rows={3}
        aria-describedby={ayuda ? `${idCampo}-ayuda` : undefined}
        className={`${CLASES_ENTRADA} resize-y`}
        {...resto}
      />
    </Envoltura>
  )
}

/** Interruptor accesible: es un <button> con aria-pressed, no un div. */
export function Interruptor({
  etiqueta,
  descripcion,
  activo,
  onChange,
}: {
  etiqueta: string
  descripcion?: string
  activo: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p id={id} className="font-semibold text-tinta">
          {etiqueta}
        </p>
        {descripcion && <p className="mt-0.5 text-[0.9rem] text-bruma-texto">{descripcion}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={id}
        onClick={() => onChange(!activo)}
        /* El interruptor mide 3rem de alto como todo lo demás: la regla de
           48 px de área táctil no tiene excepciones. */
        className={`relative h-[3rem] w-[4.5rem] shrink-0 rounded-full border-2 transition-colors duration-200 ${
          activo ? 'border-salvia-fuerte bg-salvia-fuerte' : 'border-borde-fuerte bg-lino'
        }`}
      >
        <span
          className={`absolute top-[0.25rem] h-[2.25rem] w-[2.25rem] rounded-full bg-papel shadow transition-[left] duration-200 ${
            activo ? 'left-[1.875rem]' : 'left-[0.25rem]'
          }`}
        />
        <span className="solo-lectores">{activo ? 'Activado' : 'Desactivado'}</span>
      </button>
    </div>
  )
}
