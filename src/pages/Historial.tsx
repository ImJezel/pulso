/* ============================================================================
   /historial — Historial y tendencias
   ----------------------------------------------------------------------------
   La pregunta que responde esta pantalla es "¿voy mejor o voy peor?", y esa
   pregunta no se contesta con una lista de números: se contesta con la línea
   y con la banda del rango detrás.

   La tabla de abajo no es un adorno: es la misma información en un formato
   que se puede leer dato por dato, ordenar mentalmente y llevar al médico.
   ========================================================================== */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart as IconoGrafico, Plus } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion } from '../components/Tarjeta'
import GraficoTendencia from '../components/GraficoTendencia'
import Insignia, { Chip } from '../components/Insignia'
import EstadoVacio from '../components/EstadoVacio'
import Boton from '../components/Boton'
import { calcularAdherencia, etiquetaAdherencia } from '../lib/adherencia'
import {
  clasificar,
  NOMBRE_TIPO,
  UNIDADES,
  valorNumerico,
  valorPrincipal,
} from '../lib/rangos'
import { fechaHoraCorta, finDia, inicioDia, sumarDias } from '../lib/fechas'
import type { TipoMedicion } from '../types'

const PERIODOS = [7, 30, 90] as const
const TIPOS: TipoMedicion[] = ['presion', 'glucosa', 'peso']

