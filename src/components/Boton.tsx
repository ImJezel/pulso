/* ============================================================================
   Botón — el control que más se toca en toda la app.
   ----------------------------------------------------------------------------
   Reglas que este componente garantiza por construcción, para que ninguna
   pantalla las pueda romper por descuido:
     · altura mínima 3rem (≈48 px a escala normal),
     · es un <button> de verdad, nunca un <div> con onClick,
     · si es solo ícono, exige aria-label (lo obliga el tipo de TypeScript).
   ========================================================================== */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'sutil' | 'peligro' | 'texto'
type Tamano = 'normal' | 'grande' | 'compacto'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-salvia-fuerte text-white border-transparent hover:brightness-110 active:brightness-95',
  secundario:
    'bg-papel text-tinta border-borde-fuerte hover:bg-salvia-suave active:bg-salvia-suave',
  sutil: 'bg-transparent text-tinta border-transparent hover:bg-salvia-suave',
  peligro: 'bg-ladrillo text-white border-transparent hover:brightness-110',
  texto:
    'bg-transparent text-salvia-fuerte border-transparent underline underline-offset-4 hover:text-tinta',
}

const TAMANOS: Record<Tamano, string> = {
  compacto: 'min-h-[3rem] px-3 text-[0.95rem]',
  normal: 'min-h-[3rem] px-4 text-base',
  grande: 'min-h-[3.5rem] px-5 text-lg',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamano?: Tamano
  anchoCompleto?: boolean
  icono?: ReactNode
  children?: ReactNode
}

export default function Boton({
  variante = 'secundario',
  tamano = 'normal',
  anchoCompleto = false,
  icono,
  children,
  className = '',
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border-2 font-cuerpo font-semibold',
        'transition-[background-color,filter,border-color] duration-200',
        'disabled:opacity-45 disabled:pointer-events-none',
        VARIANTES[variante],
        TAMANOS[tamano],
        anchoCompleto ? 'w-full' : '',
        className,
      ].join(' ')}
      {...resto}
    >
      {icono}
      {children}
    </button>
  )
}
