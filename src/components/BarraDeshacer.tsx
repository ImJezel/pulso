/* ============================================================================
   Barra "Deshacer" — heurística 3: control y libertad del usuario
   ----------------------------------------------------------------------------
   Aparece 8 segundos después de una acción reversible. No pregunta antes de
   actuar: deja actuar y ofrece la salida. Para alguien que marca una dosis
   con el dedo apurado, esa salida es la diferencia entre un dato bueno y un
   dato malo en el informe que verá su médico.

   La barra vive por encima de la navegación inferior y NO se imprime.
   ========================================================================== */

import { Undo2 } from 'lucide-react'
import { usePulso } from '../context/AppContext'

export default function BarraDeshacer() {
  const { deshacer, ejecutarDeshacer, descartarDeshacer } = usePulso()
  if (!deshacer) return null

  return (
    <div className="no-imprimir pointer-events-none fixed inset-x-0 bottom-[3.75rem] z-50 px-3">
      <div className="animar-entrar pointer-events-auto mx-auto flex max-w-contenido items-center justify-between gap-3 rounded-tarjeta border border-tinta/20 bg-tinta px-4 py-2.5 text-lino shadow-lg">
        <p className="text-[0.95rem]">{deshacer.mensaje}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={ejecutarDeshacer}
            className="flex min-h-[3rem] items-center gap-1.5 rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-lino/15"
          >
            <Undo2 size={18} aria-hidden="true" />
            Deshacer
          </button>
          <button
            type="button"
            onClick={descartarDeshacer}
            className="min-h-[3rem] rounded-lg px-3 text-[0.9rem] text-lino/80 hover:bg-lino/15"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
