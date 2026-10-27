/* ============================================================================
   La cinta del día — el único elemento visualmente ambicioso de Pulso.
   ----------------------------------------------------------------------------
   Una franja que representa las 24 horas. Cada dosis programada es una marca
   en su hora:
       ● verde relleno  = tomada
       ○ ámbar hueca    = pendiente
       ⊘ gris tachada   = omitida
   Con un vistazo, sin leer, la persona sabe cómo va su día.

   Accesibilidad: la franja es decorativa (aria-hidden) y va acompañada SIEMPRE
   de un resumen en texto y de la lista de dosis que está debajo en la página.
   Un gráfico que solo existe como dibujo no existe para quien no lo ve.
   ========================================================================== */

import type { MarcaCinta } from '../lib/adherencia'
import { posicionAhora } from '../lib/adherencia'
import { horaTexto } from '../lib/fechas'

const HORAS_GUIA = [0, 6, 12, 18, 24]

export default function CintaDelDia({
  marcas,
  ahora = new Date(),
}: {
  marcas: MarcaCinta[]
  ahora?: Date
}) {
  const tomadas = marcas.filter((m) => m.estado === 'tomada').length
  const omitidas = marcas.filter((m) => m.estado === 'omitida').length
  const pendientes = marcas.filter((m) => m.estado === 'pendiente').length

  // Varias dosis a la misma hora se apilan en vez de taparse.
  const porHora = new Map<number, MarcaCinta[]>()
  for (const m of marcas) {
    const lista = porHora.get(m.posicion) ?? []
    lista.push(m)
    porHora.set(m.posicion, lista)
  }

  const resumen =
    marcas.length === 0
      ? 'Hoy no hay dosis programadas.'
      : `De ${marcas.length} dosis de hoy: ${tomadas} tomadas, ${omitidas} omitidas y ${pendientes} pendientes.`

  return (
    <figure className="m-0">
      <div
        aria-hidden="true"
        className="relative h-[4.5rem] w-full overflow-hidden rounded-tarjeta border border-borde bg-lino"
      >
        {/* Guías de hora */}
        {HORAS_GUIA.map((h) => (
          <div
            key={h}
            className="absolute bottom-0 top-0 border-l border-dashed border-borde"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            <span className="absolute bottom-1 left-1 text-[0.7rem] text-bruma-texto">
              {h === 24 ? '' : h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </span>
          </div>
        ))}

        {/* Aguja de la hora actual */}
        <div
          className="absolute bottom-0 top-0 w-[2px] bg-tinta/45"
          style={{ left: `${posicionAhora(ahora) * 100}%` }}
        />

        {/* Marcas de dosis */}
        {[...porHora.entries()].map(([posicion, lista]) =>
          lista.map((m, i) => (
            <span
              key={m.registro.id}
              title={`${m.medicamento?.nombre ?? 'Medicamento'} · ${horaTexto(
                m.registro.fechaHoraProgramada.slice(11, 16),
              )}`}
              className={[
                'absolute h-[0.95rem] w-[0.95rem] -translate-x-1/2 rounded-full border-2',
                m.estado === 'tomada'
                  ? 'border-salvia-fuerte bg-salvia-fuerte'
                  : m.estado === 'omitida'
                    ? 'border-bruma-texto bg-transparent'
                    : m.vencida
                      ? 'border-ambar-texto bg-ambar-suave'
                      : 'border-bruma-texto bg-papel',
              ].join(' ')}
              style={{
                left: `${posicion * 100}%`,
                top: `${0.5 + i * 1.15}rem`,
              }}
            >
              {m.estado === 'omitida' && (
                <span className="absolute left-[-1px] top-[45%] h-[2px] w-[calc(100%+2px)] rotate-45 bg-bruma-texto" />
              )}
            </span>
          )),
        )}
      </div>

      <figcaption className="mt-2 text-[0.9rem] text-bruma-texto">{resumen}</figcaption>
    </figure>
  )
}
