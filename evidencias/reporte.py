import html, os, pathlib, re, shutil, subprocess, tempfile, time

D = pathlib.Path(__file__).parent
u = (D / "pruebas-unitarias.log").read_text(encoding="utf-8", errors="replace")
ig = (D / "pruebas-integracion.log").read_text(encoding="utf-8", errors="replace")
e = html.escape

filas = []
for l in u.splitlines():
    m = re.match(r"\s*✓ (tests/\S+) > (.+?)(?: \d+ms)?$", l)
    if m:
        partes = m.group(2).split(" > ")
        filas.append((m.group(1).replace("tests/", ""), " › ".join(partes)))
resumen_u = "\n".join(l for l in u.splitlines() if re.search(r"Test Files|Tests |Duration", l))
err_ig = "\n".join(l for l in ig.splitlines() if re.search(r"FAIL|fetch failed|ENOTFOUND|Test Files|Tests ", l))[:1500]

CASOS = [
 ("CP-01","Usuarios","Crear cuenta con correo y contraseña de 8+ caracteres","Sesión abierta y paso a Bienvenida","Integración (signUp real)"),
 ("CP-02","Usuarios","Entrar con datos vacíos o correo inválido","Mensajes bajo el campo, no se envía nada","Manual / navegador"),
 ("CP-03","Usuarios","Eliminar mi cuenta","Usuario y todos sus datos borrados en cascada","Integración"),
 ("CP-04","Seguridad","Usuario B intenta leer, modificar y borrar datos de A","0 filas / error RLS; datos de A intactos","Integración"),
 ("CP-05","Seguridad","Consulta sin sesión (rol anónimo)","No devuelve datos, no puede eliminar cuentas","Integración"),
 ("CP-06","Mediciones","Clasificar valor contra rango del médico (límites, ±10 %)","en-rango / atención / fuera de rango","Unitaria (rangos)"),
 ("CP-07","Mediciones","Perfil sin rangos definidos","sin-referencia, no se colorea nada","Unitaria (rangos)"),
 ("CP-08","Dosis","Calcular adherencia sin contar dosis futuras","Porcentaje correcto","Unitaria (adherencia)"),
 ("CP-09","Dosis","Eliminar medicamento","Se borran también sus registros de dosis","Unitaria (storage) + Integración"),
 ("CP-10","Datos","Guardar el caso de demostración completo y leerlo","Datos idénticos tras ir y volver","Unitaria + Integración"),
 ("CP-11","Sincronización","Marcar una dosis","Se envía solo esa dosis","Unitaria (remoto, sincronización)"),
 ("CP-12","Sincronización","Abrir con cambios pendientes","Primero sube, luego descarga","Unitaria (sincronización)"),
 ("CP-13","Sincronización","Sin internet con cambios pendientes","No se pisan los cambios locales","Unitaria (sincronización)"),
 ("CP-14","Sincronización","Cambio durante un envío en curso","Se envía después, sin perderse","Unitaria (sincronización)"),
 ("CP-15","Almacenamiento","JSON local corrupto","Arranca limpio y guarda copia rota","Unitaria (storage)"),
 ("CP-16","Fechas","Edad el día del cumpleaños antes del mediodía","Años ya cumplidos","Unitaria (fechas)"),
]

