# Pulso

### Control de tratamiento para personas con condiciones crónicas

**Proyecto final · Renglón Salud**
Instituto Tecnológico de Las Américas (ITLA) · Sección 2026-C-2
Asignatura: Diseño Centrado en el usuario · Facilitador: Juan Martínez López
Rebeca Mary Astacio Bryan — 2025-2264

---

## Qué es

En República Dominicana, quien tiene hipertensión o diabetes lleva su tratamiento en una libreta de papel y se la muestra al médico cada tres meses. Esa libreta se pierde, se moja y —lo más importante— **solo anota lo que pasó, nunca lo que no pasó**: nadie apunta las dosis que se olvidaron.

**Pulso** reemplaza esa libreta y hace tres cosas:

1. **Recuerda las dosis** y registra cuáles se tomaron y cuáles no.
2. **Guarda presión, glucosa y peso**, indicando si el valor está dentro del rango **que definió el médico**.
3. **Genera un informe imprimible** en A4 para llevar a la consulta.

**Lo que no hace:** no diagnostica, no receta, no ajusta tratamientos y nunca sugiere rangos clínicos por su cuenta. No tiene servidor ni cuentas de usuario: los datos se quedan en el dispositivo.

---

## Cómo ejecutarlo

**Sin instalar nada:** doble clic en **`Pulso-app.html`**, en la raíz de esta carpeta. Es la aplicación completa en un solo archivo; no necesita servidor ni conexión.

**Para trabajar sobre el código** hace falta Node.js 20 o superior:

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`. Para verlo con datos: **Ajustes → Cargar datos de ejemplo**.

Para generar la versión de producción:

```bash
npm run build        # PWA instalable, en dist/
npm run build:unico  # un solo archivo que abre con doble clic, en dist-unico/
```

---

## Estructura

```
pulso/
├── Pulso-app.html           ← la app compilada, abre con doble clic
├── index.html
├── package.json
├── project.config.json      ← datos institucionales, en un solo sitio
├── vite.config.ts
│
├── public/                  ← íconos de la PWA y manifiesto
│
├── src/
│   ├── main.tsx             ← punto de entrada
│   ├── App.tsx              ← rutas y esqueleto de la página
│   ├── types/index.ts       ← el modelo de datos completo
│   ├── lib/                 ← lógica pura, sin React, probada aparte
│   ├── context/             ← estado global
│   ├── components/          ← 10 componentes reutilizables
│   ├── pages/               ← una por pantalla
│   ├── styles/tokens.css    ← el sistema de diseño entero
│   └── index.css            ← base, utilidades y hoja de impresión
│
├── tests/                   ← 44 pruebas unitarias
├── scripts/                 ← herramientas de evidencia y documentos
│
└── docs/
    ├── 00-guia-del-proyecto.md      ← glosario, decisiones y 30 preguntas
    ├── 01-investigacion.md          ← problema, personas y referentes
    ├── 02-evaluacion-heuristica.md  ← las 10 heurísticas de Nielsen
    ├── 03-reporte-usabilidad.md     ← test con usuarios y escala SUS
    ├── 04-iso-25010.md              ← 40 ítems de calidad del producto
    ├── 05-guion-demo.md             ← guion de la demostración en vivo
    ├── 06-guion-video.md            ← guion del video
    ├── print/                       ← los tres documentos en HTML A4
    └── evidencias/                  ← capturas, auditorías y verificación
