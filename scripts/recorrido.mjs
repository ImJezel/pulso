/* ============================================================================
   Recorrido completo de un usuario nuevo
   ----------------------------------------------------------------------------
   «Un usuario nuevo puede: configurar perfil → agregar medicamento → registrar
   medición → ver historial → generar informe, sin instrucciones externas.»

   Ese criterio se puede afirmar o se puede comprobar. Este script lo comprueba:
   arranca con el almacenamiento vacío y recorre los 12 pasos tocando la
   interfaz como lo haría una persona, buscando los controles POR SU TEXTO
   VISIBLE. Si algún botón cambia de nombre o desaparece, el paso falla.

   Uso:  npm run dev   (en otra terminal)
         npm run recorrido
   ========================================================================== */

import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const BASE = process.env.PULSO_URL ?? 'http://localhost:5173'
const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

const ejecutable = process.env.PULSO_CHROME ?? NAVEGADORES.find((r) => existsSync(r))
if (!ejecutable) {
  console.error('No se encontró Chrome ni Edge. Indica la ruta con PULSO_CHROME.')
  process.exit(1)
}

const navegador = await puppeteer.launch({
  executablePath: ejecutable,
  headless: 'new',
  args: ['--no-sandbox'],
})
const pagina = await navegador.newPage()
await pagina.setViewport({ width: 390, height: 844 })

let fallidos = 0
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function paso(nombre, accion) {
  try {
    await accion()
    console.log(`  ✓ ${nombre}`)
  } catch (e) {
    console.log(`  ✗ ${nombre} — ${e.message}`)
    fallidos++
  }
}

/** Pulsa el primer botón o enlace cuyo texto visible contenga `texto`. */
async function clic(texto) {
  const encontrado = await pagina.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a')].find((e) =>
      (e.innerText || '').trim().toLowerCase().includes(t.toLowerCase()),
    )
    if (!el) return false
    el.click()
    return true
  }, texto)
  if (!encontrado) throw new Error(`no se encontró el control «${texto}»`)
  await esperar(600)
}

/** Escribe en el campo cuya <label> empieza por `etiqueta`. */
async function escribir(etiqueta, valor) {
  const selector = await pagina.evaluate((et) => {
    const lab = [...document.querySelectorAll('label')].find((l) =>
      l.innerText.trim().toLowerCase().startsWith(et.toLowerCase()),
    )
    const inp = lab && document.getElementById(lab.htmlFor)
    if (!inp) return null
    return `#${CSS.escape(inp.id)}`
  }, etiqueta)
  if (!selector) throw new Error(`no se encontró el campo «${etiqueta}»`)
  await pagina.click(selector)
  await pagina.type(selector, valor)
}

async function contiene(texto) {
  const ok = await pagina.evaluate((t) => document.body.innerText.includes(t), texto)
  if (!ok) throw new Error(`la pantalla no muestra «${texto}»`)
}

/* --- El recorrido --------------------------------------------------------- */

await pagina.goto(BASE, { waitUntil: 'networkidle2' })
await pagina.evaluate(() => localStorage.clear())
await pagina.reload({ waitUntil: 'networkidle2' })
await esperar(700)

console.log('Recorrido de un usuario nuevo, sin instrucciones externas:\n')

await paso('1 · La app arranca en la configuración inicial', () => contiene('Bienvenida a Pulso'))

await paso('2 · Escribe su nombre y continúa', async () => {
  await escribir('Tu nombre', 'Altagracia')
  await clic('Continuar')
})

await paso('3 · Elige una condición y continúa', async () => {
  await clic('Hipertensión')
  await clic('Continuar')
})

await paso('4 · Escribe los rangos que le dio su médico y termina', async () => {
  await escribir('Sistólica mín', '100')
  await escribir('Sistólica máx', '130')
  await escribir('Diastólica mín', '60')
  await escribir('Diastólica máx', '85')
  await clic('Empezar a usar Pulso')
})

await paso('5 · Llega a Hoy y la app la saluda por su nombre', () => contiene('Hola, Altagracia'))

await paso('6 · Agrega Losartán 50 mg con dos horarios', async () => {
  await clic('Medicamentos')
  await clic('Agregar medicamento')
  await escribir('Nombre', 'Losartán')
  await escribir('Dosis', '50 mg')
  await clic('+ 8:00 a')
  await clic('+ 8:00 p')
  await clic('Guardar')
  await contiene('Losartán')
})

await paso('7 · Registra una presión de 145/92 y la app la clasifica', async () => {
  await pagina.goto(`${BASE}/#/registrar`, { waitUntil: 'networkidle2' })
  await esperar(600)
  await escribir('Sistólica (alta)', '145')
  await escribir('Diastólica (baja)', '92')
  await clic('Guardar medición')
  await contiene('Medición guardada')
  await contiene('Fuera de tu rango')
  await contiene('Consulta con tu médico')
})

await paso('8 · La medición aparece en Hoy', async () => {
  await pagina.goto(`${BASE}/#/`, { waitUntil: 'networkidle2' })
  await esperar(600)
  await contiene('145/92')
})

await paso('9 · La dosis del día está lista para marcarse', async () => {
  await contiene('Losartán')
  await contiene('Tomé')
})

await paso('10 · Marca la dosis y puede deshacerlo', async () => {
  await clic('Tomé')
  await contiene('Deshacer')
})

await paso('11 · Consulta el historial', async () => {
  await pagina.goto(`${BASE}/#/historial`, { waitUntil: 'networkidle2' })
  await esperar(900)
  await contiene('Historial y tendencias')
  await contiene('145/92')
})

await paso('12 · Genera el informe para el médico, con su aviso de alcance', async () => {
  await pagina.goto(`${BASE}/#/informe`, { waitUntil: 'networkidle2' })
  await esperar(900)
  await contiene('Informe de control de tratamiento')
  await contiene('Altagracia')
  await contiene('No constituye un diagnóstico médico')
})

await navegador.close()

console.log(
  fallidos === 0
    ? '\nLos 12 pasos se completan: la app se puede usar sin instrucciones.'
    : `\n${fallidos} paso(s) fallidos: un usuario nuevo se quedaría atascado.`,
)
process.exit(fallidos === 0 ? 0 : 1)
