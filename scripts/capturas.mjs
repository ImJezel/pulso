/* ============================================================================
   Capturas de evidencia — docs/evidencias/
   ----------------------------------------------------------------------------
   Recorre las 9 pantallas de Pulso con los datos de demostración cargados y
   guarda un PNG de cada una, más las tres anchuras del control responsive y
   los dos modos de accesibilidad. Son las capturas que respaldan la evaluación
   de accesibilidad: salen de la aplicación real, no de maquetas.

   Usa puppeteer-core contra el Chrome o el Edge que ya está instalado en la
   máquina: no descarga un navegador de 150 MB solo para tomar fotos.

   Uso:  npm run dev   (en otra terminal)
         npm run capturas
   ========================================================================== */

import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE = process.env.PULSO_URL ?? 'http://localhost:5173'
const SALIDA = resolve('docs/evidencias')

const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

const PANTALLAS = [
  ['01-hoy', '#/', 'Hoy: cinta del día, dosis, última medición y próxima cita'],
  ['02-registrar', '#/registrar', 'Registrar medición'],
  ['03-medicamentos', '#/medicamentos', 'Medicamentos activos e inactivos'],
  ['04-historial', '#/historial', 'Historial con gráfico y banda de rango'],
  ['05-citas', '#/citas', 'Citas próximas y pasadas'],
  ['06-informe', '#/informe', 'Informe para el médico'],
  ['07-ajustes', '#/ajustes', 'Ajustes de accesibilidad y datos'],
  ['08-calidad', '#/calidad', 'Radar ISO/IEC 25010'],
]

function buscarNavegador() {
  const encontrado = NAVEGADORES.find((p) => existsSync(p))
  if (!encontrado) {
    throw new Error(
      'No se encontró Chrome ni Edge. Indica la ruta con la variable PULSO_CHROME.',
    )
  }
  return process.env.PULSO_CHROME ?? encontrado
}

async function cargarDemoEnLaApp(pagina, preferencias) {
  // Se usa la propia app para generar la demo: así los datos son los mismos
  // que verá la facilitadora, no una copia inventada en este script.
  await pagina.goto(`${BASE}/#/bienvenida`, { waitUntil: 'networkidle2' })
  const ok = await pagina.evaluate(async (prefs) => {
    const { generarDatosDemo } = await import('/src/lib/demo.ts')
    const estado = generarDatosDemo()
    estado.preferencias = { ...estado.preferencias, ...prefs }
    window.localStorage.setItem('pulso.datos.v1', JSON.stringify(estado))
    return estado.medicamentos.length
  }, preferencias)
  if (!ok) throw new Error('No se pudieron sembrar los datos de demostración.')
  // Recarga completa: cambiar solo el hash no reinicia React, y el estado en
  // memoria (sin perfil) volvería a pisar lo que acabamos de escribir.
  await pagina.goto(`${BASE}/#/`, { waitUntil: 'networkidle2' })
  await pagina.reload({ waitUntil: 'networkidle2' })
  await esperar(600)
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function capturar(pagina, nombre, ruta, completa = true) {
  await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle2' })
  await esperar(900) // que terminen las animaciones de 200 ms y los gráficos
  await pagina.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: completa })
  console.log(`  ✓ ${nombre}.png`)
}

async function main() {
  mkdirSync(SALIDA, { recursive: true })
  const navegador = await puppeteer.launch({
    executablePath: buscarNavegador(),
    headless: 'new',
    args: ['--force-device-scale-factor=2', '--hide-scrollbars'],
  })

  try {
    const pagina = await navegador.newPage()
    await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

    await cargarDemoEnLaApp(pagina, {})

    console.log('Pantallas (móvil 390 px):')
    for (const [nombre, ruta] of PANTALLAS) {
      await capturar(pagina, nombre, ruta)
    }

    console.log('Accesibilidad:')
    await cargarDemoEnLaApp(pagina, { altoContraste: true })
    await capturar(pagina, '09-alto-contraste', '#/')
    await cargarDemoEnLaApp(pagina, { escalaTexto: 'muy-grande' })
    await capturar(pagina, '10-texto-muy-grande', '#/')
    await cargarDemoEnLaApp(pagina, { modoSimple: true })
    await capturar(pagina, '11-modo-simple', '#/')

    console.log('Responsive:')
    await cargarDemoEnLaApp(pagina, {})
    for (const [ancho, alto, etiqueta] of [
      [360, 800, '12-responsive-360'],
      [768, 1024, '13-responsive-768'],
      [1280, 900, '14-responsive-1280'],
    ]) {
      await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: 2 })
      await capturar(pagina, etiqueta, '#/historial')
    }

    console.log('Vista de impresión del informe:')
    await pagina.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await pagina.goto(`${BASE}/#/informe`, { waitUntil: 'networkidle2' })
    await esperar(1200)
    await pagina.emulateMediaType('print')
    await pagina.screenshot({ path: `${SALIDA}/15-informe-impresion.png`, fullPage: true })
    console.log('  ✓ 15-informe-impresion.png')
    await pagina.pdf({
      path: `${SALIDA}/16-informe-a4.pdf`,
      format: 'A4',
      printBackground: true,
    })
    console.log('  ✓ 16-informe-a4.pdf')

    console.log(`\nListo. Evidencias en ${SALIDA}`)
  } finally {
    await navegador.close()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