INC = [
 ("INC-01","Media","edad() restaba un año el día del cumpleaños antes de las 12:00 (parseaba la fecha al mediodía).","Detectado por la prueba unitaria de fechas a las 00:01.","Corregido (commit b6e68a6): se parsea a medianoche local.","Cerrada"),
 ("INC-02","Baja","En npm run dev la consola mostraba «An unknown error occurred when fetching the script».","Revisión de la consola del navegador.","El service worker solo se registra en producción (import.meta.env.PROD).","Cerrada"),
 ("INC-03","Media","config push falló: «Please upgrade the project to a paid tier to enable vector buckets».","Log de la CLI de Supabase.","Se desactivó [storage.vector] en supabase/config.toml.","Cerrada"),
 ("INC-04","Alta","Dispositivo con copia vieja queda bloqueado por violación de clave foránea si el medicamento se borró en otro dispositivo (error 23503 en cada reintento).","Revisión de código adversarial (2 verificadores confirmaron).","Propuesta: ante un rechazo del servidor, recargar lo remoto como nueva base y descartar dosis huérfanas.","Abierta"),
 ("INC-05","Alta","Un dispositivo atrasado puede sobrescribir en el servidor una dosis «tomada» con «pendiente» (upsert sobre ids deterministas).","Revisión de código adversarial (2 verificadores confirmaron).","Propuesta: enviar dosis nuevas con ignoreDuplicates (ON CONFLICT DO NOTHING).","Abierta"),
 ("INC-06","Media","El 02/11 las pruebas de integración fallan: getaddrinfo ENOTFOUND del proyecto Supabase.","Log pruebas-integracion.log.","Causa: el plan gratis pausa el proyecto tras 7 días sin uso. Solución: restaurarlo desde el panel de Supabase y volver a correr npm run test:integracion.","Abierta"),
]

INTEG = [
 ("Guarda el caso de demostración completo y lo devuelve idéntico","Perfil, 3 medicamentos, ~250 dosis, 90+ mediciones y citas se escriben en las 9 tablas y se leen iguales."),
 ("Manda solo las diferencias y el servidor queda igual que la app","Marcar dosis + eliminar medicamento + editar cita + cambiar preferencias → solo esos cambios viajan."),
 ("Repetir un envío no duplica nada (idempotente)","Reenviar todo el estado deja el servidor igual."),
 ("RLS: otro usuario no puede ver, cambiar ni borrar los datos ajenos","Usuario B obtiene 0 filas y error al intentar escribir sobre A."),
 ("Sin sesión no se lee nada ni se puede eliminar una cuenta","El rol anónimo no tiene permisos."),
 ("«Borrar todos mis datos» vacía la cuenta pero conserva las preferencias","Perfil y colecciones quedan vacíos; preferencias intactas."),
]

def tabla(cab, filas_):
    t = "<table><tr>" + "".join(f"<th>{e(c)}</th>" for c in cab) + "</tr>"
    for f in filas_:
        t += "<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in f) + "</tr>"
    return t + "</table>"

conteo = {}
for a, _ in filas:
    conteo[a] = conteo.get(a, 0) + 1

doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entregable 4 – Reporte de pruebas – Pulso</title>
<style>
@page {{ size: A4; margin: 16mm 16mm 18mm; @bottom-center {{ content: counter(page); font: 9pt "Segoe UI"; color: #8A9A94; }} }}
@page portada {{ @bottom-center {{ content: none }} }}
body {{ font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.45; color: #1f2937; margin: 0; }}
h1 {{ font-size: 16pt; color: #14312B; border-bottom: 2px solid #4E8C7A; padding-bottom: 4px; margin: 0 0 8px; break-before: page; }}
h2 {{ font-size: 12pt; color: #2F6B5B; margin: 14px 0 6px; }}
p {{ margin: 0 0 7px; text-align: justify; }}
table {{ width: 100%; border-collapse: collapse; font-size: 8.8pt; margin: 6px 0 10px; }}
th, td {{ border: 1px solid #CFD8D4; padding: 3px 6px; text-align: left; vertical-align: top; }}
th {{ background: #3E7565; color: #fff; }} tr {{ break-inside: avoid; }}
tr:nth-child(even) td {{ background: #F6F3EC; }}
pre {{ background: #14312B; color: #E3EEEA; font: 8pt Consolas, monospace; padding: 8px 10px; white-space: pre-wrap; word-wrap: break-word; border-radius: 4px; }}
code {{ font-family: Consolas, monospace; }}
.cover {{ page: portada; height: 225mm; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 20mm 0 10mm; }}
.cover .t {{ font-size: 42pt; font-weight: 800; color: #4E8C7A; }}
.ok {{ color: #2F6B5B; font-weight: 700; }} .ab {{ color: #A35E1C; font-weight: 700; }}
.kpi {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 12px; }}
.kpi div {{ border: 1px solid #CFD8D4; padding: 8px; text-align: center; }} .kpi b {{ display: block; font-size: 18pt; color: #14312B; }}
</style></head><body>
<div class="cover">
 <div><b style="font-size:14pt">INSTITUTO TECNOLÓGICO DE LAS AMÉRICAS (ITLA)</b><br><span style="color:#5F6F69;font-size:11.5pt">Programación III · Sección 2026-C-3<br>Facilitadora: Eduandy Isabel Cruz Abreu</span></div>
 <div><div class="t">Pulso</div><div style="font-size:12pt">Aplicación web para el control de tratamientos de hipertensión y diabetes tipo 2</div>
 <div style="font-size:16pt;font-weight:700;margin-top:14px;color:#14312B">Entregable 4 – Reporte de pruebas</div></div>
 <table style="width:115mm;font-size:11pt"><tr><th>Integrante</th><th>Matrícula</th></tr><tr><td>Jezel Pujols</td><td>2025-2067</td></tr><tr><td>Rebeca Mary Astacio Bryan</td><td>2025-2264</td></tr></table>
 <div style="color:#5F6F69">Repositorio: https://github.com/ImJezel/pulso<br>Santo Domingo, 2 de noviembre de 2026</div>
</div>

<h1>Resumen</h1>
<p>Se probó Pulso (React + TypeScript + Supabase) en tres niveles: pruebas unitarias automáticas con Vitest, pruebas de integración contra la base de datos real de Supabase y una revisión de código adversarial. Todas las pruebas se ejecutan con <code>npm test</code> y <code>npm run test:integracion</code>.</p>
<div class="kpi"><div><b>{len(filas)}</b>pruebas unitarias aprobadas</div><div><b>6/6</b>integración (27/10)</div><div><b>{len(CASOS)}</b>casos de prueba</div><div><b>{len(INC)}</b>incidencias registradas</div></div>
<table><tr><th>Nivel</th><th>Herramienta</th><th>Resultado</th></tr>
<tr><td>Unitarias</td><td>Vitest 4 + Testing Library (jsdom)</td><td class="ok">{len(filas)} aprobadas, 0 fallidas (02/11/2026)</td></tr>
<tr><td>Integración</td><td>Vitest contra Supabase real (Postgres + Auth + RLS)</td><td class="ok">6/6 aprobadas el 27/10/2026</td></tr>
<tr><td>Integración (re-ejecución)</td><td>misma suite, 02/11/2026</td><td class="ab">No ejecutada: proyecto Supabase pausado (INC-06)</td></tr>
<tr><td>Tipos y estilo</td><td>tsc (strict) · oxlint</td><td class="ok">0 errores</td></tr>
<tr><td>Revisión de código</td><td>4 revisores + 2 verificadores por hallazgo</td><td>2 defectos altos confirmados (INC-04, INC-05)</td></tr></table>

<h1>1. Plan de pruebas</h1>
<p><b>Objetivo:</b> comprobar que los módulos de usuarios, perfil, medicamentos y dosis, mediciones y sincronización con la base de datos funcionan correctamente y que ningún usuario puede acceder a los datos de otro. <b>Alcance:</b> lógica de dominio (src/lib), motor de sincronización (src/context) y base de datos (supabase/migrations). <b>Criterio de aprobación:</b> todas las pruebas automáticas en verde y ningún defecto de severidad alta abierto en los flujos principales.</p>
{tabla(["ID","Módulo","Caso","Resultado esperado","Tipo de prueba"], CASOS)}

<h1>2. Pruebas unitarias</h1>
<p>Se implementaron <b>{len(filas)}</b> pruebas unitarias en {len(conteo)} archivos. Se ejecutan sin red: el motor de sincronización se prueba con Supabase simulado (<code>vi.mock</code>).</p>
{tabla(["Archivo","Pruebas","Qué cubre"], [
 ("rangos.test.ts", conteo.get("rangos.test.ts",0), "Clasificación de mediciones contra los rangos del médico"),
 ("adherencia.test.ts", conteo.get("adherencia.test.ts",0), "Dosis del día, porcentaje de cumplimiento, cinta del día"),
 ("fechas.test.ts", conteo.get("fechas.test.ts",0), "Formatos es-DO, edad, fechas relativas"),
 ("storage.test.ts", conteo.get("storage.test.ts",0), "Persistencia local, JSON corrupto, reducer"),
 ("remoto.test.ts", conteo.get("remoto.test.ts",0), "Traducción estado ⇄ tablas y cálculo de cambios"),
 ("sincronizacion.test.tsx", conteo.get("sincronizacion.test.tsx",0), "Orden de operaciones y modo sin conexión"),
])}
<h2>Resultado de la ejecución (02/11/2026)</h2>
<pre>{e(resumen_u)}</pre>
<h2>Detalle de cada prueba</h2>
{tabla(["#","Archivo","Prueba","Resultado"], [(i+1, a, n, "✓ Aprobada") for i,(a,n) in enumerate(filas)])}

<h1>3. Pruebas de integración</h1>
<p>Archivo <code>tests/integracion/supabase.test.ts</code>. Crea dos usuarios de prueba reales en Supabase, ejecuta procesos completos usando la misma capa de datos que la aplicación (<code>aplicarCambios</code> y <code>cargarRemoto</code>) y al final elimina ambos usuarios con la función <code>eliminar_mi_cuenta()</code>.</p>
{tabla(["#","Proceso completo","Qué verifica","Resultado 27/10"], [(i+1,a,b,"✓ Aprobada") for i,(a,b) in enumerate(INTEG)])}
<h2>Salida de la ejecución del 27/10/2026</h2>
<pre>npx vitest run tests/integracion --mode integracion

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  00:16:22
   Duration  13.34s</pre>
<h2>Re-ejecución del 02/11/2026 (ver INC-06)</h2>
<pre>{e(err_ig)}</pre>

<h1>4. Registro de incidencias</h1>
{tabla(["ID","Severidad","Descripción","Cómo se detectó","Corrección","Estado"], INC)}
<p><b>Resumen:</b> 3 incidencias cerradas y 3 abiertas. Las dos abiertas de severidad alta (INC-04 e INC-05) solo ocurren cuando la misma cuenta se usa en dos dispositivos a la vez; el uso en un solo dispositivo no se ve afectado. Su corrección queda planificada para la siguiente iteración.</p>

<h1>5. Evidencias</h1>
<p>Los registros completos están en la carpeta <code>evidencias/</code> del repositorio: <code>pruebas-unitarias.log</code> y <code>pruebas-integracion.log</code>, generados con <code>--reporter=verbose</code>.</p>
<h2>Log de pruebas unitarias (extracto)</h2>
<pre>{e(chr(10).join(u.splitlines()[:45]))}</pre>
<h2>Seguridad de la base de datos (RLS) — política aplicada a las 9 tablas</h2>
<pre>create policy "solo el dueño" on public.&lt;tabla&gt; for all to authenticated
  using ((select auth.uid()) = id_perfil)
  with check ((select auth.uid()) = id_perfil);
revoke all on table public.&lt;tabla&gt; from anon;</pre>
<h2>Historial de commits del repositorio</h2>
<pre>{e(subprocess.run(["git","log","--oneline","-20"],capture_output=True,text=True,encoding="utf-8",cwd=D.parent).stdout)}</pre>
</body></html>"""

out_html = D / "reporte-pruebas.html"
out_html.write_text(doc, encoding="utf-8")
pdf = D / "Entregable4_Reporte_Pruebas_Pulso.pdf"
if pdf.exists(): pdf.unlink()
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--user-data-dir={tempfile.mkdtemp()}",
                f"--print-to-pdf={pdf}", out_html.as_uri()], timeout=120)
last = -1
for _ in range(60):
    if pdf.exists() and pdf.stat().st_size == last and last > 0: break
    last = pdf.stat().st_size if pdf.exists() else -1
    time.sleep(1)
shutil.copyfile(pdf, r"C:\Users\jezel\Downloads\Entregable4_Reporte_Pruebas_Pulso.pdf")
import fitz
d = fitz.open(pdf); print("paginas", len(d))
for i in (0, 2, 5):
    if i < len(d): d[i].get_pixmap(dpi=50).save(str(D / f"_p{i}.png"))
