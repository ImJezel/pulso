import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* El service worker solo funciona servido por http(s). Cuando el build se abre
   con doble clic (file://) el navegador rechaza el registro, así que ni se
   intenta: la app funciona igual, solo sin caché offline. */
if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {})
}
