/* ============================================================================
   / — Hoy
   ----------------------------------------------------------------------------
   La pantalla que se abre veinte veces al día. Responde tres preguntas sin que
   haya que buscar nada: ¿qué me toca ahora?, ¿cómo salió mi última medición?,
   ¿cuándo es la próxima cita?

   Marcar una dosis son DOS botones grandes, no un menú: "Tomé" y "Omití".
   Y detrás de cada toque hay 8 segundos de "Deshacer", porque el dedo se
   equivoca y el dato equivocado termina en el informe del médico.
   ========================================================================== */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, Pill, Plus, X, FlaskConical } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion, Cifra } from '../components/Tarjeta'
import CintaDelDia from '../components/CintaDelDia'
import EstadoVacio from '../components/EstadoVacio'
import Insignia from '../components/Insignia'
import Boton from '../components/Boton'
import { marcasDelDia, calcularAdherencia } from '../lib/adherencia'
import { clasificar, mensajeClasificacion, NOMBRE_TIPO, UNIDADES, valorPrincipal } from '../lib/rangos'
import { fechaLarga, hora, horaTexto, inicioDia, finDia, relativo, fechaHoraCorta } from '../lib/fechas'
import type { EstadoDosis } from '../types'

export default function Hoy() {
  const { estado, despacharConDeshacer } = usePulso()
  const [recienMarcada, setRecienMarcada] = useState<string | null>(null)
  const ahora = useMemo(() => new Date(), [])

  const marcas = useMemo(
    () => marcasDelDia(estado.medicamentos, estado.registrosDosis, ahora, ahora),
    [estado.medicamentos, estado.registrosDosis, ahora],
  )

  const adherenciaHoy = useMemo(
    () => calcularAdherencia(estado.registrosDosis, inicioDia(ahora), finDia(ahora), ahora),
    [estado.registrosDosis, ahora],
  )

  const ultima = estado.mediciones[0]
  const clasificacionUltima = ultima ? clasificar(ultima, estado.perfil?.rangosObjetivo) : null

  const proximaCita = useMemo(() => {
    const limite = new Date(ahora.getTime() + 14 * 24 * 60 * 60 * 1000)
    return [...estado.citas]
      .filter((c) => {
        const f = new Date(c.fechaHora)
        return f >= ahora && f <= limite
      })
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))[0]
  }, [estado.citas, ahora])

  function marcar(id: string, nuevoEstado: EstadoDosis, nombre: string) {
    setRecienMarcada(id)
    window.setTimeout(() => setRecienMarcada(null), 400)
    despacharConDeshacer(
      { tipo: 'MARCAR_DOSIS', id, estado: nuevoEstado },
      nuevoEstado === 'tomada' ? `${nombre}: dosis registrada.` : `${nombre}: dosis marcada como omitida.`,
    )
  }

  const hayMedicamentos = estado.medicamentos.some((m) => m.activo)

  return (
    <div className="animar-entrar space-y-6">
      {estado.datosDemo && (
        <p className="rounded-tarjeta border-2 border-dashed border-ambar-texto bg-ambar-suave px-4 py-2.5 text-[0.95rem] font-semibold text-ambar-texto">
          Datos de demostración: «María Fernández» es una paciente ficticia. Ninguno de estos
          registros pertenece a una persona real.
        </p>
      )}

      <header>
        <h1 className="font-display text-[1.9rem] leading-tight text-tinta">
          Hola, {estado.perfil?.nombre}
        </h1>
        <p className="text-bruma-texto">{fechaLarga(ahora)}</p>
      </header>

      {/* --- La cinta del día ------------------------------------------- */}
      <section aria-labelledby="t-cinta">
        <TituloSeccion id="t-cinta">Tu día</TituloSeccion>
        <CintaDelDia marcas={marcas} ahora={ahora} />
      </section>

      {/* --- Dosis de hoy ------------------------------------------------ */}
      <section aria-labelledby="t-dosis">
        <TituloSeccion
          id="t-dosis"
          accion={
            adherenciaHoy.porcentaje !== null ? (
              <span className="text-[0.9rem] text-bruma-texto">
                <span className="cifra text-tinta">{adherenciaHoy.tomadas}</span> de{' '}
                <span className="cifra text-tinta">{adherenciaHoy.programadas}</span> hasta ahora
              </span>
            ) : undefined
          }
        >
          Dosis de hoy
        </TituloSeccion>

        {!hayMedicamentos ? (
          <EstadoVacio
            icono={<Pill size={26} aria-hidden="true" />}
            titulo="Todavía no has agregado medicamentos"
            mensaje="Agrega el primero para empezar. Pulso te dirá cada día lo que te toca y en qué horario."
            accion={
              <Link to="/medicamentos">
                <Boton variante="primario" tamano="grande" icono={<Plus size={20} aria-hidden="true" />}>
                  Agregar medicamento
                </Boton>
              </Link>
            }
          />
        ) : marcas.length === 0 ? (
          <EstadoVacio
            icono={<Check size={26} aria-hidden="true" />}
            titulo="Hoy no hay dosis programadas"
            mensaje="Tus medicamentos activos no tienen horarios para el día de hoy."
          />
        ) : (
          <ul className="space-y-3">
            {marcas.map((m) => {
              const nombre = m.medicamento?.nombre ?? 'Medicamento'
              const marcada = m.estado !== 'pendiente'
              return (
                <Tarjeta
                  as="li"
                  key={m.registro.id}
                  className={[
                    'px-4 py-3.5 transition-colors duration-200',
                    recienMarcada === m.registro.id ? 'animar-confirmar' : '',
                    m.estado === 'tomada' ? 'border-salvia-fuerte/40 bg-salvia-suave' : '',
                    m.estado === 'omitida' ? 'bg-lino' : '',
                    m.vencida ? 'border-ambar-texto/50' : '',
                  ].join(' ')}
                >
                  {/* Corrección H-02: el texto y los botones van en filas
                      separadas. Antes compartían fila y, con el texto en "muy
                      grande", la columna del nombre se estrujaba hasta partir
                      "Metformina" letra por letra. */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-[12rem] flex-1">
                        <p className="font-display text-[1.25rem] text-tinta">
                          {nombre} <span className="cifra text-[1rem]">{m.medicamento?.dosis}</span>
                        </p>
                        <p className="text-bruma-texto">
                          <span className="cifra">
                            {horaTexto(m.registro.fechaHoraProgramada.slice(11, 16))}
                          </span>
                          {m.medicamento?.instruccion ? ` · ${m.medicamento.instruccion}` : ''}
                        </p>
                        {m.vencida && (
                          <p className="mt-1 text-[0.9rem] font-semibold text-ambar-texto">
                            Esta hora ya pasó y sigue sin marcar.
                          </p>
                        )}
                      </div>

                      {marcada && (
                        <Insignia
                          clasificacion={m.estado === 'tomada' ? 'en-rango' : 'sin-referencia'}
                          texto={m.estado === 'tomada' ? 'Tomada' : 'Omitida'}
                        />
                      )}
                    </div>

                    {marcada ? (
                      <Boton
                        tamano="compacto"
                        variante="texto"
                        onClick={() => marcar(m.registro.id, 'pendiente', nombre)}
                      >
                        Cambiar
                        <span className="solo-lectores"> el registro de {nombre}</span>
                      </Boton>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Boton
                          variante="primario"
                          tamano="grande"
                          className="flex-1 basis-[9rem]"
                          icono={<Check size={20} aria-hidden="true" />}
                          onClick={() => marcar(m.registro.id, 'tomada', nombre)}
                        >
                          <span>
                            Tomé
                            <span className="solo-lectores">
                              {' '}
                              {nombre} de las{' '}
                              {horaTexto(m.registro.fechaHoraProgramada.slice(11, 16))}
                            </span>
                          </span>
                        </Boton>
                        <Boton
                          tamano="grande"
                          className="flex-1 basis-[9rem]"
                          icono={<X size={20} aria-hidden="true" />}
                          onClick={() => marcar(m.registro.id, 'omitida', nombre)}
                        >
                          <span>
                            Omití
                            <span className="solo-lectores">
                              {' '}
                              {nombre} de las{' '}
                              {horaTexto(m.registro.fechaHoraProgramada.slice(11, 16))}
                            </span>
                          </span>
                        </Boton>
                      </div>
                    )}
                  </div>
                </Tarjeta>
              )
            })}
          </ul>
        )}
      </section>

      {/* --- Última medición --------------------------------------------- */}
      <section aria-labelledby="t-ultima">
        <TituloSeccion
          id="t-ultima"
          accion={
            <Link
              to="/registrar"
              className="min-h-[3rem] content-center text-salvia-fuerte underline underline-offset-4"
            >
              Registrar otra
            </Link>
          }
        >
          Última medición
        </TituloSeccion>

        {!ultima ? (
          <EstadoVacio
            icono={<FlaskConical size={26} aria-hidden="true" />}
            titulo="Aún no has registrado mediciones"
            mensaje="Anota tu presión, tu glucosa o tu peso. Toma menos de quince segundos."
            accion={
              <Link to="/registrar">
                <Boton variante="primario" tamano="grande" icono={<Plus size={20} aria-hidden="true" />}>
                  Registrar medición
                </Boton>
              </Link>
            }
          />
        ) : (
          <Tarjeta className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-bruma-texto">{NOMBRE_TIPO[ultima.tipo]}</p>
                <Cifra valor={valorPrincipal(ultima)} unidad={UNIDADES[ultima.tipo]} />
                <p className="mt-1 text-[0.9rem] text-bruma-texto">
                  {fechaHoraCorta(ultima.fechaHora)} · {relativo(ultima.fechaHora)}
                </p>
              </div>
              {clasificacionUltima && <Insignia clasificacion={clasificacionUltima} />}
            </div>
            {clasificacionUltima && (
              <p className="mt-3 border-t border-borde pt-3 text-[1.02rem] leading-relaxed">
                {mensajeClasificacion(clasificacionUltima)}
              </p>
            )}
            {ultima.nota && (
              <p className="mt-2 text-bruma-texto">
                <span className="font-semibold">Nota:</span> {ultima.nota}
              </p>
            )}
          </Tarjeta>
        )}
      </section>

      {/* --- Próxima cita (solo si está a menos de 14 días) --------------- */}
      {proximaCita && (
        <section aria-labelledby="t-cita">
          <TituloSeccion id="t-cita">Próxima cita</TituloSeccion>
          <Tarjeta className="px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-salvia-suave text-salvia-fuerte">
                <CalendarDays size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[1.2rem] text-tinta">
                  {proximaCita.especialidad} — {proximaCita.medico}
                </p>
                <p className="text-tinta">
                  <span className="cifra">{fechaHoraCorta(proximaCita.fechaHora)}</span> (
                  {relativo(proximaCita.fechaHora)})
                </p>
                <p className="text-bruma-texto">{proximaCita.lugar}</p>
                <Link
                  to="/informe"
                  className="mt-2 inline-block min-h-[3rem] content-center text-salvia-fuerte underline underline-offset-4"
                >
                  Preparar el informe para esta cita
                </Link>
              </div>
            </div>
          </Tarjeta>
        </section>
      )}

      <p className="pb-2 text-center text-[0.85rem] text-bruma-texto">
        Actualizado a las <span className="cifra">{hora(ahora)}</span> — tus datos se guardan solo
        en este dispositivo.
      </p>
    </div>
  )
}
