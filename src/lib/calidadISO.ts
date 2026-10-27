/* ============================================================================
   Pulso — Datos del cuestionario ISO/IEC 25010
   ----------------------------------------------------------------------------
   Los 40 ítems y sus puntuaciones viven aquí, en un solo sitio, para que la
   página /calidad del prototipo y el documento docs/04-iso-25010.md digan
   exactamente lo mismo. Si una puntuación cambia, cambia en los dos lados.

   Las puntuaciones son la AUTOEVALUACIÓN TÉCNICA del equipo: cada una tiene
   detrás una evidencia verificable (un archivo, una prueba, una medición de
   Lighthouse). No son opiniones sueltas y no son todas cincos: un prototipo
   sin backend puntúa bajo en Seguridad y en Fiabilidad, y eso se explica en
   vez de disimularse.
   ========================================================================== */

export interface ItemISO {
  id: string
  caracteristica: string
  subcaracteristica: string
  item: string
  /** Autoevaluación técnica del equipo, escala Likert 1–5. */
  puntaje: number
  evidencia: string
}

export const CARACTERISTICAS = [
  'Adecuación funcional',
  'Eficiencia de desempeño',
  'Compatibilidad',
  'Usabilidad',
  'Fiabilidad',
  'Seguridad',
  'Mantenibilidad',
  'Portabilidad',
] as const

export type Caracteristica = (typeof CARACTERISTICAS)[number]

/** Nombre corto para que quepa en el radar. */
export const CORTO: Record<Caracteristica, string> = {
  'Adecuación funcional': 'Funcional',
  'Eficiencia de desempeño': 'Desempeño',
  Compatibilidad: 'Compatib.',
  Usabilidad: 'Usabilidad',
  Fiabilidad: 'Fiabilidad',
  Seguridad: 'Seguridad',
  Mantenibilidad: 'Mantenib.',
  Portabilidad: 'Portab.',
}

