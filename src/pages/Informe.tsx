/* ============================================================================
   /informe — Informe para el médico
   ----------------------------------------------------------------------------
   Esta pantalla es el motivo por el que Pulso existe. La libreta de papel se
   pierde; esto se imprime en A4 en treinta segundos y llega completo a la
   consulta.

   No hay generación de PDF por código: se usa window.print() con una hoja
   @media print (src/index.css). El navegador ya sabe hacer PDF, funciona sin
   conexión, no añade dependencias y sale igual en cualquier computadora del
   laboratorio.

   El pie del documento dice lo que hay que decir: esto lo escribió el
   paciente, no es un diagnóstico.
   ========================================================================== */

import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta } from '../components/Tarjeta'
import Boton from '../components/Boton'
import { Chip } from '../components/Insignia'
import GraficoTendencia from '../components/GraficoTendencia'
import { calcularAdherencia, etiquetaAdherencia } from '../lib/adherencia'
import {
  clasificar,
  etiquetaClasificacion,
  NOMBRE_TIPO,
  UNIDADES,
  valorNumerico,
  valorPrincipal,
} from '../lib/rangos'
import { edad, fechaCorta, fechaHoraCorta, finDia, horaTexto, inicioDia, sumarDias } from '../lib/fechas'
import { CONDICIONES } from '../types'
import type { TipoMedicion } from '../types'

const PERIODOS = [30, 60, 90] as const

