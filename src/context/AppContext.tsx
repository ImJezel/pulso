/* ============================================================================
   Pulso — Estado global
   ----------------------------------------------------------------------------
   React Context + useReducer. No hay Redux y eso fue una decisión, no un
   descuido: la app tiene un solo objeto de estado, siete pantallas y ninguna
   petición de red. Redux añadiría tres archivos por cada cosa que hoy es una
   línea en un `switch`.

   Aquí viven además dos cosas que la interfaz necesita en todas partes:
     · el anuncio para lectores de pantalla (aria-live), y
     · el "Deshacer" de 8 segundos de la pantalla Hoy.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type {
  Cita,
  EstadoDosis,
  EstadoPulso,
  Medicamento,
  Medicion,
  Perfil,
  Preferencias,
} from '../types'
import {
  cargar,
  guardar,
  borrarTodo,
  claveUsuario,
  CLAVE,
  ESTADO_INICIAL,
  nuevoId,
} from '../lib/storage'
import { useSincronizacion } from './useSincronizacion'
import type { Sincronizacion } from './useSincronizacion'
import { sincronizarDosis } from '../lib/adherencia'
import { generarDatosDemo } from '../lib/demo'
import { isoLocal } from '../lib/fechas'

/* --- Acciones ------------------------------------------------------------ */

export type Accion =
  | { tipo: 'GUARDAR_PERFIL'; perfil: Perfil }
  | { tipo: 'PREFERENCIAS'; cambios: Partial<Preferencias> }
  | { tipo: 'AGREGAR_MEDICAMENTO'; medicamento: Medicamento }
  | { tipo: 'ACTUALIZAR_MEDICAMENTO'; medicamento: Medicamento }
  | { tipo: 'ELIMINAR_MEDICAMENTO'; id: string }
  | { tipo: 'ALTERNAR_MEDICAMENTO'; id: string }
  | { tipo: 'MARCAR_DOSIS'; id: string; estado: EstadoDosis }
  | { tipo: 'AGREGAR_MEDICION'; medicion: Medicion }
  | { tipo: 'ELIMINAR_MEDICION'; id: string }
  | { tipo: 'AGREGAR_CITA'; cita: Cita }
  | { tipo: 'ACTUALIZAR_CITA'; cita: Cita }
  | { tipo: 'ELIMINAR_CITA'; id: string }
  | { tipo: 'SINCRONIZAR_DOSIS' }
  | { tipo: 'CARGAR_DEMO' }
  | { tipo: 'BORRAR_TODO' }
  | { tipo: 'REEMPLAZAR'; estado: EstadoPulso }

// eslint-disable-next-line react-refresh/only-export-components
export function reducer(estado: EstadoPulso, accion: Accion): EstadoPulso {
  switch (accion.tipo) {
    case 'GUARDAR_PERFIL':
      return { ...estado, perfil: accion.perfil }

    case 'PREFERENCIAS':
      return { ...estado, preferencias: { ...estado.preferencias, ...accion.cambios } }

    case 'AGREGAR_MEDICAMENTO':
      return sincronizar({ ...estado, medicamentos: [...estado.medicamentos, accion.medicamento] })

    case 'ACTUALIZAR_MEDICAMENTO':
      return sincronizar({
        ...estado,
        medicamentos: estado.medicamentos.map((m) =>
          m.id === accion.medicamento.id ? accion.medicamento : m,
        ),
      })

    case 'ELIMINAR_MEDICAMENTO':
      // Se van también sus registros de dosis: es lo que avisa el diálogo.
      return {
        ...estado,
        medicamentos: estado.medicamentos.filter((m) => m.id !== accion.id),
        registrosDosis: estado.registrosDosis.filter((r) => r.medicamentoId !== accion.id),
      }

    case 'ALTERNAR_MEDICAMENTO':
      return sincronizar({
        ...estado,
        medicamentos: estado.medicamentos.map((m) =>
          m.id === accion.id ? { ...m, activo: !m.activo } : m,
        ),
      })

    case 'MARCAR_DOSIS':
      return {
        ...estado,
        registrosDosis: estado.registrosDosis.map((r) =>
          r.id === accion.id
            ? {
                ...r,
                estado: accion.estado,
                registradoEn: accion.estado === 'pendiente' ? null : isoLocal(new Date()),
              }
            : r,
        ),
      }

    case 'AGREGAR_MEDICION':
      return {
        ...estado,
        mediciones: [accion.medicion, ...estado.mediciones].sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora),
        ),
      }

    case 'ELIMINAR_MEDICION':
      return { ...estado, mediciones: estado.mediciones.filter((m) => m.id !== accion.id) }

    case 'AGREGAR_CITA':
      return { ...estado, citas: [...estado.citas, accion.cita] }

    case 'ACTUALIZAR_CITA':
      return {
        ...estado,
        citas: estado.citas.map((c) => (c.id === accion.cita.id ? accion.cita : c)),
      }

    case 'ELIMINAR_CITA':
      return { ...estado, citas: estado.citas.filter((c) => c.id !== accion.id) }

    case 'SINCRONIZAR_DOSIS':
      return sincronizar(estado)

    case 'CARGAR_DEMO':
      // Las preferencias de accesibilidad son de la persona, no de los datos:
      // cargar la demo no le devuelve el texto a tamaño normal.
      return { ...generarDatosDemo(), preferencias: estado.preferencias }

    case 'BORRAR_TODO':
      return { ...ESTADO_INICIAL, preferencias: estado.preferencias }

    case 'REEMPLAZAR':
      return accion.estado

    default:
      return estado
  }
}