export const ITEMS: ItemISO[] = [
  /* --- 1. Adecuación funcional ------------------------------------------ */
  {
    id: 'AF-01',
    caracteristica: 'Adecuación funcional',
    subcaracteristica: 'Completitud funcional',
    item: 'La aplicación cubre todas las tareas que necesito para llevar el control de mi tratamiento',
    puntaje: 5,
    evidencia: 'Las 7 pantallas del alcance están construidas: medicamentos, dosis, mediciones, historial, citas, informe y ajustes.',
  },
  {
    id: 'AF-02',
    caracteristica: 'Adecuación funcional',
    subcaracteristica: 'Completitud funcional',
    item: 'Puedo registrar todos los tipos de medición que me pidió mi médico',
    puntaje: 4,
    evidencia: 'Presión, glucosa y peso. Faltan oxigenación y temperatura, que quedaron fuera del alcance definido.',
  },
  {
    id: 'AF-03',
    caracteristica: 'Adecuación funcional',
    subcaracteristica: 'Corrección funcional',
    item: 'Los cálculos que muestra la aplicación (promedios, porcentaje de cumplimiento) son correctos',
    puntaje: 4,
    evidencia: 'lib/rangos.ts y lib/adherencia.ts están cubiertos por pruebas unitarias en tests/. Los promedios de Historial no tienen prueba propia.',
  },
  {
    id: 'AF-04',
    caracteristica: 'Adecuación funcional',
    subcaracteristica: 'Corrección funcional',
    item: 'La clasificación de una medición coincide con los rangos que registré',
    puntaje: 5,
    evidencia: 'clasificar() es una función pura probada con casos límite, incluyendo el margen del 10 %.',
  },
  {
    id: 'AF-05',
    caracteristica: 'Adecuación funcional',
    subcaracteristica: 'Pertinencia funcional',
    item: 'La aplicación no me obliga a pasos que no necesito para lo que vine a hacer',
    puntaje: 4,
    evidencia: 'Registrar una glucosa son 3 toques. La configuración inicial son 3 pasos y dos de ellos se pueden saltar.',
  },

  /* --- 2. Eficiencia de desempeño --------------------------------------- */
  {
    id: 'ED-01',
    caracteristica: 'Eficiencia de desempeño',
    subcaracteristica: 'Comportamiento temporal',
    item: 'La aplicación abre y responde sin esperas perceptibles',
    puntaje: 5,
    evidencia: 'Build estático servido desde el dispositivo; sin llamadas de red en el uso normal.',
  },
  {
    id: 'ED-02',
    caracteristica: 'Eficiencia de desempeño',
    subcaracteristica: 'Comportamiento temporal',
    item: 'Guardar una medición es inmediato',
    puntaje: 5,
    evidencia: 'Escritura síncrona en localStorage; no hay latencia de red porque no hay red.',
  },
  {
    id: 'ED-03',
    caracteristica: 'Eficiencia de desempeño',
    subcaracteristica: 'Utilización de recursos',
    item: 'La aplicación no consume una cantidad de espacio que moleste en el teléfono',
    puntaje: 4,
    evidencia: '45 días de datos de demostración ocupan menos de 200 KB en localStorage; el build ronda 1 MB con Recharts incluido.',
  },
  {
    id: 'ED-04',
    caracteristica: 'Eficiencia de desempeño',
    subcaracteristica: 'Utilización de recursos',
    item: 'La aplicación funciona bien en un teléfono de gama baja',
    puntaje: 4,
    evidencia: 'Sin animaciones costosas; solo transform y opacity. No se probó en un dispositivo físico de gama baja.',
  },
  {
    id: 'ED-05',
    caracteristica: 'Eficiencia de desempeño',
    subcaracteristica: 'Capacidad',
    item: 'La aplicación sigue respondiendo bien aunque tenga meses de registros',
    puntaje: 4,
    evidencia: 'Probado con 45 días. localStorage tiene un techo de ~5 MB por origen: bastan varios años de registros, pero el límite existe.',
  },

  /* --- 3. Compatibilidad -------------------------------------------------- */
  {
    id: 'CO-01',
    caracteristica: 'Compatibilidad',
    subcaracteristica: 'Coexistencia',
    item: 'La aplicación convive con las demás aplicaciones del teléfono sin interferir',
    puntaje: 4,
    evidencia: 'Corre en el sandbox del navegador; no pide permisos del sistema ni corre en segundo plano.',
  },
  {
    id: 'CO-02',
    caracteristica: 'Compatibilidad',
    subcaracteristica: 'Interoperabilidad',
    item: 'Puedo llevar mi información a otra aplicación o a otro sistema',
    puntaje: 2,
    evidencia: 'Solo hay dos salidas: el .ics de las citas y el informe impreso. No hay exportación de datos a CSV ni a un estándar clínico como HL7 FHIR.',
  },
  {
    id: 'CO-03',
    caracteristica: 'Compatibilidad',
    subcaracteristica: 'Interoperabilidad',
    item: 'Las citas se pueden pasar al calendario que ya uso',
    puntaje: 4,
    evidencia: 'lib/ics.ts genera un archivo iCalendar (RFC 5545) que abren Google Calendar, Android e iOS.',
  },
  {
    id: 'CO-04',
    caracteristica: 'Compatibilidad',
    subcaracteristica: 'Interoperabilidad',
    item: 'El informe se puede compartir con mi médico en un formato que él pueda leer',
    puntaje: 3,
    evidencia: 'Se imprime o se guarda como PDF desde el navegador. No hay envío directo ni enlace compartible.',
  },
  {
    id: 'CO-05',
    caracteristica: 'Compatibilidad',
    subcaracteristica: 'Coexistencia',
    item: 'La aplicación funciona en los navegadores que la gente usa de verdad',
    puntaje: 4,
    evidencia: 'Chrome, Edge y Firefox actuales. Se usa <dialog> nativo, con soporte desde 2022; no se probó en Safari por no tener el equipo.',
  },

  /* --- 4. Usabilidad ------------------------------------------------------ */
  {
    id: 'US-01',
    caracteristica: 'Usabilidad',
    subcaracteristica: 'Reconocimiento de adecuación',
    item: 'En la primera pantalla entiendo para qué sirve esta aplicación',
    puntaje: 5,
    evidencia: 'La bienvenida dice el nombre, el propósito en una línea y arranca el asistente de 3 pasos.',
  },
  {
    id: 'US-02',
    caracteristica: 'Usabilidad',
    subcaracteristica: 'Aprendizabilidad',
    item: 'Aprendí a usarla sin que nadie me explicara',
    puntaje: 4,
    evidencia: 'Etiquetas de texto en toda la navegación, ningún ícono suelto. Falta una ayuda contextual permanente (hallazgo H-01).',
  },
  {
    id: 'US-03',
    caracteristica: 'Usabilidad',
    subcaracteristica: 'Operabilidad',
    item: 'Los botones son suficientemente grandes y fáciles de tocar',
    puntaje: 5,
    evidencia: 'Área táctil mínima de 3rem (48px a escala normal) garantizada por el componente Boton.',
  },
  {
    id: 'US-04',
    caracteristica: 'Usabilidad',
    subcaracteristica: 'Protección contra errores del usuario',
    item: 'La aplicación me avisa antes de que haga algo que no se puede deshacer',
    puntaje: 4,
    evidencia: 'Eliminar un medicamento dice cuántos registros se pierden; borrar todo exige escribir BORRAR. El "Deshacer" dura 8 segundos.',
  },
  {
    id: 'US-05',
    caracteristica: 'Usabilidad',
    subcaracteristica: 'Accesibilidad',
    item: 'Puedo usarla aunque me cueste ver de cerca o distinguir colores',
    puntaje: 4,
    evidencia: 'Texto ampliable al 135 %, modo alto contraste, ningún estado comunicado solo por color, WCAG 2.1 AA en contraste.',
  },

  /* --- 5. Fiabilidad ------------------------------------------------------ */
  {
    id: 'FI-01',
    caracteristica: 'Fiabilidad',
    subcaracteristica: 'Madurez',
    item: 'La aplicación no se traba ni muestra errores mientras la uso',
    puntaje: 4,
    evidencia: 'Sin errores en consola en el recorrido completo. Es un prototipo: no tiene meses de uso real detrás.',
  },
  {
    id: 'FI-02',
    caracteristica: 'Fiabilidad',
    subcaracteristica: 'Disponibilidad',
    item: 'Puedo abrirla en cualquier momento, incluso sin internet',
    puntaje: 4,
    evidencia: 'PWA con service worker; el segundo arranque funciona con el WiFi apagado. La primera carga sí necesita red.',
  },
  {
    id: 'FI-03',
    caracteristica: 'Fiabilidad',
    subcaracteristica: 'Tolerancia a fallos',
    item: 'Si algo falla, la aplicación sigue funcionando en vez de quedarse en blanco',
    puntaje: 3,
    evidencia: 'storage.ts atrapa JSON corrupto y almacenamiento lleno. No hay ErrorBoundary de React: un fallo de render sí deja pantalla en blanco.',
  },
  {
    id: 'FI-04',
    caracteristica: 'Fiabilidad',
    subcaracteristica: 'Capacidad de recuperación',
    item: 'Si borro algo por error, puedo recuperarlo',
    puntaje: 3,
    evidencia: 'Solo un nivel de "Deshacer" y solo durante 8 segundos. Pasado ese tiempo no hay recuperación.',
  },
  {
    id: 'FI-05',
    caracteristica: 'Fiabilidad',
    subcaracteristica: 'Capacidad de recuperación',
    item: 'Si cambio de teléfono, mis datos no se pierden',
    puntaje: 3,
    evidencia: 'Los datos viven en localStorage de ese navegador. Existe exportarJSON() en storage.ts, pero todavía no hay botón que la use en la interfaz.',
  },

  /* --- 6. Seguridad -------------------------------------------------------- */
  {
    id: 'SE-01',
    caracteristica: 'Seguridad',
    subcaracteristica: 'Confidencialidad',
    item: 'Mis datos de salud permanecen en mi dispositivo y nadie más los ve',
    puntaje: 5,
    evidencia: 'No hay backend, ni analítica, ni peticiones a terceros salvo la hoja de fuentes de Google en la primera carga.',
  },
  {
    id: 'SE-02',
    caracteristica: 'Seguridad',
    subcaracteristica: 'Integridad',
    item: 'Nada modifica mis registros sin que yo lo haga',
    puntaje: 4,
    evidencia: 'Toda escritura pasa por el reducer y por storage.ts. Pero cualquier script del mismo origen podría leer localStorage: no está cifrado.',
  },
  {
    id: 'SE-03',
    caracteristica: 'Seguridad',
    subcaracteristica: 'No repudio',
    item: 'Queda constancia verificable de quién registró cada dato y cuándo',
    puntaje: 1,
    evidencia: 'No existe. Hay marca de tiempo, pero es del propio dispositivo y se puede alterar. Consecuencia directa de no tener cuentas ni servidor.',
  },
  {
    id: 'SE-04',
    caracteristica: 'Seguridad',
    subcaracteristica: 'Autenticidad',
    item: 'La aplicación verifica que soy yo quien la usa',
    puntaje: 2,
    evidencia: 'No hay autenticación. La protege el bloqueo de pantalla del teléfono y nada más. Decisión de alcance consciente.',
  },
  {
    id: 'SE-05',
    caracteristica: 'Seguridad',
    subcaracteristica: 'Responsabilidad',
    item: 'Puedo saber qué se hizo con mis datos',
    puntaje: 3,
    evidencia: 'La pantalla "Acerca de" declara que nada sale del dispositivo, y es cierto y comprobable en el código. No hay registro de auditoría.',
  },

  /* --- 7. Mantenibilidad ---------------------------------------------------- */
  {
    id: 'MA-01',
    caracteristica: 'Mantenibilidad',
    subcaracteristica: 'Modularidad',
    item: 'Cada parte del código tiene una responsabilidad clara y separada',
    puntaje: 5,
    evidencia: 'lib/ contiene lógica pura sin React; components/ no sabe de almacenamiento; storage.ts es la única puerta a localStorage.',
  },
  {
    id: 'MA-02',
    caracteristica: 'Mantenibilidad',
    subcaracteristica: 'Reusabilidad',
    item: 'Los componentes se reutilizan en varias pantallas en vez de repetirse',
    puntaje: 4,
    evidencia: 'Boton, Tarjeta, Campos, Panel e Insignia se usan en las 9 rutas. Los formularios de rangos sí están duplicados entre Bienvenida y Ajustes.',
  },
  {
    id: 'MA-03',
    caracteristica: 'Mantenibilidad',
    subcaracteristica: 'Analizabilidad',
    item: 'Se puede entender qué hace cada archivo sin preguntarle a quien lo escribió',
    puntaje: 4,
    evidencia: 'Cada archivo abre con un comentario que explica su porqué; el README trae la tabla de recorrido del código.',
  },
  {
    id: 'MA-04',
    caracteristica: 'Mantenibilidad',
    subcaracteristica: 'Modificabilidad',
    item: 'Cambiar algo no obliga a tocar media aplicación',
    puntaje: 4,
    evidencia: 'Los colores y tamaños son tokens CSS: el modo alto contraste no reescribe ni un componente. Migrar a IndexedDB tocaría solo storage.ts.',
  },
  {
    id: 'MA-05',
    caracteristica: 'Mantenibilidad',
    subcaracteristica: 'Capacidad de ser probado',
    item: 'La lógica importante se puede probar de forma automática',
    puntaje: 5,
    evidencia: 'La lógica clínica es de funciones puras. tests/ cubre rangos, adherencia, almacenamiento, fechas e ICS con Vitest.',
  },

  /* --- 8. Portabilidad ------------------------------------------------------ */
  {
    id: 'PO-01',
    caracteristica: 'Portabilidad',
    subcaracteristica: 'Adaptabilidad',
    item: 'Se ve bien tanto en teléfono como en computadora',
    puntaje: 5,
    evidencia: 'Verificado a 360, 768 y 1280 px. Diseño móvil primero con ancho máximo de contenido.',
  },
  {
    id: 'PO-02',
    caracteristica: 'Portabilidad',
    subcaracteristica: 'Instalabilidad',
    item: 'Puedo instalarla en la pantalla de inicio sin pasar por una tienda',
    puntaje: 5,
    evidencia: 'Manifiesto PWA con íconos de 192 y 512 px y modo standalone; instalable desde el navegador.',
  },
  {
    id: 'PO-03',
    caracteristica: 'Portabilidad',
    subcaracteristica: 'Instalabilidad',
    item: 'Instalarla no requiere conocimientos técnicos',
    puntaje: 4,
    evidencia: 'Es el botón "Instalar" del navegador. La app todavía no muestra un aviso propio que lo explique.',
  },
  {
    id: 'PO-04',
    caracteristica: 'Portabilidad',
    subcaracteristica: 'Capacidad de ser reemplazado',
    item: 'Si dejo de usarla, puedo llevarme mi información a otra parte',
    puntaje: 3,
    evidencia: 'El informe impreso conserva todo lo importante en papel o PDF, pero no hay exportación de datos estructurados desde la interfaz.',
  },
  {
    id: 'PO-05',
    caracteristica: 'Portabilidad',
    subcaracteristica: 'Adaptabilidad',
    item: 'Se adapta a mis preferencias de accesibilidad del sistema',
    puntaje: 4,
    evidencia: 'Respeta prefers-reduced-motion y el zoom del navegador. No lee todavía prefers-color-scheme ni prefers-contrast del sistema.',
  },
]

export interface ResumenCaracteristica {
  caracteristica: Caracteristica
  corto: string
  promedio: number
  items: ItemISO[]
}

export function resumenPorCaracteristica(): ResumenCaracteristica[] {
  return CARACTERISTICAS.map((c) => {
    const items = ITEMS.filter((i) => i.caracteristica === c)
    const promedio = items.reduce((a, b) => a + b.puntaje, 0) / items.length
    return { caracteristica: c, corto: CORTO[c], promedio: Math.round(promedio * 100) / 100, items }
  })
}

/** Índice global de calidad: promedio simple de las 8 características. */
export function indiceGlobal(): number {
  const r = resumenPorCaracteristica()
  return Math.round((r.reduce((a, b) => a + b.promedio, 0) / r.length) * 100) / 100
}

export const UMBRAL_PLAN_MEJORA = 3.5
