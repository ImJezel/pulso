/* ============================================================================
   /ajustes — Ajustes
   ----------------------------------------------------------------------------
   Aquí viven las tres cosas que hacen que Pulso sea usable por la persona
   para la que se diseñó:

   · Tamaño de texto y alto contraste, que cambian TODA la app en vivo porque
     lo único que tocan es una variable CSS (src/styles/tokens.css).
   · Modo simple, que esconde lo que no se usa a diario.
   · Los datos: cargar la demo, o borrarlo todo escribiendo BORRAR.

   Y el aviso de alcance, que no es letra chiquita: es la frase que separa una
   libreta digital de algo que pretende opinar sobre tu salud.
   ========================================================================== */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Info, Trash2, Type, User } from 'lucide-react'
import { usePulso } from '../context/AppContext'
import { Tarjeta, TituloSeccion } from '../components/Tarjeta'
import Boton from '../components/Boton'
import Panel, { Confirmacion } from '../components/Panel'
import { CampoTexto, CampoNumero, Interruptor } from '../components/Campos'
import { Chip } from '../components/Insignia'
import { CONDICIONES } from '../types'
import type { Perfil, Preferencias } from '../types'

const ESCALAS: { id: Preferencias['escalaTexto']; etiqueta: string; muestra: string }[] = [
  { id: 'normal', etiqueta: 'Normal', muestra: '17 px' },
  { id: 'grande', etiqueta: 'Grande', muestra: '20 px' },
  { id: 'muy-grande', etiqueta: 'Muy grande', muestra: '23 px' },
]

const txt = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
const num = (v: string): number | null => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) ? n : null
}

