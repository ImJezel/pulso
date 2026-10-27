/* ============================================================================
   Auditoría de accesibilidad con axe-core
   ----------------------------------------------------------------------------
   Recorre las 9 rutas con los datos de demostración cargados y ejecuta axe
   sobre cada una, en modo normal y en alto contraste. Guarda el informe en
   docs/evidencias/axe-resultados.md y devuelve código 1 si encuentra alguna
   violación seria o crítica, para que se note.

   Lighthouse audita una sola página; esto audita las nueve.

   Uso:  npm run dev   (en otra terminal)
         npm run axe
   ========================================================================== */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE = process.env.PULSO_URL ?? 'http://localhost:5173'
const SALIDA = resolve('docs/evidencias')
const AXE = readFileSync(resolve('node_modules/axe-core/axe.min.js'), 'utf8')

const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

const RUTAS = [
  ['Hoy', '#/'],
  ['Registrar', '#/registrar'],
  ['Medicamentos', '#/medicamentos'],
  ['Historial', '#/historial'],
  ['Citas', '#/citas'],
  ['Informe', '#/informe'],
  ['Ajustes', '#/ajustes'],
  ['Calidad', '#/calidad'],
]

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function sembrar(pagina, preferencias) {
  await pagina.goto(`${BASE}/#/bienvenida`, { waitUntil: 'networkidle2' })
  await pagina.evaluate(async (prefs) => {
    const { generarDatosDemo } = await import('/src/lib/demo.ts')
    const estado = generarDatosDemo()
    estado.preferencias = { ...estado.preferencias, ...prefs }
    window.localStorage.setItem('pulso.datos.v1', JSON.stringify(estado))
  }, preferencias)
  await pagina.goto(`${BASE}/#/`, { waitUntil: 'networkidle2' })
  await pagina.reload({ waitUntil: 'networkidle2' })
  await esperar(500)
}

async function auditar(pagina, ruta) {
  await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle2' })
  await esperar(700)
  await pagina.evaluate(AXE)
  return pagina.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    })
    return {
      violaciones: r.violations.map((v) => ({
        id: v.id,
        impacto: v.impact,
        descripcion: v.help,
        nodos: v.nodes.length,
        ejemplo: v.nodes[0]?.html?.slice(0, 160) ?? '',
      })),
      pasadas: r.passes.length,
    }
  })
}

async function main() {
  mkdirSync(SALIDA, { recursive: true })
  const ejecutable = process.env.PULSO_CHROME ?? NAVEGADORES.find((p) => existsSync(p))
  if (!ejecutable) throw new Error('No se encontró Chrome ni Edge.')

  const navegador = await puppeteer.launch({
    executablePath: ejecutable,
    headless: 'new',
    args: ['--no-sandbox'],
  })

  const lineas = [
    '# Auditoría de accesibilidad con axe-core',
    '',
    `Generado el ${new Date().toLocaleString('es-DO')} · Reglas: WCAG 2.0/2.1 nivel A y AA + buenas prácticas.`,
    '',
    'Herramienta: `axe-core` (el mismo motor que usan axe DevTools y Lighthouse), ejecutado sobre',
    'las 9 rutas de la aplicación con los datos de demostración cargados.',
    '',
  ]
  let totalViolaciones = 0
  let seriasOCriticas = 0

  try {
    const pagina = await navegador.newPage()
    await pagina.setViewport({ width: 390, height: 844 })

    for (const [etiqueta, prefs] of [
      ['Modo normal', {}],
      ['Alto contraste', { altoContraste: true }],
      ['Texto muy grande', { escalaTexto: 'muy-grande' }],
    ]) {
      lineas.push(`## ${etiqueta}`, '', '| Pantalla | Violaciones | Reglas superadas |', '|---|---|---|')
      await sembrar(pagina, prefs)
      const detalles = []

      for (const [nombre, ruta] of RUTAS) {
        const r = await auditar(pagina, ruta)
        totalViolaciones += r.violaciones.length
        seriasOCriticas += r.violaciones.filter((v) =>
          ['serious', 'critical'].includes(v.impacto),
        ).length
        lineas.push(`| ${nombre} | ${r.violaciones.length} | ${r.pasadas} |`)
        if (r.violaciones.length) {
          detalles.push(`### ${nombre}`, '')
          for (const v of r.violaciones) {
            detalles.push(
              `- **${v.id}** (${v.impacto}, ${v.nodos} elemento(s)): ${v.descripcion}`,
              `  \`${v.ejemplo}\``,
            )
          }
          detalles.push('')
        }
        console.log(`${etiqueta} · ${nombre}: ${r.violaciones.length} violación(es)`)
      }
      lineas.push('', ...detalles, '')
    }
  } finally {
    await navegador.close()
  }

  lineas.push(
    '## Resumen',
    '',
    `- Violaciones totales: **${totalViolaciones}**`,
    `- De impacto serio o crítico: **${seriasOCriticas}**`,
    '',
    totalViolaciones === 0
      ? 'axe no encontró violaciones en ninguna de las 9 pantallas, en los tres modos evaluados.'
      : 'Las violaciones listadas arriba están recogidas como hallazgos en `docs/02-evaluacion-heuristica.md`.',
  )

  writeFileSync(`${SALIDA}/axe-resultados.md`, lineas.join('\n'), 'utf8')
  console.log(`\nInforme en ${SALIDA}/axe-resultados.md`)
  process.exit(seriasOCriticas > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