function sincronizar(estado: EstadoPulso): EstadoPulso {
  const registrosDosis = sincronizarDosis(estado.medicamentos, estado.registrosDosis)
  return registrosDosis === estado.registrosDosis ? estado : { ...estado, registrosDosis }
}

/* --- Contexto ------------------------------------------------------------ */

interface Deshacer {
  estadoAnterior: EstadoPulso
  mensaje: string
}

interface ValorContexto {
  estado: EstadoPulso
  despachar: (a: Accion) => void
  /** Despacha, anuncia el resultado y deja disponible "Deshacer" 8 segundos. */
  despacharConDeshacer: (a: Accion, mensaje: string) => void
  deshacer: Deshacer | null
  ejecutarDeshacer: () => void
  descartarDeshacer: () => void
  anuncio: string
  anunciar: (mensaje: string) => void
  errorAlmacenamiento: string | null
  nuevoId: typeof nuevoId
  /** Usuario de Supabase dueño de estos datos; null en modo local. */
  usuarioId: string | null
  /** Estado de la conexión con la base de datos y acciones para forzarla. */
  sync: Sincronizacion
}

const Contexto = createContext<ValorContexto | null>(null)

const SEGUNDOS_DESHACER = 8

/**
 * `usuarioId` llega desde la sesión. App.tsx monta un proveedor nuevo (key)
 * por cada usuario: al cambiar de cuenta no queda nada del anterior en memoria.
 */
export function AppProvider({
  children,
  usuarioId = null,
}: {
  children: ReactNode
  usuarioId?: string | null
}) {
  const clave = usuarioId ? claveUsuario(usuarioId) : CLAVE
  const [estado, despachar] = useReducer(reducer, undefined, () =>
    sincronizar(cargar(clave)),
  )
  const [deshacer, setDeshacer] = useState<Deshacer | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const temporizador = useRef<number | undefined>(undefined)

  /* Lo que llega del servidor reemplaza la copia local, y se completan las
     dosis de hoy (las que aún no existen se crean como pendientes). */
  const reemplazar = useCallback(
    (remoto: EstadoPulso) => despachar({ tipo: 'REEMPLAZAR', estado: sincronizar(remoto) }),
    [],
  )
  const sync = useSincronizacion(usuarioId, estado, reemplazar)

  /* Persistir en cada cambio. Es un objeto pequeño; no hace falta debounce.
     El error de escritura en localStorage (por ejemplo, QuotaExceededError) se
     calcula al guardar sin disparar un segundo render con setState en efecto. */
  const errorAlmacenamiento = useMemo(() => {
    const r = guardar(estado, clave)
    return r.ok ? null : r.motivo
  }, [estado, clave])

  /* Las preferencias se aplican al <html>: los tokens hacen el resto. */
  useEffect(() => {
    const raiz = document.documentElement
    raiz.dataset.texto = estado.preferencias.escalaTexto
    if (estado.preferencias.altoContraste) raiz.dataset.contraste = 'alto'
    else delete raiz.dataset.contraste
  }, [estado.preferencias])

  const anunciar = useCallback((mensaje: string) => {
    // Se limpia primero para que dos anuncios iguales seguidos sí se lean.
    setAnuncio('')
    window.setTimeout(() => setAnuncio(mensaje), 60)
  }, [])

  const descartarDeshacer = useCallback(() => {
    window.clearTimeout(temporizador.current)
    setDeshacer(null)
  }, [])

  const despacharConDeshacer = useCallback(
    (accion: Accion, mensaje: string) => {
      setDeshacer({ estadoAnterior: estado, mensaje })
      despachar(accion)
      anunciar(mensaje)
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => setDeshacer(null), SEGUNDOS_DESHACER * 1000)
    },
    [estado, anunciar],
  )

  const ejecutarDeshacer = useCallback(() => {
    if (!deshacer) return
    despachar({ tipo: 'REEMPLAZAR', estado: deshacer.estadoAnterior })
    anunciar('Se deshizo la última acción.')
    descartarDeshacer()
  }, [deshacer, anunciar, descartarDeshacer])

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const valor = useMemo<ValorContexto>(
    () => ({
      estado,
      despachar,
      despacharConDeshacer,
      deshacer,
      ejecutarDeshacer,
      descartarDeshacer,
      anuncio,
      anunciar,
      errorAlmacenamiento,
      nuevoId,
      usuarioId,
      sync,
    }),
    [
      estado,
      despacharConDeshacer,
      deshacer,
      ejecutarDeshacer,
      descartarDeshacer,
      anuncio,
      anunciar,
      errorAlmacenamiento,
      usuarioId,
      sync,
    ],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePulso(): ValorContexto {
  const c = useContext(Contexto)
  if (!c) throw new Error('usePulso() debe usarse dentro de <AppProvider>')
  return c
}

// eslint-disable-next-line react-refresh/only-export-components
export function limpiarAlmacenamiento(): void {
  borrarTodo()
}
