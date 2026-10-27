/* ============================================================================
   Pulso — Cliente de Supabase
   ----------------------------------------------------------------------------
   La URL y la clave pública salen de .env.local (ver .env.example). Si no
   están, `supabase` es null y la app funciona en modo local, sin cuentas,
   igual que el prototipo original: así las pruebas y el build de un solo
   archivo no dependen de tener red ni credenciales.
   ========================================================================== */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const clavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase =
  url && clavePublica
    ? createClient<Database>(url, clavePublica, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Con HashRouter el "#" es de las rutas, no de un token de OAuth.
          detectSessionInUrl: false,
          storageKey: 'pulso.sesion',
        },
      })
    : null

export const supabaseConfigurado = supabase !== null
