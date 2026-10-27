/* ============================================================================
   Gráfico de tendencia
   ----------------------------------------------------------------------------
   Línea con la banda sombreada del rango objetivo detrás. La banda es el punto
   entero del gráfico: no importa tanto el número como si la línea va por
   dentro o por fuera de lo que dijo el médico.

   El gráfico es un dibujo. Para quien usa lector de pantalla existe la MISMA
   información como tabla, aquí abajo, oculta a la vista pero no al lector
   . No es un extra: es lo que hace que el gráfico sea accesible.
   ========================================================================== */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Medicion, RangosObjetivo, TipoMedicion } from '../types'
import { NOMBRE_TIPO, UNIDADES } from '../lib/rangos'

interface Punto {
  iso: string
  etiqueta: string
  principal: number | null
  secundario?: number | null
}

function armarPuntos(mediciones: Medicion[], tipo: TipoMedicion): Punto[] {
  return [...mediciones]
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    .map((m) => ({
      iso: m.fechaHora,
      etiqueta: format(new Date(m.fechaHora), 'd MMM', { locale: es }),
      principal:
        tipo === 'presion'
          ? (m.valores.sistolica ?? null)
          : tipo === 'glucosa'
            ? (m.valores.glucosa ?? null)
            : (m.valores.peso ?? null),
      secundario: tipo === 'presion' ? (m.valores.diastolica ?? null) : undefined,
    }))
}

function bandaObjetivo(
  tipo: TipoMedicion,
  rangos: RangosObjetivo | null | undefined,
): { min: number; max: number } | null {
  if (!rangos) return null
  if (tipo === 'presion' && rangos.presion)
    return { min: rangos.presion.sisMin, max: rangos.presion.sisMax }
  if (tipo === 'glucosa' && rangos.glucosa)
    return { min: rangos.glucosa.ayunasMin, max: rangos.glucosa.ayunasMax }
  if (tipo === 'peso' && rangos.peso) return { min: rangos.peso.min, max: rangos.peso.max }
  return null
}

export default function GraficoTendencia({
  mediciones,
  tipo,
  rangos,
}: {
  mediciones: Medicion[]
  tipo: TipoMedicion
  rangos: RangosObjetivo | null | undefined
}) {
  const puntos = armarPuntos(mediciones, tipo)
  const banda = bandaObjetivo(tipo, rangos)
  const unidad = UNIDADES[tipo]

  if (puntos.length < 2) {
    return (
      <p className="rounded-tarjeta border border-dashed border-borde-fuerte bg-lino px-4 py-8 text-center text-bruma-texto">
        Hacen falta al menos dos mediciones en el período para dibujar una tendencia.
      </p>
    )
  }

  const primera = puntos[0]?.principal ?? 0
  const ultima = puntos[puntos.length - 1]?.principal ?? 0
  const direccion = ultima > primera ? 'subió' : ultima < primera ? 'bajó' : 'se mantuvo igual'

  const resumen = `Tendencia de ${NOMBRE_TIPO[tipo].toLowerCase()} con ${puntos.length} mediciones. ` +
    `Empezó en ${primera} y terminó en ${ultima} ${unidad}: ${direccion}.` +
    (banda ? ` El rango objetivo va de ${banda.min} a ${banda.max} ${unidad}.` : '')

  return (
    <figure className="m-0">
      <div className="h-[16rem] w-full" role="img" aria-label={resumen}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={puntos} margin={{ top: 4, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid stroke="var(--pulso-borde)" strokeDasharray="3 3" vertical={false} />
            {banda && (
              <ReferenceArea
                y1={banda.min}
                y2={banda.max}
                fill="var(--pulso-salvia)"
                fillOpacity={0.16}
                stroke="var(--pulso-salvia)"
                strokeOpacity={0.4}
              />
            )}
            <XAxis
              dataKey="etiqueta"
              tick={{ fontSize: 12, fill: 'var(--pulso-bruma-texto)' }}
              stroke="var(--pulso-bruma)"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--pulso-bruma-texto)' }}
              stroke="var(--pulso-bruma)"
              width={44}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              formatter={(v, nombre) => [`${v ?? '—'} ${unidad}`, String(nombre ?? '')]}
              contentStyle={{
                background: 'var(--pulso-papel)',
                border: '1px solid var(--pulso-borde-fuerte)',
                borderRadius: 10,
                fontSize: 13,
              }}
            />
            {/* Corrección H-05: leyenda visible. Dos líneas sin leyenda
                obligan a adivinar cuál es la sistólica y cuál la diastólica. */}
            <Legend
              verticalAlign="top"
              height={28}
              wrapperStyle={{ fontSize: 13, color: 'var(--pulso-bruma-texto)' }}
            />
            {/* Corrección H-03: sin animación. La animación de entrada de
                Recharts dura 1.5 s y deja la línea a medio dibujar al imprimir
                o al capturar; además ignora prefers-reduced-motion. */}
            <Line
              type="monotone"
              dataKey="principal"
              name={tipo === 'presion' ? 'Sistólica (alta)' : NOMBRE_TIPO[tipo]}
              stroke="var(--pulso-tinta)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--pulso-tinta)' }}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive={false}
            />
            {tipo === 'presion' && (
              <Line
                type="monotone"
                dataKey="secundario"
                name="Diastólica (baja)"
                stroke="var(--pulso-salvia-fuerte)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 2.5, fill: 'var(--pulso-salvia-fuerte)' }}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-2 text-[0.9rem] text-bruma-texto">{resumen}</figcaption>

      {/* Tabla accesible equivalente: misma información, para lectores de pantalla. */}
      <table className="solo-lectores">
        <caption>Datos del gráfico de {NOMBRE_TIPO[tipo].toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">{tipo === 'presion' ? 'Sistólica' : NOMBRE_TIPO[tipo]}</th>
            {tipo === 'presion' && <th scope="col">Diastólica</th>}
          </tr>
        </thead>
        <tbody>
          {puntos.map((p) => (
            <tr key={p.iso}>
              <th scope="row">{p.etiqueta}</th>
              <td>
                {p.principal} {unidad}
              </td>
              {tipo === 'presion' && (
                <td>
                  {p.secundario} {unidad}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
