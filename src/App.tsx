/* ============================================================================
   Pulso — Armazón de la aplicación
   ----------------------------------------------------------------------------
   Aquí se decide poco y se decide una sola vez: rutas, esqueleto de la página
   y las dos piezas transversales de accesibilidad (el salto al contenido y la
   región aria-live donde se anuncian las confirmaciones).

   Se usa HashRouter y no BrowserRouter a propósito: así el build estático de
   `dist/` se abre haciendo doble clic en index.html, sin servidor. Es el plan
   B de la presentación y no cuesta nada.
   ========================================================================== */

import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, usePulso } from './context/AppContext'
import { Encabezado, NavInferior } from './components/Navegacion'
import BarraDeshacer from './components/BarraDeshacer'
import Bienvenida from './pages/Bienvenida'
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

function Marco() {
  const { estado, anuncio, errorAlmacenamiento } = usePulso()
  const ubicacion = useLocation()
  const enBienvenida = ubicacion.pathname === '/bienvenida'
  const sinPerfil = estado.perfil === null

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

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Marco />
      </HashRouter>
    </AppProvider>
  )
}