```

---

## Mapa del código

### Lógica — sin React, probada por separado

| Archivo | Qué hace |
|---|---|
| `src/types/index.ts` | Define el modelo de datos: perfil, medicamentos, dosis, mediciones, citas y preferencias |
| `src/lib/rangos.ts` | Clasifica una medición contra los rangos del médico. **Si no hay rangos, devuelve `sin-referencia` y la interfaz no colorea nada** |
| `src/lib/adherencia.ts` | Calcula el porcentaje de cumplimiento y arma la cinta del día. Las dosis futuras del día no entran en el denominador |
| `src/lib/storage.ts` | Única puerta a `localStorage`. Aísla la persistencia y atrapa JSON corrupto o almacenamiento lleno |
| `src/lib/fechas.ts` | Formatea fechas y horas en español dominicano. Guarda ISO local sin zona horaria |
| `src/lib/demo.ts` | Genera 45 días de datos ficticios con semilla fija, para que la demostración sea reproducible |
| `src/lib/ics.ts` | Exporta una cita al calendario del teléfono en formato iCalendar |
| `src/lib/calidadISO.ts` | Los 40 ítems del cuestionario ISO 25010 y sus puntuaciones |

### Estado e interfaz

| Archivo | Qué hace |
|---|---|
| `src/context/AppContext.tsx` | Estado global con `useReducer`, persistencia, «Deshacer» y anuncios para lectores de pantalla |
| `src/styles/tokens.css` | Colores, tipografías, medidas y los dos modos de accesibilidad |
| `src/index.css` | Estilos base, foco visible y la hoja de impresión del informe |
| `src/components/Boton.tsx` | Garantiza área táctil mínima de 48 px y que todo botón sea un `<button>` real |
| `src/components/CintaDelDia.tsx` | La franja de 24 horas con una marca por dosis |
| `src/components/Campos.tsx` | Campos de formulario con `<label>`, errores accesibles y teclado numérico |
| `src/components/GraficoTendencia.tsx` | Gráfico con la banda del rango objetivo y tabla equivalente para lectores de pantalla |
| `src/components/Panel.tsx` | Paneles y confirmaciones sobre el `<dialog>` nativo del navegador |
| `src/components/Navegacion.tsx` | Barra inferior de 4 destinos y cabecera, siempre con ícono **y** texto |

### Pantallas

| Ruta | Archivo | Qué resuelve |
|---|---|---|
| `/bienvenida` | `pages/Bienvenida.tsx` | Configuración inicial en 3 pasos |
| `/` | `pages/Hoy.tsx` | Qué toca ahora, última medición y próxima cita |
| `/registrar` | `pages/Registrar.tsx` | Registrar una medición en 3 toques |
| `/medicamentos` | `pages/Medicamentos.tsx` | Alta, edición, desactivación y borrado |
| `/historial` | `pages/Historial.tsx` | Tendencias, resumen del período y tabla |
| `/citas` | `pages/Citas.tsx` | Próximas y pasadas, con exportación a calendario |
| `/informe` | `pages/Informe.tsx` | El documento A4 para el médico |
| `/ajustes` | `pages/Ajustes.tsx` | Accesibilidad, perfil, datos y aviso de alcance |
| `/calidad` | `pages/Calidad.tsx` | Radar de calidad ISO 25010 |

---

## Stack y por qué

| Herramienta | Versión | Por qué |
|---|---|---|
| **React + TypeScript** | 19.2 / 6.0 | Nueve pantallas comparten un mismo estado. TypeScript documenta el modelo y evita errores de tipo en registros clínicos |
| **Vite** | 8.2 | Arranca en segundos y el build es estático |
| **Tailwind CSS** | 4.3 | Los tokens obligan a consistencia, y el modo alto contraste se implementa cambiando variables CSS |
| **React Context + `useReducer`** | — | Un solo objeto de estado y ninguna petición de red: Redux sería sobreingeniería |
| **`localStorage`** vía `storage.ts` | — | Sin backend, funciona sin conexión, y la capa aislada permite migrar sin tocar la interfaz |
| **Recharts** | 3.10 | Gráficos accesibles y responsive con poco código |
| **date-fns** | 4.4 | Fechas en español dominicano sin arrastrar librerías pesadas |
| **lucide-react** | 1.33 | Íconos SVG con licencia abierta |
| **react-router-dom** | 7.18 | Navegación con URLs reales, no pestañas simuladas |
| **vite-plugin-pwa** | 1.3 | Instalable y funcional sin conexión |
| **Vitest** | 4.1 | 44 pruebas de la lógica crítica |

**Sin backend, sin base de datos, sin variables de entorno secretas.**

---

## Sistema de diseño

Todo vive en `src/styles/tokens.css`. Ningún componente escribe un color a mano, y por eso el modo alto contraste no reescribe ni una regla de estilo: solo cambia el valor de las variables.

| Token | Color | Contraste sobre blanco | Uso |
|---|---|:---:|---|
| `--pulso-tinta` | `#14312B` | 12.6:1 | Texto principal, barra superior |
| `--pulso-salvia` | `#4E8C7A` | 3.9:1 | Rellenos, líneas de gráfico |
| `--pulso-salvia-fuerte` | `#3A6B5C` | **6.1:1** | Acción primaria y texto verde |
| `--pulso-lino` | `#F6F3EC` | — | Fondo de la aplicación |
| `--pulso-ambar` | `#C87A2C` | 3.4:1 | Marcas y fondos de atención |
| `--pulso-ambar-texto` | `#8A5316` | **6.3:1** | Texto de atención |
| `--pulso-ladrillo` | `#A33B2A` | 6.5:1 | Alerta seria, uso escaso |
| `--pulso-bruma-texto` | `#5C6B66` | **5.6:1** | Texto secundario |

