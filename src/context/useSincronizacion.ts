/* ============================================================================
   Pulso — Sincronización con Supabase
   ----------------------------------------------------------------------------
   La idea entera cabe en una frase: se guarda una copia de lo último que el
   servidor CONFIRMÓ, y cada vez que el estado cambia se manda solo la
   diferencia entre esa copia y lo que hay ahora.

   De esa frase salen las garantías:
     · Sin internet no se pierde nada: la copia confirmada no avanza, así que
       la siguiente vez la diferencia incluye todo lo pendiente.
     · Nunca hay dos envíos a la vez: si llega un cambio mientras se envía,
       se marca y se vuelve a calcular al terminar.
     · Al abrir la app, primero se sube lo pendiente y DESPUÉS se trae lo del
       servidor. Al revés, lo del servidor pisaría lo que se hizo sin conexión.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EstadoPulso } from '../types'
import { supabase } from '../lib/supabase'
import {
  aplicarCambios,
  calcularCambios,
  cargarRemoto,
  ErrorRemoto,
  hayCambios,
} from '../lib/remoto'
import { cargarConfirmado, guardarConfirmado } from '../lib/storage'

export type EstadoSync =
  /** Sin Supabase configurado: todo vive en el navegador. */
  | 'local'
  /** Abriendo: subiendo lo pendiente y trayendo lo del servidor. */
  | 'cargando'
  /** Primera vez en este dispositivo y sin internet: no hay datos que mostrar. */
  | 'sin-conexion'
  | 'al-dia'
  | 'guardando'
  /** Sin internet; los cambios esperan en el dispositivo. */
  | 'pendiente'
  /** El servidor rechazó algo. Se reintenta, pero se avisa. */
  | 'error'

const ESPERA_ENVIO_MS = 400
const REINTENTO_MS = 30_000

export interface Sincronizacion {
  estado: EstadoSync
  detalle: string | null
  /** Intenta subir ya lo pendiente. true si quedó todo guardado en el servidor. */
  enviarAhora: () => Promise<boolean>
  /** Vuelve a arrancar desde cero (botón «Reintentar»). */
  reintentar: () => void
}

export function useSincronizacion(
  usuarioId: string | null,
  estado: EstadoPulso,
  reemplazar: (e: EstadoPulso) => void,
): Sincronizacion {
  const cliente = usuarioId ? supabase : null
  const [sync, setSync] = useState<EstadoSync>(cliente ? 'cargando' : 'local')
  const [detalle, setDetalle] = useState<string | null>(null)

  const confirmado = useRef<EstadoPulso | null>(usuarioId ? cargarConfirmado(usuarioId) : null)
  const actual = useRef(estado)
  const vuelo = useRef<Promise<boolean> | null>(null)
  const repetir = useRef(false)
  /** No se envía nada hasta terminar el arranque: el arranque decide la base. */
  const arrancado = useRef(false)
  const vivo = useRef(true)

  useEffect(() => {
    actual.current = estado
  }, [estado])

  const marcar = useCallback((s: EstadoSync, d: string | null = null) => {
    if (!vivo.current) return
    setSync(s)
    setDetalle(d)
  }, [])

  const enviar = useCallback((): Promise<boolean> => {
    if (!cliente || !usuarioId) return Promise.resolve(true)
    if (vuelo.current) {
      repetir.current = true
      return vuelo.current
    }
    const tarea = (async () => {
      try {
        do {
          repetir.current = false
          const objetivo = actual.current
          const cambios = calcularCambios(confirmado.current, objetivo)
          if (!hayCambios(cambios)) continue
          if (typeof navigator !== 'undefined' && navigator.onLine === false)
            throw new ErrorRemoto('Sin conexión', true)
          // Durante el arranque la pantalla sigue en «cargando»: si mostrara la
          // app antes de traer lo del servidor, lo que se tocara se perdería.
          if (arrancado.current) marcar('guardando')
          await aplicarCambios(cliente, usuarioId, objetivo, cambios)
          if (!vivo.current) return false
          confirmado.current = objetivo
          guardarConfirmado(usuarioId, objetivo)
          // Si llegó otro cambio mientras se enviaba, se repite el cálculo.
          if (actual.current !== objetivo) repetir.current = true
        } while (repetir.current)
        if (arrancado.current) marcar('al-dia')
        return true
      } catch (e) {
        const red = e instanceof ErrorRemoto ? e.esRed : false
        marcar(red ? 'pendiente' : 'error', red ? null : e instanceof Error ? e.message : String(e))
        return false
      } finally {
        vuelo.current = null
      }
    })()
    vuelo.current = tarea
    return tarea
  }, [cliente, usuarioId, marcar])

  /* --- Arranque ------------------------------------------------------------ */
  const arrancar = useCallback(async () => {
    if (!cliente || !usuarioId) return
    arrancado.current = false
    marcar('cargando')

    // 1. Lo que quedó sin subir la última vez va primero.
    if (confirmado.current) {
      const subido = await enviar()
      if (!subido) {
        // Sin red, pero hay una base conocida: se trabaja con la copia local.
        arrancado.current = true
        return
      }
    }

    // 2. Lo del servidor es la verdad (puede haber cambios de otro dispositivo).
    try {
      const remoto = await cargarRemoto(cliente, usuarioId)
      if (!vivo.current) return
      confirmado.current = remoto
      guardarConfirmado(usuarioId, remoto)
      reemplazar(remoto)
      arrancado.current = true
      marcar('al-dia')
    } catch (e) {
      const red = e instanceof ErrorRemoto ? e.esRed : false
      if (!confirmado.current) {
        // Nunca sincronizó aquí: mostrar una app vacía haría creer que se
        // perdieron los datos, y lo que se escribiera pisaría los de verdad.
        marcar(red ? 'sin-conexion' : 'error', red ? null : e instanceof Error ? e.message : String(e))
        return
      }
      arrancado.current = true
      marcar(red ? 'pendiente' : 'error', red ? null : e instanceof Error ? e.message : String(e))
    }
  }, [cliente, usuarioId, enviar, reemplazar, marcar])

  useEffect(() => {
    vivo.current = true
    void arrancar()
    return () => {
      vivo.current = false
    }
    // Solo al montar: el proveedor se vuelve a montar si cambia el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --- Cada cambio del estado se envía (agrupado 400 ms) ------------------ */
  useEffect(() => {
    if (!cliente || !arrancado.current) return
    const t = window.setTimeout(() => void enviar(), ESPERA_ENVIO_MS)
    return () => window.clearTimeout(t)
  }, [estado, cliente, enviar])

  /* --- Reintentos: al volver el internet y cada 30 s si algo quedó ------- */
  useEffect(() => {
    if (!cliente) return
    const alVolver = () => {
      if (sync === 'sin-conexion') void arrancar()
      else if (sync === 'pendiente' || sync === 'error') void enviar()
    }
    window.addEventListener('online', alVolver)
    const intervalo =
      sync === 'pendiente' || sync === 'error' || sync === 'sin-conexion'
        ? window.setInterval(alVolver, REINTENTO_MS)
        : undefined
    return () => {
      window.removeEventListener('online', alVolver)
      window.clearInterval(intervalo)
    }
  }, [cliente, sync, arrancar, enviar])

  const reintentar = useCallback(() => {
    if (sync === 'sin-conexion' || !arrancado.current) void arrancar()
    else void enviar()
  }, [sync, arrancar, enviar])

  return useMemo(
    () => ({ estado: sync, detalle, enviarAhora: enviar, reintentar }),
    [sync, detalle, enviar, reintentar],
  )
}
