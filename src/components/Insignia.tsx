/* ============================================================================
   Insignia de clasificación
   ----------------------------------------------------------------------------
   Ningún estado se comunica SOLO por color: siempre color + texto + ícono.
   Quien no distingue el verde del ámbar lee "Dentro de tu rango" igual, y
   quien imprime el informe en blanco y negro también.
   ========================================================================== */

import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react'
import type { Clasificacion } from '../types'
import { etiquetaClasificacion } from '../lib/rangos'

const ESTILOS: Record<Clasificacion, string> = {
  'en-rango': 'bg-salvia-suave text-salvia-fuerte border-salvia-fuerte/35',
  atencion: 'bg-ambar-suave text-ambar-texto border-ambar-texto/35',
  'fuera-de-rango': 'bg-ladrillo-suave text-ladrillo border-ladrillo/35',
  'sin-referencia': 'bg-lino text-bruma-texto border-borde-fuerte',
}

const ICONOS: Record<Clasificacion, typeof CheckCircle2> = {
  'en-rango': CheckCircle2,
  atencion: AlertTriangle,
  'fuera-de-rango': AlertOctagon,
  'sin-referencia': HelpCircle,
}

export default function Insignia({
  clasificacion,
  texto,
  className = '',
}: {
  clasificacion: Clasificacion
  texto?: string
  className?: string
}) {
  const Icono = ICONOS[clasificacion]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.85rem] font-semibold ${ESTILOS[clasificacion]} ${className}`}
    >
      <Icono size={16} aria-hidden="true" className="shrink-0" />
      {texto ?? etiquetaClasificacion(clasificacion)}
    </span>
  )
}

/** Chip seleccionable (condiciones, filtros). Es un botón real. */
export function Chip({
  activo,
  children,
  onClick,
  ariaLabel,
}: {
  activo: boolean
  children: React.ReactNode
  onClick: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={ariaLabel}
      className={`min-h-[3rem] rounded-full border-2 px-4 text-base font-semibold transition-colors duration-200 ${
        activo
          ? 'border-salvia-fuerte bg-salvia-fuerte text-white'
          : 'border-borde-fuerte bg-papel text-tinta hover:bg-salvia-suave'
      }`}
    >
      {children}
    </button>
  )
}
