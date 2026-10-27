/* ============================================================================
   Estado vacío
   ----------------------------------------------------------------------------
   Ninguna pantalla de Pulso se queda en blanco. Un vacío sin explicación se
   lee como "esto está roto". Aquí siempre hay tres cosas: qué pasa, por qué,
   y el botón que lo resuelve.
   ========================================================================== */

import type { ReactNode } from 'react'
import { Tarjeta } from './Tarjeta'

export default function EstadoVacio({
  icono,
  titulo,
  mensaje,
  accion,
}: {
  icono?: ReactNode
  titulo: string
  mensaje: string
  accion?: ReactNode
}) {
  return (
    <Tarjeta className="px-5 py-8 text-center">
      {icono && (
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-salvia-suave text-salvia-fuerte">
          {icono}
        </div>
      )}
      <h3 className="font-display text-[1.2rem] text-tinta">{titulo}</h3>
      <p className="mx-auto mt-2 max-w-[34ch] text-bruma-texto">{mensaje}</p>
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </Tarjeta>
  )
}
