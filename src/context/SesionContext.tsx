/* ============================================================================
   Pulso — Sesión y cuenta (Supabase Auth)
   ----------------------------------------------------------------------------
   Módulo de usuarios: crear cuenta, entrar, salir, cambiar la contraseña y
   eliminar la cuenta. Las pantallas nunca ven un error de Supabase en inglés:
   todo pasa por traducirError(), que habla como habla el resto de la app.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { olvidarUsuario } from '../lib/storage'

export const LARGO_MINIMO_CONTRASENA = 8

interface ValorSesion {
  /** false = no hay Supabase configurado: modo local, sin cuentas. */
  configurado: boolean
  /** Mientras se lee la sesión guardada en el dispositivo. */
  cargando: boolean
  usuario: User | null
  /** Cada función devuelve null si salió bien, o el mensaje para la persona. */
  entrar: (correo: string, contrasena: string) => Promise<string | null>
  crearCuenta: (correo: string, contrasena: string) => Promise<string | null>
  salir: () => Promise<void>
  cambiarContrasena: (nueva: string) => Promise<string | null>
  eliminarCuenta: () => Promise<string | null>
}

const Contexto = createContext<ValorSesion | null>(null)

/** Lo que dice Supabase → lo que entiende Doña Altagracia. */
// eslint-disable-next-line react-refresh/only-export-components
export function traducirError(e: { message?: string; code?: string; status?: number } | null): string {
  if (!e) return 'No se pudo completar. Inténtalo de nuevo.'
  const codigo = e.code ?? ''
  const texto = (e.message ?? '').toLowerCase()

  if (codigo === 'invalid_credentials' || texto.includes('invalid login credentials'))
    return 'El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.'
  if (codigo === 'user_already_exists' || codigo === 'email_exists' || texto.includes('already registered'))
    return 'Ya hay una cuenta con ese correo. Usa «Entrar» en lugar de crear una nueva.'
  if (codigo === 'weak_password' || texto.includes('password should be'))
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`
  if (codigo === 'same_password')
    return 'La contraseña nueva tiene que ser distinta de la actual.'
  if (codigo === 'email_address_invalid' || codigo === 'validation_failed' || texto.includes('invalid format'))
    return 'Ese correo no parece válido. Revisa que esté bien escrito.'
  if (codigo === 'email_not_confirmed')
    return 'Todavía no has confirmado tu correo. Busca el mensaje de Pulso en tu bandeja de entrada.'
  if (codigo.startsWith('over_') || e.status === 429)
    return 'Hubo demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.'
  if (e.status === 0 || texto.includes('fetch') || texto.includes('network'))
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  return 'No se pudo completar. Inténtalo de nuevo en un momento.'
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)

  useEffect(() => {
    if (!supabase) return
    let vivo = true
    // La sesión guardada se lee del dispositivo: funciona también sin internet.
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setUsuario(data.session?.user ?? null)
      setCargando(false)
    })
    // Supabase recomienda no llamar a otras funciones suyas dentro de este
    // callback: aquí solo se actualiza el estado.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion: Session | null) => {
      if (vivo) setUsuario(sesion?.user ?? null)
    })
    return () => {
      vivo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const entrar = useCallback(async (correo: string, contrasena: string) => {
    if (!supabase) return null
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena })
    return error ? traducirError(error) : null
  }, [])

  const crearCuenta = useCallback(async (correo: string, contrasena: string) => {
    if (!supabase) return null
    const { data, error } = await supabase.auth.signUp({ email: correo.trim(), password: contrasena })
    if (error) return traducirError(error)
    // Si el proyecto exige confirmar el correo, signUp no abre sesión.
    if (!data.session)
      return 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego vuelve aquí para entrar.'
    return null
  }, [])

  const salir = useCallback(async () => {
    if (!supabase) return
    const uid = (await supabase.auth.getSession()).data.session?.user.id
    // scope 'local': cierra la sesión en este dispositivo aunque no haya red.
    await supabase.auth.signOut({ scope: 'local' })
    if (uid) olvidarUsuario(uid)
  }, [])

  const cambiarContrasena = useCallback(async (nueva: string) => {
    if (!supabase) return null
    const { error } = await supabase.auth.updateUser({ password: nueva })
    return error ? traducirError(error) : null
  }, [])

  const eliminarCuenta = useCallback(async () => {
    if (!supabase) return null
    const uid = (await supabase.auth.getSession()).data.session?.user.id
    const { error, status } = await supabase.rpc('eliminar_mi_cuenta')
    if (error) return traducirError({ ...error, status })
    await supabase.auth.signOut({ scope: 'local' })
    if (uid) olvidarUsuario(uid)
    return null
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      configurado: supabaseConfigurado,
      cargando,
      usuario,
      entrar,
      crearCuenta,
      salir,
      cambiarContrasena,
      eliminarCuenta,
    }),
    [cargando, usuario, entrar, crearCuenta, salir, cambiarContrasena, eliminarCuenta],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion(): ValorSesion {
  const c = useContext(Contexto)
  if (!c) throw new Error('useSesion() debe usarse dentro de <SesionProvider>')
  return c
}
