/* ============================================================================
   /entrar — Iniciar sesión o crear una cuenta
   ----------------------------------------------------------------------------
   Una sola pantalla con dos modos, porque para quien llega por primera vez
   «¿tengo cuenta o no?» ya es una pregunta: la respuesta es un botón, no una
   pantalla nueva que buscar.

   Decisiones de usabilidad:
     · Una sola contraseña con «Mostrar contraseña», no dos campos para
       repetirla: a quien escribe despacio en un teclado de teléfono, repetir
       le duplica el trabajo; ver lo que escribió le evita el error.
     · Los errores dicen qué hacer («usa Entrar en lugar de crear una
       nueva»), no qué código devolvió el servidor (heurística 9).
     · <form> de verdad: la tecla Enter envía y los gestores de contraseñas
       reconocen los campos (autocomplete).
   ========================================================================== */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { HeartPulse, LogIn, UserPlus } from 'lucide-react'
import { useSesion, LARGO_MINIMO_CONTRASENA } from '../context/SesionContext'
import { validarCredenciales } from '../lib/validaciones'
import Boton from '../components/Boton'
import { Tarjeta } from '../components/Tarjeta'
import { CampoTexto } from '../components/Campos'

type Modo = 'entrar' | 'crear'

export default function Entrar() {
  const { entrar, crearCuenta } = useSesion()
  const [modo, setModo] = useState<Modo>('entrar')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null)
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null)

  const creando = modo === 'crear'

  function cambiarModo(m: Modo) {
    setModo(m)
    setError(null)
    setErrorCorreo(null)
    setErrorContrasena(null)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const c = correo.trim()
    const { correo: malCorreo, contrasena: malaContrasena } = validarCredenciales(
      c,
      contrasena,
      creando,
    )
    setErrorCorreo(malCorreo)
    setErrorContrasena(malaContrasena)
    setError(null)
    if (malCorreo || malaContrasena) return

    setEnviando(true)
    const mensaje = creando ? await crearCuenta(c, contrasena) : await entrar(c, contrasena)
    // Si salió bien, la sesión cambia y esta pantalla desaparece sola.
    setEnviando(false)
    if (mensaje) setError(mensaje)
  }

  return (
    <div className="animar-entrar mx-auto max-w-[30rem] px-4 py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-salvia-suave text-salvia-fuerte">
          <HeartPulse size={28} aria-hidden="true" />
        </div>
        <h1 className="font-display text-[1.9rem] text-tinta">
          {creando ? 'Crea tu cuenta' : 'Entra a Pulso'}
        </h1>
        <p className="mt-1 text-bruma-texto">Tu libreta de salud, siempre contigo.</p>
      </div>

      <Tarjeta className="px-4 py-5 sm:px-6">
        <form onSubmit={enviar} noValidate>
          <CampoTexto
            etiqueta="Correo electrónico"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errorCorreo}
            placeholder="maria@gmail.com"
          />
          <CampoTexto
            etiqueta="Contraseña"
            type={mostrar ? 'text' : 'password'}
            autoComplete={creando ? 'new-password' : 'current-password'}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errorContrasena}
            ayuda={creando ? `Al menos ${LARGO_MINIMO_CONTRASENA} caracteres.` : undefined}
          />

          <label className="-mt-1 mb-4 flex min-h-[3rem] cursor-pointer items-center gap-3 font-semibold text-tinta">
            <input
              type="checkbox"
              checked={mostrar}
              onChange={(e) => setMostrar(e.target.checked)}
              className="h-6 w-6 accent-salvia-fuerte"
            />
            Mostrar contraseña
          </label>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border-2 border-ambar-texto bg-ambar-suave px-3 py-2.5 font-semibold text-ambar-texto"
            >
              {error}
            </p>
          )}

          <Boton
            type="submit"
            variante="primario"
            tamano="grande"
            anchoCompleto
            disabled={enviando}
            icono={
              creando ? <UserPlus size={20} aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />
            }
          >
            {enviando ? (creando ? 'Creando la cuenta…' : 'Entrando…') : creando ? 'Crear cuenta' : 'Entrar'}
          </Boton>
        </form>

        <div className="mt-5 border-t border-borde pt-4 text-center">
          <p className="text-bruma-texto">{creando ? '¿Ya tienes una cuenta?' : '¿Es tu primera vez?'}</p>
          <Boton variante="texto" onClick={() => cambiarModo(creando ? 'entrar' : 'crear')}>
            {creando ? 'Entrar con mi cuenta' : 'Crear una cuenta nueva'}
          </Boton>
        </div>
      </Tarjeta>

      <p className="mt-5 text-center text-[0.9rem] leading-relaxed text-bruma-texto">
        Tus datos de salud se guardan en tu cuenta y solo tú puedes verlos. Pulso no diagnostica
        ni receta: ante cualquier duda, consulta con tu médico.
      </p>
    </div>
  )
}
