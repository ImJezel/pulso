/* ============================================================================
   Pulso — Armazón de la aplicación
   ----------------------------------------------------------------------------
   Aquí se decide poco y se decide una sola vez: quién está usando la app,
   rutas, esqueleto de la página y las dos piezas transversales de
   accesibilidad (el salto al contenido y la región aria-live donde se
   anuncian las confirmaciones).

   Orden de las capas:
     SesionProvider  → ¿hay alguien con sesión? Si no, pantalla «Entrar».
     AppProvider     → los datos de ESE usuario. Lleva key={uid}: al cambiar
                       de cuenta se monta uno nuevo y no queda nada del
                       anterior en memoria.
     Marco           → las pantallas.

   Se usa HashRouter y no BrowserRouter a propósito: así el build estático de
   `dist/` se abre haciendo doble clic en index.html, sin servidor. Es el plan
   B de la presentación y no cuesta nada.
   ========================================================================== */

import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CloudOff, HeartPulse } from 'lucide-react'
import { AppProvider, usePulso } from './context/AppContext'
import { SesionProvider, useSesion } from './context/SesionContext'
import { Encabezado, NavInferior } from './components/Navegacion'
import BarraDeshacer from './components/BarraDeshacer'
import Boton from './components/Boton'
import { Tarjeta } from './components/Tarjeta'
import Bienvenida from './pages/Bienvenida'
import Entrar from './pages/Entrar'
import Hoy from './pages/Hoy'
import Registrar from './pages/Registrar'
import Medicamentos from './pages/Medicamentos'
import Citas from './pages/Citas'
import Ajustes from './pages/Ajustes'

/* Las tres pantallas que dibujan gráficos cargan la librería aparte: son las
   que menos se visitan y Recharts pesa más que todo el resto de la app junta.
   Doña Altagracia abre "Hoy" veinte veces al día y "Calidad" ninguna. */
const Historial = lazy(() => import('./pages/Historial'))
const Informe = lazy(() => import('./pages/Informe'))
const Calidad = lazy(() => import('./pages/Calidad'))

function Cargando() {
  return (
    <p role="status" className="py-12 text-center text-bruma-texto">
      Cargando la pantalla…
    </p>
  )
}

/** Pantalla completa de espera, con el mismo tono tranquilo del resto. */
function PantallaEspera({ mensaje }: { mensaje: string }) {
  return (
    <main id="contenido" className="flex min-h-dvh items-center justify-center px-4">
      <p role="status" className="flex items-center gap-3 text-[1.1rem] text-bruma-texto">
        <HeartPulse size={26} aria-hidden="true" className="text-salvia-fuerte motion-safe:animate-pulse" />
        {mensaje}
      </p>
    </main>
  )
}

/** Primera vez en este dispositivo y sin internet: decirlo, no mostrar una app vacía. */
function SinConexionInicial({ onReintentar }: { onReintentar: () => void }) {
  const { salir } = useSesion()
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-[30rem] items-center px-4">
      <Tarjeta className="w-full px-5 py-6 text-center">
        <CloudOff size={36} aria-hidden="true" className="mx-auto mb-3 text-bruma-texto" />
        <h1 className="font-display text-[1.6rem] text-tinta">No hay conexión</h1>
        <p className="mt-2 leading-relaxed">
          Es la primera vez que abres Pulso en este dispositivo, así que necesita internet para
          traer tus datos. En cuanto vuelva la conexión se cargarán solos.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Boton variante="primario" onClick={onReintentar}>
            Reintentar
          </Boton>
          <Boton onClick={() => void salir()}>Usar otra cuenta</Boton>
        </div>
      </Tarjeta>
    </main>
  )
}

function AvisoSincronizacion() {
  const { sync } = usePulso()
  if (sync.estado === 'pendiente') {
    return (
      <div
        role="status"
        className="no-imprimir mb-4 flex items-start gap-2.5 rounded-tarjeta border border-borde bg-papel px-4 py-3 text-[0.95rem] text-tinta"
      >
        <CloudOff size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-bruma-texto" />
        <span>
          <strong className="font-semibold">Sin conexión.</strong> Lo que registres se guarda en
          este dispositivo y se sube solo a tu cuenta cuando vuelva el internet.
        </span>
      </div>
    )
  }
  if (sync.estado === 'error') {
    return (
      <div
        role="alert"
        className="no-imprimir mb-4 rounded-tarjeta border-2 border-ambar-texto bg-ambar-suave px-4 py-3 text-ambar-texto"
      >
        <strong className="block font-semibold">No se pudieron guardar tus cambios en tu cuenta</strong>
        Están a salvo en este dispositivo y Pulso lo volverá a intentar.{' '}
        <Boton variante="texto" tamano="compacto" onClick={sync.reintentar} className="!px-1">
          Reintentar ahora
        </Boton>
      </div>
    )
  }
  return null
}

function Marco() {
  const { estado, anuncio, errorAlmacenamiento, sync } = usePulso()
  const ubicacion = useLocation()
  const enBienvenida = ubicacion.pathname === '/bienvenida'
  const sinPerfil = estado.perfil === null

  if (sync.estado === 'cargando') return <PantallaEspera mensaje="Trayendo tus datos…" />
  if (sync.estado === 'sin-conexion') return <SinConexionInicial onReintentar={sync.reintentar} />

  // Sin perfil no hay nada que enseñar: se va a la configuración inicial.
  if (sinPerfil && !enBienvenida) return <Navigate to="/bienvenida" replace />

  return (
    <div className="min-h-dvh">
      <a href="#contenido" className="saltar-al-contenido no-imprimir">
        Saltar al contenido
      </a>

      {!enBienvenida && <Encabezado preferencias={estado.preferencias} />}

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-contenido px-4 pb-[6rem] pt-4 outline-none"
      >
        {errorAlmacenamiento && (
          <div
            role="alert"
            className="no-imprimir mb-4 rounded-tarjeta border-2 border-ambar-texto bg-ambar-suave px-4 py-3 text-ambar-texto"
          >
            <strong className="block font-semibold">No se pudo guardar</strong>
            {errorAlmacenamiento}
          </div>
        )}
        <AvisoSincronizacion />

        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/bienvenida" element={<Bienvenida />} />
            <Route path="/" element={<Hoy />} />
            <Route path="/registrar" element={<Registrar />} />
            <Route path="/medicamentos" element={<Medicamentos />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/citas" element={<Citas />} />
            <Route path="/informe" element={<Informe />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/calidad" element={<Calidad />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Todo lo que la app confirma se anuncia aquí para el lector de pantalla. */}
      <p aria-live="polite" role="status" className="solo-lectores">
        {anuncio}
      </p>

      <BarraDeshacer />
      {!enBienvenida && <NavInferior preferencias={estado.preferencias} />}
    </div>
  )
}

function Raiz() {
  const { configurado, cargando, usuario } = useSesion()

  if (configurado && cargando) return <PantallaEspera mensaje="Abriendo Pulso…" />
  if (configurado && !usuario) {
    return (
      <main id="contenido" tabIndex={-1} className="min-h-dvh outline-none">
        <Entrar />
      </main>
    )
  }

  const uid = usuario?.id ?? null
  return (
    <AppProvider key={uid ?? 'local'} usuarioId={uid}>
      <Marco />
    </AppProvider>
  )
}

export default function App() {
  return (
    <SesionProvider>
      <HashRouter>
        <Raiz />
      </HashRouter>
    </SesionProvider>
  )
}