> Los tres colores de marca que no llegan a 4.5:1 se conservan para rellenos y gráficos, y tienen una versión oscurecida para texto. Así se cumple WCAG 2.1 AA sin perder la paleta.

**Tipografía:** Fraunces para títulos, Public Sans para interfaz, IBM Plex Mono para cifras clínicas. Escala base de **17 px**, ampliable al 115 % y al 135 % desde Ajustes.

---

## Comandos

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción (PWA)
npm run build:unico  # build de un solo archivo, abre con doble clic
npm run preview      # sirve el build para probar la PWA
npm test             # 44 pruebas unitarias
npm run lint         # análisis estático
```

Con el servidor de desarrollo corriendo, en otra terminal:

```bash
npm run recorrido    # recorre la app como un usuario nuevo, sin instrucciones
npm run axe          # auditoría de accesibilidad de las 9 rutas en 3 modos
npm run capturas     # regenera las evidencias de docs/evidencias/
npm run documentos   # regenera los HTML A4 de docs/print/
npm run verificar    # pruebas + build + accesibilidad + recorrido
```

---

## Resultados de la última verificación

Detalle completo en [`docs/evidencias/verificacion.md`](docs/evidencias/verificacion.md).

| | |
|---|---|
| Pruebas unitarias | **44 / 44** |
| Recorrido de un usuario nuevo | **12 / 12 pasos** |
| Lighthouse (producción) | Accesibilidad **100** · Buenas prácticas **100** · SEO **100** · Rendimiento **91** |
| axe-core | **0 violaciones** en 24 auditorías (9 rutas × 3 modos de accesibilidad) |
| Consola del navegador | 0 errores, 0 advertencias en las 8 rutas |
| Funcionamiento sin conexión | Service worker activo, la app carga |

---

## Evaluación del proyecto

| Documento | Qué contiene | Resultado |
|---|---|---|
| [`docs/02-evaluacion-heuristica.md`](docs/02-evaluacion-heuristica.md) | Inspección contra las 10 heurísticas de Nielsen y Molich | **15 hallazgos, 9 corregidos** |
| [`docs/03-reporte-usabilidad.md`](docs/03-reporte-usabilidad.md) | Test moderado con 5 usuarios, métricas e instrumento completo | **SUS 79** (la industria está en 68) |
| [`docs/04-iso-25010.md`](docs/04-iso-25010.md) | 40 ítems de calidad del producto, con evidencia por ítem | **Índice global 3.95 / 5** |

Los tres están también en `docs/print/` como HTML A4, listos para **Ctrl + P → Guardar como PDF**.

---

## Licencia y aviso

Proyecto académico sin fines comerciales, desarrollado para el Instituto Tecnológico de Las Américas (ITLA).

**Aviso de salud.** Pulso es un prototipo académico. **No diagnostica, no prescribe y no ajusta tratamientos.** Todos los datos de demostración son ficticios. No debe usarse como sustituto de atención médica profesional.
