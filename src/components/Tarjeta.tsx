/* ============================================================================
   Tarjeta y sus piezas — la superficie sobre la que se apoya todo.
   Radio 12px, sombra suave, separación generosa.
   ========================================================================== */

import type { ReactNode } from 'react'

export function Tarjeta({
  children,
  className = '',
  as: Etiqueta = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return (
    <Etiqueta
      className={`rounded-tarjeta border border-borde bg-papel shadow-tarjeta ${className}`}
    >
      {children}
    </Etiqueta>
  )
}

export function TituloSeccion({
  children,
  accion,
  id,
}: {
  children: ReactNode
  accion?: ReactNode
  id?: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="font-display text-[1.35rem] text-tinta">
        {children}
      </h2>
      {accion}
    </div>
  )
}

/** Dato grande: la cifra de una medición nunca baja de 32px. */
export function Cifra({
  valor,
  unidad,
  className = '',
}: {
  valor: ReactNode
  unidad?: string
  className?: string
}) {
  return (
    <p className={`flex items-baseline gap-2 ${className}`}>
      <span className="cifra text-[2rem] leading-none text-tinta">{valor}</span>
      {unidad && <span className="text-sm text-bruma-texto">{unidad}</span>}
    </p>
  )
}
