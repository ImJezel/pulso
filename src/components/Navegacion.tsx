/* ============================================================================
   Navegación
   ----------------------------------------------------------------------------
   Dos niveles, y ninguno de los dos usa íconos sueltos:

   · Barra inferior — 4 destinos, los que se tocan todos los días. Ícono Y
     etiqueta de texto siempre visibles. Nunca solo ícono: para Doña Altagracia
     un pictograma sin palabra es una adivinanza.
   · Cabecera — las secciones que se visitan de vez en cuando. También con
     texto. En modo simple desaparece lo que no hace falta.

   La ruta activa se marca con color, subrayado, peso de letra Y aria-current:
   tres señales, ninguna dependiente solo del color.
   ========================================================================== */

import { NavLink } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  LineChart,
  FileText,
  Pill,
  CalendarDays,
  Settings,
  HeartPulse,
} from 'lucide-react'
import type { Preferencias } from '../types'

interface Destino {
  a: string
  etiqueta: string
  Icono: typeof Home
}

const PRIMARIOS: Destino[] = [
  { a: '/', etiqueta: 'Hoy', Icono: Home },
  { a: '/registrar', etiqueta: 'Registrar', Icono: PlusCircle },
  { a: '/historial', etiqueta: 'Historial', Icono: LineChart },
  { a: '/informe', etiqueta: 'Informe', Icono: FileText },
]

const SECUNDARIOS: Destino[] = [
  { a: '/medicamentos', etiqueta: 'Medicamentos', Icono: Pill },
  { a: '/citas', etiqueta: 'Citas', Icono: CalendarDays },
  { a: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
]

/** En modo simple solo quedan Hoy y Registrar abajo, y Medicamentos + Ajustes arriba. */
function filtrar(destinos: Destino[], modoSimple: boolean, simples: string[]): Destino[] {
  return modoSimple ? destinos.filter((d) => simples.includes(d.a)) : destinos
}

export function Encabezado({ preferencias }: { preferencias: Preferencias }) {
  const secundarios = filtrar(SECUNDARIOS, preferencias.modoSimple, ['/medicamentos', '/ajustes'])

  return (
    <header className="app-encabezado sticky top-0 z-30 border-b border-tinta/15 bg-tinta text-lino">
      <div className="mx-auto flex max-w-contenido flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <NavLink
          to="/"
          className="flex items-center gap-2 py-2 font-display text-[1.3rem] font-semibold text-lino"
        >
          <HeartPulse size={22} aria-hidden="true" />
          Pulso
        </NavLink>

        {/* Corrección H-08: la lista envuelve. Con el texto en "muy grande",
            "Ajustes" se salía de la pantalla y quedaba inalcanzable. */}
        <nav aria-label="Otras secciones" className="ms-auto">
          <ul className="flex flex-wrap items-center justify-end gap-1">
            {secundarios.map(({ a, etiqueta, Icono }) => (
              <li key={a}>
                <NavLink
                  to={a}
                  className={({ isActive }) =>
                    [
                      'flex min-h-[3rem] items-center gap-1.5 rounded-lg px-2.5 text-[0.9rem] font-semibold',
                      'transition-colors duration-200 hover:bg-lino/15',
                      isActive ? 'bg-lino/20 underline underline-offset-4' : 'text-lino/85',
                    ].join(' ')
                  }
                >
                  <Icono size={18} aria-hidden="true" />
                  <span>{etiqueta}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export function NavInferior({ preferencias }: { preferencias: Preferencias }) {
  const destinos = filtrar(PRIMARIOS, preferencias.modoSimple, ['/', '/registrar'])

  return (
    <nav
      aria-label="Navegación principal"
      className="no-imprimir fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-papel pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-contenido">
        {destinos.map(({ a, etiqueta, Icono }) => (
          <li key={a} className="flex-1">
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                  'text-[0.85rem] font-semibold transition-colors duration-200',
                  isActive
                    ? 'border-t-[3px] border-salvia-fuerte bg-salvia-suave text-salvia-fuerte'
                    : 'border-t-[3px] border-transparent text-bruma-texto hover:text-tinta',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icono size={22} aria-hidden="true" strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{etiqueta}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
