-- ============================================================================
-- Pulso — Esquema inicial
-- ----------------------------------------------------------------------------
-- Traduce el modelo relacional del Entregable 2 a Postgres (Supabase).
--
-- Reglas que este archivo garantiza en la base de datos, no en la interfaz:
--   · Cada fila pertenece a un usuario de Supabase Auth: id_perfil = auth.uid().
--   · Row Level Security en TODAS las tablas: un paciente solo puede leer y
--     escribir sus propias filas. El rol anónimo no ve nada.
--   · Las claves primarias son compuestas (id_perfil, id): los identificadores
--     los genera la app en el dispositivo y así nunca chocan entre usuarios.
--   · Las fechas clínicas son `timestamp` SIN zona horaria, igual que en la app:
--     una medición de las 8:00 a. m. no se mueve de día al cambiar de zona.
--   · Borrar la cuenta borra en cascada todos sus datos.
-- ============================================================================

-- --- Perfil (1 por usuario) -------------------------------------------------
create table public.perfil (
  id_perfil         uuid primary key default auth.uid()
                    references auth.users (id) on delete cascade,
  nombre            text not null check (char_length(trim(nombre)) > 0),
  fecha_nacimiento  date,
  contacto_nombre   text,
  contacto_telefono text,
  datos_demo        boolean not null default false,
  version_esquema   integer not null default 1
);

-- --- Rangos objetivo (0..1 por perfil; los define el médico) ----------------
-- numeric y no integer: un rango puede escribirse con decimales (peso 150.5).
create table public.rangos_objetivo (
  id_perfil  uuid primary key references public.perfil (id_perfil) on delete cascade,
  sis_min    numeric, sis_max    numeric,
  dia_min    numeric, dia_max    numeric,
  ayunas_min numeric, ayunas_max numeric,
  post_min   numeric, post_max   numeric,
  peso_min   numeric, peso_max   numeric
);

-- --- Preferencias de accesibilidad (1 por usuario) --------------------------
-- Cuelga de auth.users y no de perfil: "Borrar todos mis datos" elimina el
-- perfil pero conserva el tamaño de texto y el contraste de la persona.
create table public.preferencias (
  id_perfil      uuid primary key default auth.uid()
                 references auth.users (id) on delete cascade,
  escala_texto   text not null default 'normal'
                 check (escala_texto in ('normal', 'grande', 'muy-grande')),
  alto_contraste boolean not null default false,
  modo_simple    boolean not null default false
);

-- --- Condiciones del paciente (hipertension, diabetes_t2, ...) --------------
create table public.condicion (
  id_perfil uuid not null default auth.uid()
            references public.perfil (id_perfil) on delete cascade,
  codigo    text not null,
  orden     integer not null default 0,
  primary key (id_perfil, codigo)
);

-- --- Medicamentos -----------------------------------------------------------
create table public.medicamento (
  id_perfil      uuid not null default auth.uid()
                 references public.perfil (id_perfil) on delete cascade,
  id_medicamento text not null,
  nombre         text not null,
  dosis          text not null default '',
  instruccion    text not null default '',
  activo         boolean not null default true,
  creado_en      timestamp not null,
  primary key (id_perfil, id_medicamento)
);

-- --- Horarios de cada medicamento (08:00, 20:00, ...) -----------------------
create table public.horario (
  id_perfil      uuid not null default auth.uid(),
  id_medicamento text not null,
  hora           time not null,
  orden          integer not null default 0,
  primary key (id_perfil, id_medicamento, hora),
  foreign key (id_perfil, id_medicamento)
    references public.medicamento (id_perfil, id_medicamento) on delete cascade
);

-- --- Registro de cada dosis programada --------------------------------------
create table public.registro_dosis (
  id_perfil             uuid not null default auth.uid(),
  id_registro           text not null,
  id_medicamento        text not null,
  fecha_hora_programada timestamp not null,
  estado                text not null check (estado in ('pendiente', 'tomada', 'omitida')),
  registrado_en         timestamp,
  primary key (id_perfil, id_registro),
  foreign key (id_perfil, id_medicamento)
    references public.medicamento (id_perfil, id_medicamento) on delete cascade
);
create index registro_dosis_por_fecha on public.registro_dosis (id_perfil, fecha_hora_programada);

-- --- Mediciones (presión, glucosa, peso) ------------------------------------
create table public.medicion (
  id_perfil   uuid not null default auth.uid()
              references public.perfil (id_perfil) on delete cascade,
  id_medicion text not null,
  tipo        text not null check (tipo in ('presion', 'glucosa', 'peso')),
  fecha_hora  timestamp not null,
  sistolica   numeric,
  diastolica  numeric,
  pulso       numeric,
  glucosa     numeric,
  contexto    text check (contexto in ('ayunas', 'postprandial')),
  peso        numeric,
  nota        text not null default '',
  primary key (id_perfil, id_medicion)
);
create index medicion_por_fecha on public.medicion (id_perfil, fecha_hora desc);

-- --- Citas médicas ----------------------------------------------------------
create table public.cita (
  id_perfil    uuid not null default auth.uid()
               references public.perfil (id_perfil) on delete cascade,
  id_cita      text not null,
  medico       text not null default '',
  especialidad text not null default '',
  fecha_hora   timestamp not null,
  lugar        text not null default '',
  motivo       text not null default '',
  primary key (id_perfil, id_cita)
);

-- ============================================================================
-- Seguridad: Row Level Security
-- ----------------------------------------------------------------------------
-- Una política por tabla, para todas las operaciones: la fila se puede leer,
-- crear, cambiar o borrar solo si su id_perfil es el del usuario que pregunta.
-- `(select auth.uid())` va entre paréntesis para que Postgres lo calcule una
-- vez por consulta y no una vez por fila.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'perfil', 'rangos_objetivo', 'preferencias', 'condicion', 'medicamento',
    'horario', 'registro_dosis', 'medicion', 'cita'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo el dueño" on public.%I for all to authenticated '
      'using ((select auth.uid()) = id_perfil) '
      'with check ((select auth.uid()) = id_perfil)', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end
$$;

-- ============================================================================
-- Eliminar mi cuenta
-- ----------------------------------------------------------------------------
-- El cliente no puede borrar usuarios de auth.users (y no debe tener la clave
-- de servicio). Esta función corre con los permisos de su dueño, pero solo
-- borra al usuario que la llama: auth.uid(). El borrado arrastra en cascada
-- perfil, preferencias, medicamentos, dosis, mediciones y citas.
-- ============================================================================
create or replace function public.eliminar_mi_cuenta()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
