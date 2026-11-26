"""Genera manual/Entregable6_Manual_Pulso.pdf (manual técnico + manual de usuario).

Uso:  python manual/generar_manual.py
Las capturas salen de scripts/capturas-manual.mjs (manual/capturas/).
"""
import pathlib, shutil, subprocess, tempfile, time

D = pathlib.Path(__file__).parent
CAP = D / "capturas"


def tel(nombre, pie):
    return (f'<figure class="tel"><img src="capturas/{nombre}.png" alt="{pie}">'
            f'<figcaption>{pie}</figcaption></figure>')


def fila(*tels):
    return f'<div class="tels">{"".join(tels)}</div>'


def tabla(cab, filas):
    t = "<table><tr>" + "".join(f"<th>{c}</th>" for c in cab) + "</tr>"
    for f in filas:
        t += "<tr>" + "".join(f"<td>{c}</td>" for c in f) + "</tr>"
    return t + "</table>"


DEPENDENCIAS = [
    ("@supabase/supabase-js", "2.118", "Cliente de la base de datos y de la autenticación"),
    ("react / react-dom", "19.2", "Interfaz de usuario por componentes"),
    ("react-router-dom", "7.18", "Navegación entre pantallas (HashRouter)"),
    ("recharts", "3.10", "Gráfico de tendencia del historial"),
    ("date-fns", "4.4", "Fechas en español dominicano"),
    ("lucide-react", "1.33", "Íconos"),
]
DEV = [
    ("vite", "8.2", "Servidor de desarrollo y build de producción"),
    ("typescript", "6.0", "Tipado estricto del código"),
    ("tailwindcss + @tailwindcss/vite", "4.3", "Estilos con los tokens del sistema de diseño"),
    ("vite-plugin-pwa", "1.3", "Service worker: instalable y sin conexión"),
    ("vite-plugin-singlefile", "2.3", "Build de un solo archivo HTML"),
    ("supabase (CLI)", "2.115", "Migraciones, configuración y tipos de la base de datos"),
    ("vitest + @testing-library/react + jsdom", "4.1 / 16.3 / 30.0", "Pruebas unitarias y de integración"),
    ("oxlint", "1.79", "Análisis estático (lint)"),
    ("puppeteer-core + axe-core", "25.8 / 4.13", "Capturas, recorrido de usuario y auditoría de accesibilidad"),
]
TABLAS = [
    ("perfil", "id_perfil (PK = auth.uid()), nombre, fecha_nacimiento, contacto_nombre, contacto_telefono, datos_demo, version_esquema", "1 por usuario"),
    ("rangos_objetivo", "id_perfil (PK, FK→perfil), sis_min/max, dia_min/max, ayunas_min/max, post_min/max, peso_min/max", "0..1 por perfil"),
    ("preferencias", "id_perfil (PK, FK→auth.users), escala_texto, alto_contraste, modo_simple", "1 por usuario"),
    ("condicion", "(id_perfil, codigo) PK, orden", "N por perfil"),
    ("medicamento", "(id_perfil, id_medicamento) PK, nombre, dosis, instruccion, activo, creado_en", "N por perfil"),
    ("horario", "(id_perfil, id_medicamento, hora) PK, orden · FK→medicamento ON DELETE CASCADE", "N por medicamento"),
    ("registro_dosis", "(id_perfil, id_registro) PK, id_medicamento (FK), fecha_hora_programada, estado, registrado_en", "N por medicamento"),
    ("medicion", "(id_perfil, id_medicion) PK, tipo, fecha_hora, sistolica, diastolica, pulso, glucosa, contexto, peso, nota", "N por perfil"),
    ("cita", "(id_perfil, id_cita) PK, medico, especialidad, fecha_hora, lugar, motivo", "N por perfil"),
]
PRUEBAS = [
    ("tests/rangos.test.ts", 10, "Clasificación de una medición contra los rangos del médico"),
    ("tests/adherencia.test.ts", 11, "Dosis del día, porcentaje de cumplimiento y cinta del día"),
    ("tests/fechas.test.ts", 11, "Formatos en español dominicano, edad y exportación .ics"),
    ("tests/storage.test.ts", 12, "Copia local, JSON corrupto y reducer del estado"),
    ("tests/remoto.test.ts", 18, "Traducción estado ⇄ tablas y cálculo exacto de cambios"),
    ("tests/sincronizacion.test.tsx", 9, "Orden de la sincronización y modo sin conexión (Supabase simulado)"),
    ("tests/validaciones.test.ts", 13, "Validación de formularios con rangos fisiológicos y fechas"),
    ("tests/integracion/supabase.test.ts", 6, "Contra Supabase real: guardado completo, solo diferencias, idempotencia y RLS"),
]
RUTAS = [
    ("/entrar", "Entrar.tsx", "Iniciar sesión o crear una cuenta"),
    ("/bienvenida", "Bienvenida.tsx", "Configuración inicial en 3 pasos"),
    ("/", "Hoy.tsx", "Dosis del día, cinta del día, última medición y próxima cita"),
    ("/registrar", "Registrar.tsx", "Registrar presión, glucosa o peso"),
    ("/medicamentos", "Medicamentos.tsx", "Alta, edición, desactivación y borrado"),
    ("/historial", "Historial.tsx", "Gráfico de tendencia, resumen y tabla"),
    ("/citas", "Citas.tsx", "Citas próximas y pasadas, exportar al calendario"),
    ("/informe", "Informe.tsx", "Informe A4 para el médico"),
    ("/ajustes", "Ajustes.tsx", "Accesibilidad, perfil, cuenta y datos"),
]

