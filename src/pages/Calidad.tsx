/* ============================================================================
   /calidad — Evaluación ISO/IEC 25010 dentro del propio prototipo
   ----------------------------------------------------------------------------
   Que la evaluación de calidad viva DENTRO de la app tiene un motivo práctico:
   en la demostración se enseña en vivo, y en la defensa se puede tocar el
   ítem del que pregunte la facilitadora y leer la evidencia en pantalla.

   Las puntuaciones no son todas cincos a propósito. Seguridad saca 3.0 y no
   es un descuido: es la consecuencia medida de haber decidido no tener
   cuentas de usuario ni servidor. Un cuestionario donde todo da 5 no
   demuestra calidad, demuestra que no se evaluó.
   ========================================================================== */

import { useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion } from '../components/Tarjeta'
import { Chip } from '../components/Insignia'
import {
  indiceGlobal,
  resumenPorCaracteristica,
  UMBRAL_PLAN_MEJORA,
} from '../lib/calidadISO'
import type { Caracteristica } from '../lib/calidadISO'

export default function Calidad() {
  const { estado } = usePulso()
  const resumen = resumenPorCaracteristica()
  const global = indiceGlobal()
  const [detalle, setDetalle] = useState<Caracteristica | null>(null)

  const datosRadar = resumen.map((r) => ({ eje: r.corto, valor: r.promedio }))
  const bajas = resumen.filter((r) => r.promedio < UMBRAL_PLAN_MEJORA)
  const seleccionada = resumen.find((r) => r.caracteristica === detalle)

  return (
    <div className="animar-entrar space-y-6">
      <header>
        <h1 className="font-display text-[1.8rem] text-tinta">Calidad del producto</h1>
        <p className="text-bruma-texto">
          Autoevaluación técnica según ISO/IEC 25010:2011 · 40 ítems · escala 1 a 5
        </p>
      </header>

      {/* --- Índice global ------------------------------------------------- */}
      <Tarjeta className="px-4 py-5 text-center">
        <p className="text-bruma-texto">Índice global de calidad</p>
        <p className="cifra text-[3rem] leading-none text-tinta">{global.toFixed(2)}</p>
        <p className="mt-1 text-bruma-texto">
          sobre 5.00 ({Math.round((global / 5) * 100)} %) — promedio simple de las 8 características
        </p>
      </Tarjeta>

      {/* --- Radar ---------------------------------------------------------- */}
      <section aria-labelledby="t-radar">
        <TituloSeccion id="t-radar">Las 8 características</TituloSeccion>
        <Tarjeta className="px-2 py-4">
          <div
            className="h-[20rem] w-full"
            role="img"
            aria-label={`Gráfico de radar con las 8 características de calidad. ${resumen
              .map((r) => `${r.caracteristica}: ${r.promedio.toFixed(2)}`)
              .join('. ')}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={datosRadar} outerRadius="72%">
                <PolarGrid stroke="var(--pulso-borde-fuerte)" />
                <PolarAngleAxis
                  dataKey="eje"
                  tick={{ fontSize: 12, fill: 'var(--pulso-tinta)' }}
                />
                <PolarRadiusAxis
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fontSize: 10, fill: 'var(--pulso-bruma-texto)' }}
                  axisLine={false}
                />
                <Radar
                  name="Autoevaluación"
                  dataKey="valor"
                  stroke="var(--pulso-salvia-fuerte)"
                  fill="var(--pulso-salvia)"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      </section>

      {/* --- Tabla ----------------------------------------------------------- */}
      <section aria-labelledby="t-tabla-iso">
        <TituloSeccion id="t-tabla-iso">Puntuación por característica</TituloSeccion>
        <Tarjeta className="overflow-hidden">
          <table className="w-full border-collapse text-left">
            <caption className="solo-lectores">
              Promedio de cada característica de calidad, sobre 5
            </caption>
            <thead>
              <tr className="border-b border-borde text-[0.9rem] text-bruma-texto">
                <th scope="col" className="px-3 py-2.5 font-semibold">Característica</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Promedio</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.caracteristica} className="border-b border-borde last:border-0">
                  <th scope="row" className="px-3 py-2.5 font-normal text-tinta">
                    {r.caracteristica}
                  </th>
                  <td className="cifra px-3 py-2.5 text-tinta">{r.promedio.toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.85rem] font-semibold ${
                        r.promedio >= 4
                          ? 'border-salvia-fuerte/35 bg-salvia-suave text-salvia-fuerte'
                          : r.promedio >= UMBRAL_PLAN_MEJORA
                            ? 'border-ambar-texto/35 bg-ambar-suave text-ambar-texto'
                            : 'border-ladrillo/35 bg-ladrillo-suave text-ladrillo'
                      }`}
                    >
                      {r.promedio >= 4
                        ? 'Sólido'
                        : r.promedio >= UMBRAL_PLAN_MEJORA
                          ? 'Aceptable'
                          : 'Requiere plan de mejora'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </section>

      {/* --- Detalle de ítems -------------------------------------------------- */}
      <section aria-labelledby="t-items">
        <TituloSeccion id="t-items">Ver los ítems de una característica</TituloSeccion>
        <div className="mb-3 flex flex-wrap gap-2">
          {resumen.map((r) => (
            <Chip
              key={r.caracteristica}
              activo={detalle === r.caracteristica}
              onClick={() =>
                setDetalle(detalle === r.caracteristica ? null : r.caracteristica)
              }
            >
              {r.corto}
            </Chip>
          ))}
        </div>

        {seleccionada && (
          <ul className="space-y-3">
            {seleccionada.items.map((i) => (
              <Tarjeta as="li" key={i.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="cifra text-[0.85rem] text-bruma-texto">
                      {i.id} · {i.subcaracteristica}
                    </p>
                    <p className="mt-0.5 text-tinta">{i.item}</p>
                    <p className="mt-1.5 text-[0.9rem] text-bruma-texto">
                      <span className="font-semibold">Evidencia:</span> {i.evidencia}
                    </p>
                  </div>
                  <p className="cifra shrink-0 text-[1.6rem] text-tinta">{i.puntaje}</p>
                </div>
              </Tarjeta>
            ))}
          </ul>
        )}
      </section>

      {/* --- Interpretación honesta ------------------------------------------ */}
      <section aria-labelledby="t-lectura">
        <TituloSeccion id="t-lectura">Cómo se lee este resultado</TituloSeccion>
        <Tarjeta className="space-y-3 px-4 py-4 leading-relaxed">
          <p>
            Las tres características por debajo de {UMBRAL_PLAN_MEJORA.toFixed(1)} —
            {' '}
            {bajas.map((b) => b.caracteristica.toLowerCase()).join(', ')} — no son fallos de
            construcción: son el precio medido de las decisiones de alcance del proyecto.
          </p>
          <p>
            <strong>Seguridad ({resumen.find((r) => r.caracteristica === 'Seguridad')?.promedio.toFixed(2)}).</strong>{' '}
            «No repudio» saca 1 y «autenticidad» saca 2 porque Pulso no tiene cuentas de usuario.
            Es coherente: sin identidad verificada no puede haber constancia de quién escribió qué.
            En una versión productiva se abordaría con autenticación del dispositivo (biometría del
            teléfono) y cifrado en reposo, no con una contraseña más que memorizar.
          </p>
          <p>
            <strong>Fiabilidad ({resumen.find((r) => r.caracteristica === 'Fiabilidad')?.promedio.toFixed(2)}).</strong>{' '}
            El «Deshacer» dura 8 segundos y solo guarda un paso, y los datos viven en un solo
            dispositivo. La mejora concreta y barata es un botón de exportar copia de seguridad:
            la función ya existe en storage.ts, le falta la interfaz.
          </p>
          <p>
            <strong>Compatibilidad ({resumen.find((r) => r.caracteristica === 'Compatibilidad')?.promedio.toFixed(2)}).</strong>{' '}
            La única salida estructurada es el .ics de las citas. Exportar las mediciones a CSV
            resolvería la mitad del problema en unas pocas líneas.
          </p>
          <p className="border-t border-borde pt-3 text-[0.92rem] text-bruma-texto">
            Esta pantalla muestra la autoevaluación técnica del equipo. El documento
            docs/04-iso-25010.md contiene además la evaluación de los 5 participantes del test de
            usabilidad sobre los ítems que un usuario sí puede juzgar, y el plan de mejora completo.
            {estado.datosDemo && ' Los datos que ves en el resto de la app son de demostración.'}
          </p>
        </Tarjeta>
      </section>
    </div>
  )
}