export default function Historial() {
  const { estado } = usePulso()
  const [tipo, setTipo] = useState<TipoMedicion>('presion')
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30)

  const ahora = useMemo(() => new Date(), [])
  const desde = useMemo(() => inicioDia(sumarDias(ahora, -(dias - 1))), [ahora, dias])
  const hasta = useMemo(() => finDia(ahora), [ahora])

  const mediciones = useMemo(
    () =>
      estado.mediciones.filter((m) => {
        const f = new Date(m.fechaHora)
        return m.tipo === tipo && f >= desde && f <= hasta
      }),
    [estado.mediciones, tipo, desde, hasta],
  )

  const numeros = mediciones.map(valorNumerico).filter((n): n is number => n !== null)
  const promedio = numeros.length
    ? Math.round((numeros.reduce((a, b) => a + b, 0) / numeros.length) * 10) / 10
    : null
  const maximo = numeros.length ? Math.max(...numeros) : null
  const minimo = numeros.length ? Math.min(...numeros) : null

  const adherencia = useMemo(
    () => calcularAdherencia(estado.registrosDosis, desde, hasta, ahora),
    [estado.registrosDosis, desde, hasta, ahora],
  )

  const etiquetaDato = tipo === 'presion' ? 'sistólica' : NOMBRE_TIPO[tipo].toLowerCase()

  return (
    <div className="animar-entrar space-y-6">
      <h1 className="font-display text-[1.8rem] text-tinta">Historial y tendencias</h1>

      {/* --- Filtros ------------------------------------------------------ */}
      <div className="space-y-3">
        <fieldset className="border-0 p-0">
          <legend className="mb-2 font-semibold text-tinta">Tipo de medición</legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>
                {NOMBRE_TIPO[t]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="mb-2 font-semibold text-tinta">Período</legend>
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <Chip
                key={p}
                activo={dias === p}
                onClick={() => setDias(p)}
                ariaLabel={`Últimos ${p} días`}
              >
                {p} días
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      {mediciones.length === 0 ? (
        <EstadoVacio
          icono={<IconoGrafico size={26} aria-hidden="true" />}
          titulo={`Sin mediciones de ${NOMBRE_TIPO[tipo].toLowerCase()} en estos ${dias} días`}
          mensaje="Prueba con un período más largo o registra una medición nueva."
          accion={
            <Link to="/registrar">
              <Boton variante="primario" tamano="grande" icono={<Plus size={20} aria-hidden="true" />}>
                Registrar medición
              </Boton>
            </Link>
          }
        />
      ) : (
        <>
          {/* --- Gráfico ---------------------------------------------------- */}
          <section aria-labelledby="t-grafico">
            <TituloSeccion id="t-grafico">Tendencia</TituloSeccion>
            <Tarjeta className="px-3 py-4">
              <GraficoTendencia
                mediciones={mediciones}
                tipo={tipo}
                rangos={estado.perfil?.rangosObjetivo}
              />
            </Tarjeta>
          </section>

          {/* --- Resumen ---------------------------------------------------- */}
          <section aria-labelledby="t-resumen">
            <TituloSeccion id="t-resumen">Resumen del período</TituloSeccion>
            <div className="grid grid-cols-2 gap-3">
              <Tarjeta className="px-4 py-3">
                <p className="text-[0.9rem] text-bruma-texto">Promedio de {etiquetaDato}</p>
                <p className="cifra text-[1.75rem] text-tinta">
                  {promedio ?? '—'} <span className="text-[0.9rem] font-normal">{UNIDADES[tipo]}</span>
                </p>
              </Tarjeta>
              <Tarjeta className="px-4 py-3">
                <p className="text-[0.9rem] text-bruma-texto">Mediciones tomadas</p>
                <p className="cifra text-[1.75rem] text-tinta">{mediciones.length}</p>
              </Tarjeta>
              <Tarjeta className="px-4 py-3">
                <p className="text-[0.9rem] text-bruma-texto">Más alto</p>
                <p className="cifra text-[1.75rem] text-tinta">{maximo ?? '—'}</p>
              </Tarjeta>
              <Tarjeta className="px-4 py-3">
                <p className="text-[0.9rem] text-bruma-texto">Más bajo</p>
                <p className="cifra text-[1.75rem] text-tinta">{minimo ?? '—'}</p>
              </Tarjeta>
              <Tarjeta className="col-span-2 px-4 py-3">
                <p className="text-[0.9rem] text-bruma-texto">Adherencia al tratamiento</p>
                <p className="cifra text-[1.75rem] text-tinta">
                  {adherencia.porcentaje !== null ? `${adherencia.porcentaje}%` : '—'}
                </p>
                <p className="text-[0.95rem] text-bruma-texto">
                  {etiquetaAdherencia(adherencia.porcentaje)} · {adherencia.tomadas} de{' '}
                  {adherencia.programadas} dosis tomadas
                </p>
              </Tarjeta>
            </div>
          </section>

          {/* --- Tabla ------------------------------------------------------ */}
          <section aria-labelledby="t-tabla">
            <TituloSeccion id="t-tabla">Todas las mediciones</TituloSeccion>
            {/* Corrección H-07: la tabla se desplazaba de lado sin decirlo, así
                que en móvil la columna "Nota" no existía para el usuario. Ahora
                lo avisa, y el contenedor es enfocable para poder desplazarlo
                también con el teclado. */}
            <p className="mb-2 text-[0.9rem] text-bruma-texto sm:hidden">
              Desliza la tabla hacia el lado para ver la clasificación y la nota.
            </p>
            <Tarjeta>
              <div
                tabIndex={0}
                role="region"
                aria-label="Tabla de mediciones, se desplaza de lado"
                className="overflow-x-auto rounded-tarjeta"
              >
              <table className="w-full min-w-[30rem] border-collapse text-left">
                <caption className="solo-lectores">
                  Mediciones de {NOMBRE_TIPO[tipo].toLowerCase()} de los últimos {dias} días
                </caption>
                <thead>
                  <tr className="border-b border-borde text-[0.9rem] text-bruma-texto">
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Fecha
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Valor
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Clasificación
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Nota
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mediciones.map((m) => (
                    <tr key={m.id} className="border-b border-borde last:border-0">
                      <th scope="row" className="cifra px-3 py-2.5 text-[0.9rem] font-normal">
                        {fechaHoraCorta(m.fechaHora)}
                      </th>
                      <td className="cifra px-3 py-2.5 text-tinta">
                        {valorPrincipal(m)}
                        {m.tipo === 'glucosa' && m.valores.contexto === 'postprandial' && (
                          <span className="ms-1 font-cuerpo text-[0.8rem] text-bruma-texto">
                            (después de comer)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Insignia clasificacion={clasificar(m, estado.perfil?.rangosObjetivo)} />
                      </td>
                      <td className="px-3 py-2.5 text-[0.9rem] text-bruma-texto">{m.nota || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Tarjeta>
          </section>
        </>
      )}
    </div>
  )
}