export default function Informe() {
  const { estado } = usePulso()
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30)

  const ahora = useMemo(() => new Date(), [])
  const desde = useMemo(() => inicioDia(sumarDias(ahora, -(dias - 1))), [ahora, dias])
  const hasta = useMemo(() => finDia(ahora), [ahora])

  const mediciones = useMemo(
    () =>
      estado.mediciones
        .filter((m) => {
          const f = new Date(m.fechaHora)
          return f >= desde && f <= hasta
        })
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
    [estado.mediciones, desde, hasta],
  )

  const adherencia = useMemo(
    () => calcularAdherencia(estado.registrosDosis, desde, hasta, ahora),
    [estado.registrosDosis, desde, hasta, ahora],
  )

  const perfil = estado.perfil
  const activos = estado.medicamentos.filter((m) => m.activo)
  const anios = perfil?.fechaNacimiento ? edad(perfil.fechaNacimiento) : null

  function resumenTipo(t: TipoMedicion) {
    const propias = mediciones.filter((m) => m.tipo === t)
    const nums = propias.map(valorNumerico).filter((n): n is number => n !== null)
    if (nums.length === 0) return null
    return {
      tipo: t,
      cantidad: propias.length,
      promedio: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10,
      maximo: Math.max(...nums),
      minimo: Math.min(...nums),
      fuera: propias.filter((m) => clasificar(m, perfil?.rangosObjetivo) === 'fuera-de-rango').length,
    }
  }

  const resumenes = (['presion', 'glucosa', 'peso'] as TipoMedicion[])
    .map(resumenTipo)
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const tipoConMasDatos = resumenes.sort((a, b) => b.cantidad - a.cantidad)[0]?.tipo ?? 'presion'
  const medicionesGrafico = mediciones.filter((m) => m.tipo === tipoConMasDatos)

  return (
    <div className="animar-entrar">
      {/* --- Controles (no se imprimen) ----------------------------------- */}
      <div className="no-imprimir mb-5">
        <h1 className="mb-3 font-display text-[1.8rem] text-tinta">Informe para el médico</h1>
        <fieldset className="mb-4 border-0 p-0">
          <legend className="mb-2 font-semibold text-tinta">Período del informe</legend>
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <Chip key={p} activo={dias === p} onClick={() => setDias(p)} ariaLabel={`Últimos ${p} días`}>
                {p} días
              </Chip>
            ))}
          </div>
        </fieldset>

        <Boton
          variante="primario"
          tamano="grande"
          anchoCompleto
          onClick={() => window.print()}
          icono={<Printer size={22} aria-hidden="true" />}
        >
          Imprimir o guardar en PDF
        </Boton>
        <p className="mt-2 text-[0.9rem] text-bruma-texto">
          Se abrirá la ventana de impresión de tu navegador. Para guardarlo como archivo, elige
          «Guardar como PDF» en el destino.
        </p>
      </div>

      {/* --- El documento -------------------------------------------------- */}
      <Tarjeta className="hoja-informe px-4 py-5 sm:px-6">
        <header className="evitar-corte border-b-2 border-tinta pb-3">
          <p className="font-display text-[1.6rem] leading-tight text-tinta">
            Informe de control de tratamiento
          </p>
          <p className="text-bruma-texto">
            Generado con Pulso el <span className="cifra">{fechaCorta(ahora)}</span> · Período:{' '}
            <span className="cifra">
              {fechaCorta(desde)} a {fechaCorta(hasta)}
            </span>{' '}
            ({dias} días)
          </p>
          {estado.datosDemo && (
            <p className="mt-1 font-semibold text-ambar-texto">
              DOCUMENTO DE DEMOSTRACIÓN — paciente ficticia, datos no reales.
            </p>
          )}
        </header>

        {/* Paciente */}
        <section className="evitar-corte mt-5">
          <h2 className="mb-2 font-display text-[1.2rem] text-tinta">Paciente</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="font-semibold">Nombre:</dt>
              <dd>{perfil?.nombre ?? '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Edad:</dt>
              <dd>{anios !== null ? `${anios} años` : 'No indicada'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Condiciones:</dt>
              <dd>
                {perfil?.condiciones.length
                  ? perfil.condiciones
                      .map((c) => CONDICIONES.find((x) => x.id === c)?.etiqueta ?? c)
                      .join(', ')
                  : 'No indicadas'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Contacto de emergencia:</dt>
              <dd>
                {perfil?.contactoEmergencia
                  ? `${perfil.contactoEmergencia.nombre} · ${perfil.contactoEmergencia.telefono}`
                  : 'No indicado'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Rangos objetivo */}
        <section className="evitar-corte mt-5">
          <h2 className="mb-2 font-display text-[1.2rem] text-tinta">
            Rangos objetivo registrados por el paciente
          </h2>
          <ul className="list-inside list-disc space-y-0.5">
            <li>
              Presión:{' '}
              {perfil?.rangosObjetivo.presion ? (
                <span className="cifra">
                  {perfil.rangosObjetivo.presion.sisMin}–{perfil.rangosObjetivo.presion.sisMax} /{' '}
                  {perfil.rangosObjetivo.presion.diaMin}–{perfil.rangosObjetivo.presion.diaMax} mmHg
                </span>
              ) : (
                'sin definir'
              )}
            </li>
            <li>
              Glucosa:{' '}
              {perfil?.rangosObjetivo.glucosa ? (
                <>
                  en ayunas{' '}
                  <span className="cifra">
                    {perfil.rangosObjetivo.glucosa.ayunasMin}–
                    {perfil.rangosObjetivo.glucosa.ayunasMax}
                  </span>
                  , después de comer{' '}
                  <span className="cifra">
                    {perfil.rangosObjetivo.glucosa.postMin}–{perfil.rangosObjetivo.glucosa.postMax}
                  </span>{' '}
                  mg/dL
                </>
              ) : (
                'sin definir'
              )}
            </li>
            <li>
              Peso:{' '}
              {perfil?.rangosObjetivo.peso ? (
                <span className="cifra">
                  {perfil.rangosObjetivo.peso.min}–{perfil.rangosObjetivo.peso.max} lb
                </span>
              ) : (
                'sin definir'
              )}
            </li>
          </ul>
        </section>

        {/* Medicamentos */}
        <section className="evitar-corte mt-5">
          <h2 className="mb-2 font-display text-[1.2rem] text-tinta">Medicamentos activos</h2>
          {activos.length === 0 ? (
            <p className="text-bruma-texto">No hay medicamentos activos registrados.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-borde text-bruma-texto">
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Medicamento</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Dosis</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Horarios</th>
                  <th scope="col" className="py-1.5 font-semibold">Instrucción</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((m) => (
                  <tr key={m.id} className="border-b border-borde last:border-0">
                    <th scope="row" className="py-1.5 pe-3 font-normal">{m.nombre}</th>
                    <td className="cifra py-1.5 pe-3">{m.dosis}</td>
                    <td className="cifra py-1.5 pe-3">{m.horarios.map(horaTexto).join(', ')}</td>
                    <td className="py-1.5">{m.instruccion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Adherencia */}
        <section className="evitar-corte mt-5">
          <h2 className="mb-2 font-display text-[1.2rem] text-tinta">Adherencia del período</h2>
          <p>
            <span className="cifra text-[1.6rem] text-tinta">
              {adherencia.porcentaje !== null ? `${adherencia.porcentaje}%` : '—'}
            </span>{' '}
            — {etiquetaAdherencia(adherencia.porcentaje)}.
          </p>
          <p className="text-bruma-texto">
            {adherencia.tomadas} dosis tomadas, {adherencia.omitidas} omitidas y{' '}
            {adherencia.pendientes} sin marcar, de {adherencia.programadas} programadas.
          </p>
        </section>

        {/* Resumen por tipo */}
        {resumenes.length > 0 && (
          <section className="evitar-corte mt-5">
            <h2 className="mb-2 font-display text-[1.2rem] text-tinta">Resumen de mediciones</h2>
            <table className="w-full border-collapse text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-borde text-bruma-texto">
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Tipo</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">N.º</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Promedio</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Mín.</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Máx.</th>
                  <th scope="col" className="py-1.5 font-semibold">Fuera de rango</th>
                </tr>
              </thead>
              <tbody>
                {resumenes.map((r) => (
                  <tr key={r.tipo} className="border-b border-borde last:border-0">
                    <th scope="row" className="py-1.5 pe-3 font-normal">
                      {NOMBRE_TIPO[r.tipo]}
                      {r.tipo === 'presion' ? ' (sistólica)' : ''}
                    </th>
                    <td className="cifra py-1.5 pe-3">{r.cantidad}</td>
                    <td className="cifra py-1.5 pe-3">
                      {r.promedio} {UNIDADES[r.tipo]}
                    </td>
                    <td className="cifra py-1.5 pe-3">{r.minimo}</td>
                    <td className="cifra py-1.5 pe-3">{r.maximo}</td>
                    <td className="cifra py-1.5">{r.fuera}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Gráfico */}
        {medicionesGrafico.length >= 2 && (
          <section className="evitar-corte mt-5">
            <h2 className="mb-2 font-display text-[1.2rem] text-tinta">
              Tendencia de {NOMBRE_TIPO[tipoConMasDatos].toLowerCase()}
            </h2>
            <GraficoTendencia
              mediciones={medicionesGrafico}
              tipo={tipoConMasDatos}
              rangos={perfil?.rangosObjetivo}
            />
          </section>
        )}

        {/* Detalle */}
        <section className="mt-5">
          <h2 className="mb-2 font-display text-[1.2rem] text-tinta">
            Detalle de mediciones ({mediciones.length})
          </h2>
          {mediciones.length === 0 ? (
            <p className="text-bruma-texto">No hay mediciones registradas en este período.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-borde text-bruma-texto">
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Fecha y hora</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Tipo</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Valor</th>
                  <th scope="col" className="py-1.5 pe-3 font-semibold">Clasificación</th>
                  <th scope="col" className="py-1.5 font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody>
                {mediciones.map((m) => (
                  <tr key={m.id} className="border-b border-borde last:border-0">
                    <th scope="row" className="cifra py-1.5 pe-3 font-normal">
                      {fechaHoraCorta(m.fechaHora)}
                    </th>
                    <td className="py-1.5 pe-3">
                      {NOMBRE_TIPO[m.tipo]}
                      {m.tipo === 'glucosa' &&
                        (m.valores.contexto === 'postprandial'
                          ? ' (después de comer)'
                          : ' (en ayunas)')}
                    </td>
                    <td className="cifra py-1.5 pe-3">
                      {valorPrincipal(m)} {UNIDADES[m.tipo]}
                    </td>
                    <td className="py-1.5 pe-3">
                      {etiquetaClasificacion(clasificar(m, perfil?.rangosObjetivo))}
                    </td>
                    <td className="py-1.5">{m.nota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="evitar-corte mt-6 border-t-2 border-tinta pt-3 text-[0.9rem] text-bruma-texto">
          <p>
            Documento generado por Pulso a partir de registros ingresados por el paciente. No
            constituye un diagnóstico médico.
          </p>
          <p className="mt-1">
            Los rangos objetivo que aparecen en este informe fueron escritos por el paciente según
            lo indicado por su médico. Pulso no los sugiere ni los calcula.
          </p>
        </footer>
      </Tarjeta>
    </div>
  )
}