CSS = """
@page { size: A4; margin: 16mm 16mm 18mm; @bottom-center { content: counter(page); font: 9pt "Segoe UI"; color: #8A9A94; } }
@page portada { @bottom-center { content: none } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1f2937; margin: 0; }
h1 { font-size: 17pt; color: #14312B; border-bottom: 2px solid #4E8C7A; padding-bottom: 4px; margin: 0 0 10px; break-before: page; }
h2 { font-size: 12.5pt; color: #2F6B5B; margin: 16px 0 6px; break-after: avoid; }
h3 { font-size: 10.5pt; color: #14312B; margin: 12px 0 4px; break-after: avoid; }
p { margin: 0 0 7px; text-align: justify; }
ol, ul { margin: 0 0 8px; padding-left: 20px; } li { margin-bottom: 3px; }
table { width: 100%; border-collapse: collapse; font-size: 8.8pt; margin: 6px 0 10px; }
th, td { border: 1px solid #CFD8D4; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #3E7565; color: #fff; } tr { break-inside: avoid; }
tr:nth-child(even) td { background: #F6F3EC; }
pre { background: #14312B; color: #E3EEEA; font: 8.6pt Consolas, monospace; padding: 8px 10px; white-space: pre-wrap; word-wrap: break-word; border-radius: 4px; break-inside: avoid; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #E8F1EE; padding: 0 3px; border-radius: 3px; }
pre code { background: none; padding: 0; }
.nota { background: #F6F3EC; border-left: 4px solid #4E8C7A; padding: 7px 11px; margin: 8px 0 12px; break-inside: avoid; }
.aviso { background: #F8EEDF; border-left: 4px solid #C87A2C; padding: 7px 11px; margin: 8px 0 12px; break-inside: avoid; }
.tels { display: flex; gap: 10px; justify-content: center; margin: 8px 0 12px; break-inside: avoid; }
.tel { margin: 0; width: 44mm; text-align: center; }
.tel img { width: 100%; border: 6px solid #1F2A27; border-radius: 18px; display: block; }
.tel figcaption { font-size: 8.3pt; color: #5F6F69; margin-top: 4px; line-height: 1.3; }
.paso { display: grid; grid-template-columns: 9mm 1fr; gap: 6px; margin: 4px 0; }
.paso b.n { background: #3E7565; color: #fff; border-radius: 50%; width: 7mm; height: 7mm; display: flex; align-items: center; justify-content: center; font-size: 9pt; }
.capas div { border: 1px solid #3E7565; border-left: 6px solid #3E7565; padding: 6px 10px; margin: 0 0 5px; background: #F9FBFA; break-inside: avoid; }
.capas div b { color: #14312B; }
.portada { page: portada; height: 225mm; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 18mm 0 6mm; }
.portada .t { font-size: 44pt; font-weight: 800; color: #4E8C7A; }
.indice li { margin-bottom: 2px; }
.parte { break-before: page; height: 230mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.parte div { font-size: 30pt; font-weight: 800; color: #14312B; } .parte p { text-align: center; color: #5F6F69; font-size: 12pt; }
"""

def pasos(*items):
    return "".join(f'<div class="paso"><b class="n">{i}</b><div>{t}</div></div>' for i, t in enumerate(items, 1))