export default function Ajustes() {
  const { estado, despachar, despacharConDeshacer, anunciar } = usePulso()
  const p = estado.preferencias
  const perfil = estado.perfil

  const [editando, setEditando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [palabra, setPalabra] = useState('')

  const [borrador, setBorrador] = useState(() => ({
    nombre: perfil?.nombre ?? '',
    fechaNacimiento: perfil?.fechaNacimiento ?? '',
    condiciones: perfil?.condiciones ?? [],
    contactoNombre: perfil?.contactoEmergencia?.nombre ?? '',
    contactoTel: perfil?.contactoEmergencia?.telefono ?? '',
    sisMin: txt(perfil?.rangosObjetivo.presion?.sisMin),
    sisMax: txt(perfil?.rangosObjetivo.presion?.sisMax),
    diaMin: txt(perfil?.rangosObjetivo.presion?.diaMin),
    diaMax: txt(perfil?.rangosObjetivo.presion?.diaMax),
    ayunasMin: txt(perfil?.rangosObjetivo.glucosa?.ayunasMin),
    ayunasMax: txt(perfil?.rangosObjetivo.glucosa?.ayunasMax),
    postMin: txt(perfil?.rangosObjetivo.glucosa?.postMin),
    postMax: txt(perfil?.rangosObjetivo.glucosa?.postMax),
    pesoMin: txt(perfil?.rangosObjetivo.peso?.min),
    pesoMax: txt(perfil?.rangosObjetivo.peso?.max),
  }))

  const campo = (k: keyof typeof borrador) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBorrador((b) => ({ ...b, [k]: e.target.value }))

  function guardarPerfil() {
    const b = borrador
    const nuevo: Perfil = {
      nombre: b.nombre.trim() || 'Sin nombre',
      fechaNacimiento: b.fechaNacimiento,
      condiciones: b.condiciones,
      contactoEmergencia:
        b.contactoNombre.trim() && b.contactoTel.trim()
          ? { nombre: b.contactoNombre.trim(), telefono: b.contactoTel.trim() }
          : null,
      rangosObjetivo: {
        presion:
          num(b.sisMin) !== null && num(b.sisMax) !== null && num(b.diaMin) !== null && num(b.diaMax) !== null
            ? { sisMin: num(b.sisMin)!, sisMax: num(b.sisMax)!, diaMin: num(b.diaMin)!, diaMax: num(b.diaMax)! }
            : null,
        glucosa:
          num(b.ayunasMin) !== null && num(b.ayunasMax) !== null
            ? {
                ayunasMin: num(b.ayunasMin)!,
                ayunasMax: num(b.ayunasMax)!,
                postMin: num(b.postMin) ?? num(b.ayunasMin)!,
                postMax: num(b.postMax) ?? num(b.ayunasMax)!,
              }
            : null,
        peso:
          num(b.pesoMin) !== null && num(b.pesoMax) !== null
            ? { min: num(b.pesoMin)!, max: num(b.pesoMax)! }
            : null,
      },
    }
    despachar({ tipo: 'GUARDAR_PERFIL', perfil: nuevo })
    anunciar('Perfil actualizado.')
    setEditando(false)
  }

  return (
    <div className="animar-entrar space-y-6">
      <h1 className="font-display text-[1.8rem] text-tinta">Ajustes</h1>

      {/* --- Accesibilidad ------------------------------------------------ */}
      <section aria-labelledby="t-acc">
        <TituloSeccion id="t-acc">Cómo se ve la app</TituloSeccion>
        <Tarjeta className="px-4 py-2">
          <fieldset className="border-0 py-3">
            <legend className="mb-2 flex items-center gap-2 font-semibold text-tinta">
              <Type size={18} aria-hidden="true" /> Tamaño del texto
            </legend>
            <p className="mb-3 text-[0.9rem] text-bruma-texto">
              El cambio se ve en el momento, en toda la aplicación.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ESCALAS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={p.escalaTexto === e.id}
                  onClick={() => {
                    despachar({ tipo: 'PREFERENCIAS', cambios: { escalaTexto: e.id } })
                    anunciar(`Tamaño de texto: ${e.etiqueta}.`)
                  }}
                  className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 transition-colors duration-200 ${
                    p.escalaTexto === e.id
                      ? 'border-salvia-fuerte bg-salvia-fuerte text-white'
                      : 'border-borde-fuerte bg-papel text-tinta hover:bg-salvia-suave'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: e.id === 'normal' ? '1rem' : e.id === 'grande' ? '1.2rem' : '1.4rem',
                    }}
                    className="font-semibold leading-none"
                  >
                    Aa
                  </span>
                  <span className="mt-1.5 text-[0.85rem] font-semibold">{e.etiqueta}</span>
                  <span className="cifra text-[0.75rem] opacity-80">{e.muestra}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="border-t border-borde">
            <Interruptor
              etiqueta="Alto contraste"
              descripcion="Blanco y negro, bordes marcados y sin sombras. Ayuda si te cuesta distinguir los colores suaves."
              activo={p.altoContraste}
              onChange={(v) => {
                despachar({ tipo: 'PREFERENCIAS', cambios: { altoContraste: v } })
                anunciar(v ? 'Alto contraste activado.' : 'Alto contraste desactivado.')
              }}
            />
          </div>

          <div className="border-t border-borde">
            <Interruptor
              etiqueta="Modo simple"
              descripcion="Deja solo Hoy y Registrar en la barra de abajo, y esconde Historial, Citas e Informe. Puedes volver a activarlos cuando quieras."
              activo={p.modoSimple}
              onChange={(v) => {
                despachar({ tipo: 'PREFERENCIAS', cambios: { modoSimple: v } })
                anunciar(v ? 'Modo simple activado.' : 'Modo simple desactivado.')
              }}
            />
          </div>
        </Tarjeta>
      </section>

      {/* --- Perfil -------------------------------------------------------- */}
      <section aria-labelledby="t-perfil">
        <TituloSeccion id="t-perfil">Tu perfil y tus rangos</TituloSeccion>
        <Tarjeta className="px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-[1.2rem] text-tinta">{perfil?.nombre}</p>
              <p className="text-bruma-texto">
                {perfil?.condiciones.length
                  ? perfil.condiciones
                      .map((c) => CONDICIONES.find((x) => x.id === c)?.etiqueta ?? c)
                      .join(', ')
                  : 'Sin condiciones registradas'}
              </p>
              <p className="mt-1 text-[0.9rem] text-bruma-texto">
                {perfil?.rangosObjetivo.presion || perfil?.rangosObjetivo.glucosa
                  ? 'Tienes rangos objetivo definidos.'
                  : 'Sin rangos objetivo: Pulso guarda tus mediciones pero no las clasifica.'}
              </p>
            </div>
            <Boton onClick={() => setEditando(true)} icono={<User size={18} aria-hidden="true" />}>
              Editar
            </Boton>
          </div>
        </Tarjeta>
      </section>

      {/* --- Datos --------------------------------------------------------- */}
      <section aria-labelledby="t-datos">
        <TituloSeccion id="t-datos">Datos</TituloSeccion>
        <Tarjeta className="space-y-4 px-4 py-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-tinta">
              <Database size={18} aria-hidden="true" /> Datos de demostración
            </p>
            <p className="mt-1 text-[0.95rem] text-bruma-texto">
              Carga el caso ficticio de «María Fernández»: 3 medicamentos, 45 días de mediciones y
              3 citas. Sirve para ver la app llena sin tener que escribir nada.{' '}
              <strong>Reemplaza lo que tengas guardado.</strong>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton
                onClick={() =>
                  despacharConDeshacer(
                    { tipo: 'CARGAR_DEMO' },
                    'Datos de demostración cargados. Son ficticios.',
                  )
                }
              >
                Cargar datos de ejemplo
              </Boton>
              {estado.datosDemo && (
                <span className="content-center text-[0.9rem] font-semibold text-ambar-texto">
                  Ahora mismo estás viendo datos ficticios.
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-borde pt-4">
            <p className="flex items-center gap-2 font-semibold text-ladrillo">
              <Trash2 size={18} aria-hidden="true" /> Borrar todos mis datos
            </p>
            <p className="mt-1 text-[0.95rem] text-bruma-texto">
              Elimina perfil, medicamentos, mediciones y citas de este dispositivo. No hay copia en
              ningún servidor, así que no se puede recuperar después.
            </p>
            <Boton
              variante="peligro"
              className="mt-3"
              onClick={() => {
                setPalabra('')
                setConfirmarBorrado(true)
              }}
            >
              Borrar todos mis datos
            </Boton>
          </div>
        </Tarjeta>
      </section>

      {/* --- Acerca de ------------------------------------------------------ */}
      <section aria-labelledby="t-acerca">
        <TituloSeccion id="t-acerca">Acerca de Pulso</TituloSeccion>
        <Tarjeta className="px-4 py-4">
          <p className="flex items-center gap-2 font-semibold text-tinta">
            <Info size={18} aria-hidden="true" /> Qué es y qué no es
          </p>
          <p className="mt-2 leading-relaxed">
            Pulso es una libreta digital para llevar el control de tu tratamiento y llevarle a tu
            médico un informe completo.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-tinta">
            <li>
              <strong>No diagnostica, no receta y no ajusta tratamientos.</strong>
            </li>
            <li>No es un expediente clínico ni sustituye a tu médico.</li>
            <li>No interpreta síntomas.</li>
            <li>No se conecta con farmacias, seguros ni laboratorios.</li>
            <li>
              No tiene cuentas de usuario ni servidor: <strong>tus datos se quedan en este
              dispositivo</strong>. Si borras los datos del navegador, se van con ellos.
            </li>
            <li>No recoge estadísticas de uso ni tiene rastreadores de terceros.</li>
          </ul>
          <p className="mt-3 text-[0.9rem] text-bruma-texto">
            Ante cualquier valor que te preocupe, la respuesta de Pulso siempre es la misma:
            consulta con tu médico.
          </p>
          <p className="mt-4 border-t border-borde pt-3 text-[0.9rem] text-bruma-texto">
            Proyecto final · Renglón Salud · ITLA 2026-C-2 · Rebeca Mary Astacio
            Bryan (2025-2264).{' '}
            <Link to="/calidad" className="text-salvia-fuerte underline underline-offset-4">
              Ver evaluación de calidad ISO/IEC 25010
            </Link>
            .
          </p>
        </Tarjeta>
      </section>

      {/* --- Panel de perfil ------------------------------------------------ */}
      <Panel
        abierto={editando}
        titulo="Editar perfil y rangos"
        onCerrar={() => setEditando(false)}
        pie={
          <>
            <Boton onClick={() => setEditando(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarPerfil}>
              Guardar
            </Boton>
          </>
        }
      >
        <CampoTexto etiqueta="Nombre" value={borrador.nombre} onChange={campo('nombre')} />
        <CampoTexto
          etiqueta="Fecha de nacimiento"
          type="date"
          value={borrador.fechaNacimiento}
          onChange={campo('fechaNacimiento')}
        />

        <fieldset className="mb-4 border-0 p-0">
          <legend className="mb-2 font-semibold text-tinta">Condiciones</legend>
          <div className="flex flex-wrap gap-2">
            {CONDICIONES.map((c) => (
              <Chip
                key={c.id}
                activo={borrador.condiciones.includes(c.id)}
                onClick={() =>
                  setBorrador((b) => ({
                    ...b,
                    condiciones: b.condiciones.includes(c.id)
                      ? b.condiciones.filter((x) => x !== c.id)
                      : [...b.condiciones, c.id],
                  }))
                }
              >
                {c.etiqueta}
              </Chip>
            ))}
          </div>
        </fieldset>

        <CampoTexto
          etiqueta="Contacto de emergencia — nombre"
          value={borrador.contactoNombre}
          onChange={campo('contactoNombre')}
        />
        <CampoTexto
          etiqueta="Contacto de emergencia — teléfono"
          type="tel"
          value={borrador.contactoTel}
          onChange={campo('contactoTel')}
        />

        <div className="mb-4 rounded-xl border-2 border-salvia-fuerte/30 bg-salvia-suave px-3 py-2.5">
          <p className="text-[0.98rem]">
            <strong>Los rangos los define tu médico.</strong> Si los dejas en blanco, Pulso guarda
            tus mediciones sin clasificarlas.
          </p>
        </div>

        <fieldset className="mb-2 border-0 p-0">
          <legend className="mb-2 font-display text-[1.05rem]">Presión (mmHg)</legend>
          <div className="grid grid-cols-2 gap-x-4">
            <CampoNumero etiqueta="Sistólica mín." value={borrador.sisMin} onChange={campo('sisMin')} />
            <CampoNumero etiqueta="Sistólica máx." value={borrador.sisMax} onChange={campo('sisMax')} />
            <CampoNumero etiqueta="Diastólica mín." value={borrador.diaMin} onChange={campo('diaMin')} />
            <CampoNumero etiqueta="Diastólica máx." value={borrador.diaMax} onChange={campo('diaMax')} />
          </div>
        </fieldset>

        <fieldset className="mb-2 border-0 p-0">
          <legend className="mb-2 font-display text-[1.05rem]">Glucosa (mg/dL)</legend>
          <div className="grid grid-cols-2 gap-x-4">
            <CampoNumero etiqueta="Ayunas mín." value={borrador.ayunasMin} onChange={campo('ayunasMin')} />
            <CampoNumero etiqueta="Ayunas máx." value={borrador.ayunasMax} onChange={campo('ayunasMax')} />
            <CampoNumero etiqueta="Después de comer mín." value={borrador.postMin} onChange={campo('postMin')} />
            <CampoNumero etiqueta="Después de comer máx." value={borrador.postMax} onChange={campo('postMax')} />
          </div>
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="mb-2 font-display text-[1.05rem]">Peso (lb)</legend>
          <div className="grid grid-cols-2 gap-x-4">
            <CampoNumero etiqueta="Mínimo" value={borrador.pesoMin} onChange={campo('pesoMin')} />
            <CampoNumero etiqueta="Máximo" value={borrador.pesoMax} onChange={campo('pesoMax')} />
          </div>
        </fieldset>
      </Panel>

      <Confirmacion
        abierto={confirmarBorrado}
        titulo="Borrar todos mis datos"
        mensaje="Se borrarán tu perfil, tus medicamentos, todas tus mediciones y tus citas de este dispositivo. Como Pulso no guarda nada en internet, no hay forma de recuperarlos."
        textoConfirmar="Borrar definitivamente"
        palabraClave="BORRAR"
        valorPalabra={palabra}
        onCambiarPalabra={setPalabra}
        onConfirmar={() => {
          despachar({ tipo: 'BORRAR_TODO' })
          anunciar('Todos los datos fueron borrados.')
          setConfirmarBorrado(false)
        }}
        onCancelar={() => setConfirmarBorrado(false)}
      />
    </div>
  )
}
