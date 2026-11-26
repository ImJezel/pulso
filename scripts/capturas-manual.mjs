/* ============================================================================
   Capturas del manual de usuario — manual/capturas/
   ----------------------------------------------------------------------------
   A diferencia de capturas.mjs (páginas completas, para evidencia), aquí se
   fotografía lo que ve el paciente en su teléfono (390 × 844) y se recorren
   los procesos clave paso a paso: entrar, configurar el perfil, marcar una
   dosis, registrar una medición, agregar un medicamento y sacar el informe.

   Uso:  npm run dev          (puerto 5173, para la pantalla «Entrar»)
         npx vite --mode sincuenta --port 5174
         node scripts/capturas-manual.mjs
   ========================================================================== */

import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const CON_CUENTA = process.env.PULSO_URL ?? 'http://localhost:5173'
const LOCAL = process.env.PULSO_URL_LOCAL ?? 'http://localhost:5174'
const SALIDA = resolve('manual/capturas')
const NAVEGADOR = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function foto(p, nombre) {
  await esperar(700)
  await p.screenshot({ path: `${SALIDA}/${nombre}.png` })
  console.log(`  ✓ ${nombre}.png`)
}

/** Pulsa el primer botón (o enlace) cuyo texto visible contiene `texto`. */
async function pulsar(p, texto) {
  const ok = await p.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a')].find(
      (b) => b.textContent.replace(/\s+/g, ' ').trim().includes(t) && b.offsetParent !== null,
    )
    if (el) el.click()
    return Boolean(el)
  }, texto)
  if (!ok) console.warn(`  ! no se encontró «${texto}»`)
  await esperar(500)
  return ok
}

async function escribir(p, selector, valor) {
  await p.click(selector, { clickCount: 3 })
  await p.type(selector, valor)
}

async function main() {
  mkdirSync(SALIDA, { recursive: true })
  const b = await puppeteer.launch({ executablePath: NAVEGADOR, headless: 'new' })
  const nuevaPagina = async () => {
    const pg = await b.newPage()
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    return pg
  }
  let p = await nuevaPagina()

  // 1. Entrar (con Supabase): solo se fotografía, no se envía nada.
  await p.goto(`${CON_CUENTA}/#/`, { waitUntil: 'networkidle2' })
  await foto(p, '01-entrar')
  await pulsar(p, 'Crear una cuenta nueva')
  await foto(p, '02-crear-cuenta')

  // 2. Bienvenida en modo local, con el almacenamiento vacío.
  await p.goto(`${LOCAL}/#/bienvenida`, { waitUntil: 'networkidle2' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle2' })
  await escribir(p, 'input[autocomplete="given-name"]', 'María')
  await foto(p, '03-bienvenida-paso1')
  await pulsar(p, 'Continuar')
  await pulsar(p, 'Hipertensión')
  await pulsar(p, 'Diabetes tipo 2')
  await foto(p, '04-bienvenida-paso2')
  await pulsar(p, 'Continuar')
  await foto(p, '05-bienvenida-paso3')

  // 3. Datos de demostración, generados con el propio generador de la app y
  // escritos ANTES de que la app arranque en una pestaña nueva: así ninguna
  // pestaña con estado en memoria puede pisarlos.
  const demo = await p.evaluate(async () => {
    const { generarDatosDemo } = await import('/src/lib/demo.ts')
    return JSON.stringify(generarDatosDemo())
  })
  await p.close()
  p = await nuevaPagina()
  await p.evaluateOnNewDocument((datos) => {
    if (!sessionStorage.getItem('pulso.sembrado')) {
      localStorage.setItem('pulso.datos.v1', datos)
      sessionStorage.setItem('pulso.sembrado', '1')
    }
  }, demo)
  await p.goto(`${LOCAL}/#/`, { waitUntil: 'networkidle2' })
  await foto(p, '06-hoy')
  // La primera dosis pendiente: se lleva a la vista, se pulsa «Tomé» y aparece «Deshacer».
  // Si a esta hora ya están todas marcadas, «Cambiar» devuelve la primera a pendiente.
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('button')]
    if (!t.some((b) => b.textContent.trim().startsWith('Tomé')))
      t.find((b) => b.textContent.trim().startsWith('Cambiar'))?.click()
  })
  await esperar(9000) // que se vaya la barra «Deshacer» de ese cambio
  const pendiente = await p.evaluateHandle(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Tomé')),
  )
  if (pendiente.asElement()) {
    await pendiente.asElement().evaluate((b) => b.closest('li, article, div').scrollIntoView({ block: 'center' }))
    await foto(p, '07-hoy-dosis-pendiente')
    await pendiente.asElement().click()
    await foto(p, '07b-hoy-dosis-tomada')
  } else console.warn('  ! no hay dosis pendientes hoy', await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).join(' | ')))

  // 4. Registrar una glucosa.
  await p.goto(`${LOCAL}/#/registrar`, { waitUntil: 'networkidle2' })
  await p.reload({ waitUntil: 'networkidle2' })
  await pulsar(p, 'Glucosa')
  await p.evaluate(() => window.scrollTo(0, 0))
  await foto(p, '08-registrar')
  const campo = await p.$('input[type="number"]')
  if (campo) {
    await campo.type('128')
    await foto(p, '09-registrar-valor')
    await pulsar(p, 'Guardar medición')
    await foto(p, '10-registrar-guardada')
  }

  // 5. Medicamentos y el panel para agregar uno.
  await p.goto(`${LOCAL}/#/medicamentos`, { waitUntil: 'networkidle2' })
  await p.reload({ waitUntil: 'networkidle2' })
  await foto(p, '11-medicamentos')
  await pulsar(p, 'Agregar')
  await foto(p, '12-medicamento-agregar')

  // 6. El resto de pantallas principales.
  for (const [nombre, ruta] of [
    ['13-historial', '#/historial'],
    ['14-citas', '#/citas'],
    ['15-informe', '#/informe'],
    ['16-ajustes', '#/ajustes'],
  ]) {
    await p.goto(`${LOCAL}/${ruta}`, { waitUntil: 'networkidle2' })
    await p.reload({ waitUntil: 'networkidle2' }) // sin la barra «Deshacer» de la pantalla anterior
    await esperar(800)
    await foto(p, nombre)
  }

  // 7. Accesibilidad: texto muy grande y alto contraste.
  await pulsar(p, 'Muy grande')
  await foto(p, '17-texto-muy-grande')

  await b.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