html = f"""<!doctype html><html lang="es-DO"><head><meta charset="utf-8">
<title>Entregable 6 – Documentación técnica y de usuario – Pulso</title><style>{CSS}</style></head><body>

<div class="portada">
 <div><b style="font-size:14pt">INSTITUTO TECNOLÓGICO DE LAS AMÉRICAS (ITLA)</b><br>
 <span style="color:#5F6F69;font-size:11.5pt">Programación III · Sección 2026-C-3<br>Facilitadora: Eduandy Isabel Cruz Abreu</span></div>
 <div><div class="t">Pulso</div>
 <div style="font-size:12pt">Aplicación web para el control de tratamientos de hipertensión y diabetes tipo 2</div>
 <div style="font-size:16pt;font-weight:700;margin-top:14px;color:#14312B">Entregable 6 – Documentación técnica y de usuario</div>
 <div style="color:#5F6F69;margin-top:4px">Manual técnico · Manual de usuario</div></div>
 <table style="width:115mm;font-size:11pt"><tr><th>Integrante</th><th>Matrícula</th></tr>
 <tr><td>Jezel Pujols</td><td>2025-2067</td></tr><tr><td>Rebeca Mary Astacio Bryan</td><td>2025-2264</td></tr></table>
 <div style="color:#5F6F69">Repositorio: https://github.com/ImJezel/pulso<br>Santo Domingo, 25 de noviembre de 2026</div>
</div>

<h1>Contenido</h1>
<ol class="indice">
 <li><b>Manual técnico</b>
  <ol><li>Descripción general del sistema</li><li>Requisitos</li><li>Instalación</li>
  <li>Configuración: dependencias, librerías y base de datos</li><li>Arquitectura y estructura del sistema</li>
  <li>Ejecución</li><li>Pruebas</li><li>Solución de problemas</li></ol></li>
 <li><b>Manual de usuario</b>
  <ol><li>Qué es Pulso y para quién es</li><li>Antes de empezar</li><li>Guía paso a paso</li>
  <li>Ejemplos de uso en los procesos clave</li><li>Preguntas frecuentes</li></ol></li>
</ol>
<div class="nota"><b>Aviso de salud.</b> Pulso es un prototipo académico. No diagnostica, no prescribe y no ajusta tratamientos. Los datos de demostración («María Fernández») son ficticios.</div>

<div class="parte"><div>Parte I<br>Manual técnico</div><p>Para quien instala, configura, mantiene o prueba el sistema.</p></div>

<h1>1. Descripción general del sistema</h1>
<p><b>Pulso</b> es una aplicación web progresiva (PWA) que reemplaza la libreta de papel en la que una persona con hipertensión o diabetes tipo 2 anota sus medicamentos y sus mediciones. Está construida con React y TypeScript, y guarda los datos en <b>Supabase</b> (PostgreSQL + autenticación) con seguridad por fila: cada usuario solo puede ver y modificar sus propios datos. También funciona sin conexión gracias a una copia local que se sincroniza sola.</p>
{tabla(["Módulo","Funcionalidad","Tablas"],[
 ("Usuarios y sesión","Crear cuenta, iniciar y cerrar sesión, cambiar contraseña, eliminar cuenta","auth.users"),
 ("Perfil","Nombre, condiciones, contacto de emergencia y rangos objetivo del médico","perfil, condicion, rangos_objetivo, preferencias"),
 ("Medicamentos y dosis","Medicamentos con horarios, marcar dosis tomada u omitida, adherencia","medicamento, horario, registro_dosis"),
 ("Mediciones","Presión, glucosa y peso, clasificados contra el rango del médico; historial","medicion"),
 ("Citas e informe","Citas con exportación al calendario e informe A4 para el médico","cita"),
])}

<h1>2. Requisitos</h1>
{tabla(["Requisito","Versión","Para qué"],[
 ("Node.js","20 o superior (probado con 24.16)","Ejecutar Vite, las pruebas y la CLI de Supabase"),
 ("npm","10 o superior","Instalar las dependencias"),
 ("Git","cualquiera reciente","Clonar el repositorio"),
 ("Navegador","Chrome, Edge, Firefox o Safari actuales","Usar la aplicación"),
 ("Cuenta de Supabase","plan gratuito","Base de datos y autenticación (opcional: sin ella funciona en modo local)"),
 ("Chrome o Edge instalado","—","Solo para las herramientas de capturas y auditoría (puppeteer-core)"),
])}

<h1>3. Instalación</h1>
<h2>3.1 Obtener el código e instalar dependencias</h2>
<pre><code>git clone https://github.com/ImJezel/pulso.git
cd pulso
npm install</code></pre>
<p><code>npm install</code> descarga todas las librerías listadas en <code>package.json</code>, incluida la CLI de Supabase como dependencia de desarrollo (se usa con <code>npx supabase</code>, sin instalarla aparte).</p>

<h2>3.2 Crear la base de datos en Supabase</h2>
{pasos(
 "Entra a <b>supabase.com/dashboard</b>, crea un proyecto nuevo (región recomendada: <i>East US</i>) y guarda la contraseña de la base de datos.",
 "Copia la plantilla de variables de entorno: <code>cp .env.example .env.local</code>",
 "En Supabase abre <b>Project Settings → API</b> y copia en <code>.env.local</code> la <b>Project URL</b> y la clave <b>publishable</b> (o <b>anon</b>).",
 "Aplica el esquema y la configuración de autenticación con la CLI (ver comandos abajo).",
)}
<pre><code>npx supabase login                          # abre el navegador para autorizar la CLI
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push                        # crea las 9 tablas, RLS y la función eliminar_mi_cuenta
npx supabase config push                    # sin confirmación por correo, contraseña de 8+ caracteres</code></pre>
<div class="nota"><b>Alternativa sin CLI:</b> pega el contenido de <code>supabase/migrations/20261027010000_esquema_inicial.sql</code> en el <b>SQL Editor</b> de Supabase y ejecútalo. Luego, en <b>Authentication → Sign In / Providers → Email</b>, desactiva <b>Confirm email</b>.</div>

<h2>3.3 Comprobar la instalación</h2>
<pre><code>npm run dev          # abre http://localhost:5173 → debe aparecer la pantalla «Entra a Pulso»
npm test             # debe terminar con «84 passed»</code></pre>

<h1>4. Configuración</h1>
<h2>4.1 Dependencias de producción</h2>
{tabla(["Librería","Versión","Uso en Pulso"], DEPENDENCIAS)}
<h2>4.2 Dependencias de desarrollo</h2>
{tabla(["Herramienta","Versión","Uso"], DEV)}
<h2>4.3 Variables de entorno (<code>.env.local</code>)</h2>
{tabla(["Variable","Ejemplo","Descripción"],[
 ("VITE_SUPABASE_URL","https://xxxx.supabase.co","URL del proyecto de Supabase"),
 ("VITE_SUPABASE_ANON_KEY","sb_publishable_…","Clave pública. Es segura en el navegador: los datos los protege Row Level Security"),
 ("SUPABASE_DB_PASSWORD","(contraseña)","Solo para la CLI (<code>db push</code>). Nunca se usa en el navegador"),
])}
<div class="aviso"><code>.env.local</code> está en <code>.gitignore</code> y nunca se sube al repositorio. Si las dos variables <code>VITE_</code> están vacías, Pulso arranca en <b>modo local</b>: sin cuentas y con los datos solo en el navegador.</div>

<h2>4.4 Base de datos</h2>
<p>El esquema vive en <code>supabase/migrations/</code> y traduce el modelo relacional del Entregable 2. Son 9 tablas en el esquema <code>public</code>:</p>
{tabla(["Tabla","Columnas principales","Cardinalidad"], TABLAS)}
<h3>Seguridad</h3>
<ul>
 <li><b>Row Level Security en las 9 tablas</b> con una política única: una fila se puede leer o escribir solo si <code>id_perfil = auth.uid()</code>.</li>
 <li>El rol <code>anon</code> (sin sesión) no tiene ningún permiso sobre las tablas.</li>
 <li>Las claves primarias y foráneas incluyen <code>id_perfil</code>: un usuario no puede colgar datos de los de otro.</li>
 <li><code>eliminar_mi_cuenta()</code> es una función <code>SECURITY DEFINER</code> que solo borra al usuario que la llama; el borrado arrastra todos sus datos (<code>ON DELETE CASCADE</code>).</li>
</ul>
<pre><code>create policy "solo el dueño" on public.&lt;tabla&gt; for all to authenticated
  using ((select auth.uid()) = id_perfil)
  with check ((select auth.uid()) = id_perfil);</code></pre>
<h3>Autenticación (<code>supabase/config.toml</code>)</h3>
<p>Correo y contraseña, sin confirmación por correo (<code>enable_confirmations = false</code>), contraseña mínima de 8 caracteres y URL del sitio <code>http://localhost:5173</code>.</p>
<h3>Cambios al esquema</h3>
<pre><code>npx supabase migration new nombre_del_cambio   # crea un .sql nuevo en supabase/migrations
npm run db:push                                 # lo aplica al proyecto enlazado
npm run db:tipos                                # regenera src/types/supabase.ts</code></pre>

<h1>5. Arquitectura y estructura del sistema</h1>
<h2>5.1 Arquitectura en capas</h2>
<p>Pulso es un <b>monolito del lado del cliente organizado en capas</b>, con Supabase como servicio gestionado de base de datos y autenticación. Cada capa solo depende de la de abajo:</p>
<div class="capas">
 <div><b>1. Presentación</b> — <code>src/pages</code>, <code>src/components</code>. React, react-router-dom, Tailwind con tokens, lucide-react, Recharts.</div>
 <div><b>2. Estado y sesión</b> — <code>src/context</code>. <code>AppContext</code> (useReducer, Deshacer, anuncios accesibles), <code>SesionContext</code> (Supabase Auth) y <code>useSincronizacion</code> (cola de cambios sin conexión).</div>
 <div><b>3. Dominio</b> — <code>src/lib</code>. Funciones puras probadas sin red: rangos, adherencia, fechas, validaciones, ics, demo.</div>
 <div><b>4. Datos</b> — <code>src/lib/storage.ts</code> (copia local por usuario en localStorage) y <code>src/lib/remoto.ts</code> (traducción a las 9 tablas y consultas a Supabase).</div>
 <div style="border-color:#C87A2C;border-left-color:#C87A2C"><b>Supabase</b> — PostgreSQL con Row Level Security y Auth, por HTTPS con la clave pública y el token del usuario.</div>
</div>
<p>Las pantallas trabajan con un único objeto <code>EstadoPulso</code> y no saben que existe una base de datos. Añadir Supabase no obligó a cambiar las pantallas de datos.</p>

<h2>5.2 Flujo de un cambio (sincronización)</h2>
{pasos(
 "La persona toca un botón (por ejemplo «Tomé»). El reducer de <code>AppContext</code> actualiza el estado y la pantalla cambia al instante.",
 "El estado se guarda en la copia local del usuario (<code>localStorage</code>, una clave por cuenta).",
 "400 ms después, <code>useSincronizacion</code> compara el estado con lo último que el servidor confirmó (<code>calcularCambios</code>) y envía <b>solo la diferencia</b> (<code>aplicarCambios</code>).",
 "Si no hay internet, la base confirmada no avanza; se reintenta al volver la conexión y cada 30 segundos.",
 "Al abrir la app, primero se sube lo pendiente y luego se descarga lo del servidor (<code>cargarRemoto</code>), para no pisar cambios hechos sin conexión.",
)}

<h2>5.3 Estructura de carpetas</h2>
<pre><code>pulso/
├── index.html · package.json · vite.config.ts · project.config.json
├── .env.example                 plantilla de variables de entorno
├── supabase/
│   ├── config.toml              configuración de Auth
│   └── migrations/              esquema de la base de datos (SQL)
├── src/
│   ├── main.tsx                 punto de entrada y service worker
│   ├── App.tsx                  sesión → datos del usuario → rutas
│   ├── types/                   index.ts (modelo) · supabase.ts (tipos generados)
│   ├── context/                 AppContext · SesionContext · useSincronizacion
│   ├── lib/                     supabase · remoto · storage · rangos · adherencia
│   │                            fechas · validaciones · ics · demo · calidadISO
│   ├── components/              10 componentes accesibles reutilizables
│   ├── pages/                   una por pantalla
│   └── styles/tokens.css        sistema de diseño
├── tests/                       pruebas unitarias
│   └── integracion/             pruebas contra Supabase real
├── scripts/                     capturas, recorrido de usuario, auditoría axe
├── evidencias/                  logs y reporte de pruebas (Entregable 4)
└── manual/                      este manual y sus capturas</code></pre>

<h2>5.4 Pantallas y rutas</h2>
{tabla(["Ruta","Archivo (src/pages)","Qué resuelve"], RUTAS)}

<h1>6. Ejecución</h1>
{tabla(["Comando","Qué hace"],[
 ("<code>npm run dev</code>","Servidor de desarrollo con Supabase en http://localhost:5173"),
 ("<code>npm run dev:local</code>","Servidor de desarrollo sin cuentas (modo local), útil para demos sin internet"),
 ("<code>npm run build</code>","Build de producción (PWA instalable) en <code>dist/</code>"),
 ("<code>npm run preview</code>","Sirve el build de producción en http://localhost:4173"),
 ("<code>npm run build:unico</code>","Un solo <code>index.html</code> que abre con doble clic, en modo local"),
 ("<code>npm run lint</code>","Análisis estático con oxlint"),
])}
<p>Para ver la aplicación con datos sin escribir nada: entra, completa la bienvenida y ve a <b>Ajustes → Cargar datos de ejemplo</b>.</p>

<h1>7. Pruebas</h1>
<h2>7.1 Pruebas unitarias (84, sin red)</h2>
<pre><code>npm test</code></pre>
{tabla(["Archivo","Pruebas","Qué comprueba"], [(f"<code>{a}</code>", n, d) for a, n, d in PRUEBAS[:-1]])}
<p>Resultado esperado:</p>
<pre><code> Test Files  7 passed | 1 skipped (8)
      Tests  84 passed | 6 skipped (90)</code></pre>
<p>Las 6 «skipped» son las de integración, que no corren con <code>npm test</code> porque necesitan red.</p>

<h2>7.2 Pruebas de integración (6, contra Supabase real)</h2>
<pre><code>npm run test:integracion</code></pre>
<p>Requisitos: <code>.env.local</code> configurado, el proyecto de Supabase activo y la confirmación de correo desactivada. Crean dos usuarios de prueba, verifican el guardado completo, el envío de solo diferencias, la idempotencia y que <b>RLS impide que un usuario vea, cambie o borre datos de otro</b>; al terminar eliminan ambos usuarios.</p>

<h2>7.3 Otras verificaciones</h2>
<pre><code>npx tsc -p tsconfig.app.json --noEmit   # tipos (0 errores)
npm run lint                            # estilo y errores comunes
# con «npm run dev:local» corriendo en otra terminal:
npm run recorrido                       # recorre la app como un usuario nuevo
npm run axe                             # auditoría de accesibilidad WCAG
node scripts/capturas-manual.mjs        # regenera las capturas de este manual</code></pre>

<h1>8. Solución de problemas</h1>
{tabla(["Síntoma","Causa","Solución"],[
 ("<code>getaddrinfo ENOTFOUND xxxx.supabase.co</code> o error 521","El plan gratis pausa el proyecto tras 7 días sin uso","En el panel de Supabase, abrir el proyecto y pulsar <b>Restore</b>; esperar unos minutos"),
 ("Al crear cuenta dice «Te enviamos un correo…»","La confirmación por correo está activada","<code>npx supabase config push</code> o desactivar <b>Confirm email</b> en el panel"),
 ("La app no pide cuenta","Variables vacías o se usó <code>dev:local</code>","Revisar <code>.env.local</code> y usar <code>npm run dev</code>"),
 ("<code>Port 5173 is already in use</code>","Otro servidor en ese puerto","Cerrarlo o usar <code>npm run dev -- --port 5180</code>"),
 ("«No se pudieron guardar tus cambios en tu cuenta»","El servidor rechazó un cambio","Ajustes → Tu cuenta muestra el detalle técnico y el botón «Reintentar ahora»"),
])}

<div class="parte"><div>Parte II<br>Manual de usuario</div><p>Para el paciente, su familia o quien le ayuda a usar Pulso.</p></div>

<h1>1. Qué es Pulso y para quién es</h1>
<p>Pulso es <b>tu libreta de salud en el teléfono</b>. Si tienes hipertensión o diabetes, te ayuda a:</p>
<ul>
 <li><b>No olvidar tus pastillas</b> y llevar la cuenta de cuáles tomaste.</li>
 <li><b>Anotar tu presión, tu glucosa y tu peso</b>, y saber si están dentro del rango que te dio tu médico.</li>
 <li><b>Llevarle a tu médico un informe</b> ordenado de los últimos 30, 60 o 90 días.</li>
</ul>
<div class="aviso">Pulso <b>no diagnostica ni receta</b>. Si un valor te preocupa, la respuesta siempre es la misma: consulta con tu médico.</div>

<h1>2. Antes de empezar</h1>
<ul>
 <li>Necesitas un teléfono o computadora con navegador (Chrome, Edge, Safari o Firefox).</li>
 <li>La <b>primera vez</b> necesitas internet. Después, Pulso funciona aunque se vaya la señal: guarda lo que hagas y lo sube solo cuando vuelve la conexión.</li>
 <li><b>Para tenerlo como una app:</b> en el teléfono, abre el menú del navegador y elige <b>«Agregar a la pantalla de inicio»</b> o <b>«Instalar aplicación»</b>.</li>
 <li>Si te cuesta leer, en <b>Ajustes</b> puedes agrandar el texto y activar el alto contraste.</li>
</ul>

<h1>3. Guía paso a paso</h1>
<h2>3.1 Crear tu cuenta o entrar</h2>
{pasos(
 "Abre Pulso. Si es tu primera vez, toca <b>«Crear una cuenta nueva»</b>.",
 "Escribe tu <b>correo</b> y una <b>contraseña</b> de al menos 8 caracteres. Marca <b>«Mostrar contraseña»</b> para ver lo que escribiste.",
 "Toca <b>«Crear cuenta»</b>. Las próximas veces usa <b>«Entrar»</b> con el mismo correo y contraseña.",
)}
{fila(tel("01-entrar","Pantalla «Entra a Pulso»"), tel("02-crear-cuenta","Crear una cuenta nueva"))}
<p>Si algo está mal escrito, Pulso te lo dice debajo del campo con un triángulo ▲ y te explica cómo corregirlo.</p>

<h2>3.2 Configuración inicial (3 pasos)</h2>
<p>La primera vez, Pulso te hace tres preguntas. Siempre puedes volver con <b>«Atrás»</b>.</p>
{pasos(
 "<b>Paso 1:</b> tu nombre y, si quieres, tu fecha de nacimiento. Toca <b>«Continuar»</b>.",
 "<b>Paso 2:</b> toca las condiciones que tienes (por ejemplo <i>Hipertensión</i> y <i>Diabetes tipo 2</i>) y, si quieres, un contacto de emergencia.",
 "<b>Paso 3:</b> los <b>rangos objetivo que te dio tu médico</b>. Si no los sabes, déjalos en blanco: Pulso guardará tus mediciones sin clasificarlas. Puedes ponerlos después en Ajustes.",
)}
{fila(tel("03-bienvenida-paso1","Paso 1: tu nombre"), tel("04-bienvenida-paso2","Paso 2: tus condiciones"), tel("05-bienvenida-paso3","Paso 3: rangos del médico"))}

<h2>3.3 La pantalla «Hoy»</h2>
<p>Es la pantalla principal. Arriba te saluda por tu nombre y debajo tienes:</p>
<ul>
 <li><b>Tu día:</b> una cinta de 24 horas con un punto por cada dosis. <b>Verde relleno</b> = tomada, <b>círculo vacío</b> = pendiente, <b>gris</b> = omitida. Sin leer nada sabes cómo vas.</li>
 <li><b>Dosis de hoy:</b> cada medicamento con su hora y los botones grandes <b>«Tomé»</b> y <b>«Omití»</b>.</li>
 <li>Tu <b>última medición</b> y tu <b>próxima cita</b>.</li>
</ul>
{fila(tel("06-hoy","Pantalla «Hoy» con datos de ejemplo"))}
<p>Abajo siempre está la barra con <b>Hoy · Registrar · Historial · Informe</b>, y arriba <b>Medicamentos · Citas · Ajustes</b>.</p>

<h2>3.4 Marcar una dosis</h2>
{pasos(
 "En <b>Hoy</b>, busca la dosis pendiente (dice la hora y la instrucción, por ejemplo «Con un vaso de agua»).",
 "Toca <b>«Tomé»</b> si te la tomaste o <b>«Omití»</b> si no.",
 "La tarjeta cambia a <b>«Tomada»</b> y abajo aparece <b>«Deshacer»</b> durante 8 segundos por si te equivocaste.",
)}
{fila(tel("07-hoy-dosis-pendiente","Dosis pendiente con «Tomé» y «Omití»"), tel("07b-hoy-dosis-tomada","Dosis marcada y opción «Deshacer»"))}

<h2>3.5 Registrar una medición</h2>
{pasos(
 "Toca <b>Registrar</b> en la barra de abajo.",
 "Elige qué vas a anotar: <b>Presión</b>, <b>Glucosa</b> o <b>Peso</b>.",
 "Escribe el número. En glucosa, indica si fue <b>en ayunas</b> o <b>después de comer</b>. La fecha y hora ya vienen puestas en «ahora».",
 "Toca <b>«Guardar medición»</b>. Pulso te muestra el valor y si está <b>dentro o fuera del rango</b> que pusiste.",
)}
{fila(tel("08-registrar","Elegir «Glucosa»"), tel("09-registrar-valor","Escribir el valor"), tel("10-registrar-guardada","Medición guardada y clasificada"))}
<div class="nota">Si un valor está fuera de tu rango, Pulso solo dice: <i>«Este valor está fuera del rango que registraste. Consulta con tu médico.»</i> Nunca da una indicación médica.</div>

<h2>3.6 Agregar un medicamento</h2>
{pasos(
 "Arriba, toca <b>Medicamentos</b> y luego <b>«Agregar»</b>.",
 "Escribe el <b>nombre</b> y la <b>dosis</b> como aparece en la caja (por ejemplo «50 mg»).",
 "Agrega cada <b>hora</b> en que te toca con <b>«Agregar hora»</b>, o toca una de las horas sugeridas.",
 "Toca <b>«Guardar»</b>. Desde ese momento la dosis aparece en <b>Hoy</b>.",
)}
{fila(tel("11-medicamentos","Lista de medicamentos"), tel("12-medicamento-agregar","Agregar un medicamento"))}
<p>Si dejas de tomar un medicamento, usa <b>«Desactivar»</b>: se conserva su historial. <b>«Eliminar»</b> lo borra con todos sus registros y te pide confirmar.</p>

<h2>3.7 Historial y tendencias</h2>
<p>En <b>Historial</b> eliges el tipo de medición y el período (7, 30 o 90 días). El gráfico muestra tu tendencia con una <b>franja verde</b> que es el rango de tu médico, y debajo un resumen y la tabla de todas las mediciones.</p>
{fila(tel("13-historial","Historial con la franja del rango"), tel("14-citas","Citas próximas"))}

<h2>3.8 Citas</h2>
<p>En <b>Citas</b> toca <b>«Agregar»</b> para anotar médico, especialidad, fecha, lugar y motivo. Con <b>«Agregar al calendario»</b> la cita pasa al calendario de tu teléfono.</p>

<h2>3.9 Informe para el médico</h2>
{pasos(
 "Toca <b>Informe</b> en la barra de abajo.",
 "Elige el período: <b>30, 60 o 90 días</b>.",
 "Revisa la vista previa: tus datos, tus medicamentos, la adherencia, las mediciones y el gráfico.",
 "Toca <b>«Imprimir o guardar en PDF»</b>. En el destino elige tu impresora o <b>«Guardar como PDF»</b> para mandarlo por WhatsApp o correo.",
)}
{fila(tel("15-informe","Informe para el médico"), tel("16-ajustes","Ajustes"), tel("17-texto-muy-grande","Texto «muy grande»"))}

<h2>3.10 Ajustes y tu cuenta</h2>
<ul>
 <li><b>Tamaño del texto:</b> Normal, Grande o Muy grande. El cambio se ve en toda la app al instante.</li>
 <li><b>Alto contraste:</b> blanco y negro con bordes marcados.</li>
 <li><b>Modo simple:</b> deja solo <i>Hoy</i> y <i>Registrar</i> en la barra de abajo.</li>
 <li><b>Tu perfil y tus rangos:</b> toca «Editar» para cambiar tus datos o los rangos de tu médico.</li>
 <li><b>Tu cuenta:</b> te dice si todo está guardado, y tiene <b>Cambiar contraseña</b>, <b>Cerrar sesión</b> y <b>Eliminar mi cuenta</b> (hay que escribir ELIMINAR para confirmar).</li>
 <li><b>Datos:</b> «Cargar datos de ejemplo» para ver la app llena, y «Borrar todos mis datos» (hay que escribir BORRAR).</li>
</ul>

<h1>4. Ejemplos de uso en los procesos clave</h1>
<h2>Ejemplo 1 · Doña Altagracia, 63 años, toma su pastilla de la mañana</h2>
<p>A las 8:05 abre Pulso. En <b>Hoy</b> ve «Losartán 50 mg · 8:00 a. m. · Con un vaso de agua» y el círculo vacío en la cinta. Toca <b>«Tomé»</b>: la tarjeta dice «Tomada» y el punto de las 8 se pone verde. <b>Resultado:</b> la dosis queda registrada con la hora real y cuenta para su adherencia del mes.</p>
<h2>Ejemplo 2 · Ramón, 51 años, anota su glucosa en menos de 15 segundos</h2>
<p>Después de almorzar se mide 128 mg/dL. Toca <b>Registrar → Glucosa</b>, escribe <b>128</b>, marca <b>«Después de comer»</b> y toca <b>«Guardar medición»</b>: tres toques. Pulso le muestra si está dentro del rango que le dio su médico. <b>Resultado:</b> la medición aparece en Hoy y en el Historial.</p>
<h2>Ejemplo 3 · Su médico le cambia el tratamiento</h2>
<p>El médico le receta Metformina 850 mg a las 8:00 a. m. y 7:00 p. m. En <b>Medicamentos → Agregar</b> escribe el nombre y la dosis, agrega las dos horas y guarda. <b>Resultado:</b> desde hoy las dos tomas aparecen en la pantalla Hoy y en la cinta del día.</p>
<h2>Ejemplo 4 · Yaneiris prepara el informe para la consulta de su mamá</h2>
<p>Un día antes de la cita, abre <b>Informe</b>, elige <b>90 días</b> y toca <b>«Imprimir o guardar en PDF»</b>. Lo guarda como PDF y se lo envía al médico. <b>Resultado:</b> el médico ve en una hoja la adherencia, las tendencias y los valores fuera de rango, en lugar de una libreta incompleta.</p>
<h2>Ejemplo 5 · Se fue el internet</h2>
<p>Doña Altagracia marca sus dosis sin señal. Pulso muestra con calma: «Sin conexión. Lo que registres se guarda en este dispositivo y se sube solo a tu cuenta cuando vuelva el internet.» <b>Resultado:</b> no se pierde nada; al volver la señal, todo se sube solo.</p>

<h1>5. Preguntas frecuentes</h1>
{tabla(["Pregunta","Respuesta"],[
 ("¿Quién puede ver mis datos?","Solo tú, con tu cuenta. La base de datos impide que otra cuenta los vea."),
 ("¿Me equivoqué al marcar una dosis?","Toca «Deshacer» en los 8 segundos siguientes, o «Cambiar» en la tarjeta de la dosis."),
 ("¿Qué pasa si no sé mis rangos?","Déjalos en blanco. Pulso guarda tus mediciones sin colorearlas hasta que los pongas en Ajustes."),
 ("¿Puedo usarlo en dos teléfonos?","Sí. Entra con la misma cuenta y tus datos se sincronizan."),
 ("¿Cómo dejo de usar Pulso?","Ajustes → Tu cuenta → Eliminar mi cuenta. Se borran tu cuenta y todos tus datos."),
 ("¿Olvidé mi contraseña?","Por ahora Pulso no envía correos de recuperación. Pide al administrador del sistema que restablezca tu acceso."),
])}
<div class="nota"><b>Pulso no diagnostica, no prescribe y no ajusta tratamientos.</b> Ante cualquier valor que te preocupe, consulta con tu médico.</div>
</body></html>"""

out = D / "manual.html"
out.write_text(html, encoding="utf-8")
pdf = D / "Entregable6_Manual_Pulso.pdf"
if pdf.exists():
    pdf.unlink()
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=4000",
                f"--user-data-dir={tempfile.mkdtemp()}", f"--print-to-pdf={pdf}", out.as_uri()], timeout=180)
last = -1
for _ in range(90):
    if pdf.exists() and pdf.stat().st_size == last and last > 0:
        break
    last = pdf.stat().st_size if pdf.exists() else -1
    time.sleep(1)
shutil.copyfile(pdf, r"C:\Users\jezel\Downloads\Entregable6_Manual_Pulso.pdf")
print("listo", pdf, last)
