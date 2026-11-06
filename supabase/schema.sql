-- =====================================================================
--  LUMBRE · Base de datos para Supabase
--  Cómo usarlo: Supabase → SQL Editor → New query → pega TODO → Run.
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PERFILES (uno por usuario, se crea solo al registrarse)
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null default 'Amigo' check (char_length(nombre) between 1 and 60),
  codigo       text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  color        text not null default '#C8902E',
  biblia_id    text,
  recordatorio time,
  creado_en    timestamptz not null default now()
);

create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)), 60)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();


-- ---------------------------------------------------------------------
-- 2. AMISTADES (solicitud → aceptada)
-- ---------------------------------------------------------------------
create table if not exists public.amistades (
  id            uuid primary key default gen_random_uuid(),
  solicitante   uuid not null references public.perfiles(id) on delete cascade,
  destinatario  uuid not null references public.perfiles(id) on delete cascade,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'aceptada')),
  creado_en     timestamptz not null default now(),
  check (solicitante <> destinatario)
);
create unique index if not exists amistades_par_unico
  on public.amistades (least(solicitante, destinatario), greatest(solicitante, destinatario));

create or replace function public.son_amigos(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.amistades
    where estado = 'aceptada'
      and ((solicitante = a and destinatario = b) or (solicitante = b and destinatario = a))
  );
$$;


-- ---------------------------------------------------------------------
-- 3. PLANES DE LECTURA (personales o compartidos)
--    El contenido de cada plan vive en la app (js/datos/planes.js);
--    aquí solo se guarda quién lo hace y cuánto lleva.
-- ---------------------------------------------------------------------
create table if not exists public.plan_grupos (
  id         uuid primary key default gen_random_uuid(),
  plan_slug  text not null,
  creador    uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  inicio     date not null default current_date,
  creado_en  timestamptz not null default now()
);

create table if not exists public.plan_miembros (
  grupo_id  uuid not null references public.plan_grupos(id) on delete cascade,
  usuario   uuid not null references public.perfiles(id) on delete cascade,
  unido_en  timestamptz not null default now(),
  primary key (grupo_id, usuario)
);

create table if not exists public.plan_progreso (
  grupo_id       uuid not null,
  usuario        uuid not null default auth.uid(),
  dia            int  not null check (dia > 0),
  completado_en  timestamptz not null default now(),
  primary key (grupo_id, usuario, dia),
  foreign key (grupo_id, usuario) references public.plan_miembros(grupo_id, usuario) on delete cascade
);

create table if not exists public.plan_comentarios (
  id         uuid primary key default gen_random_uuid(),
  grupo_id   uuid not null references public.plan_grupos(id) on delete cascade,
  dia        int  not null,
  autor      uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  contenido  text not null check (char_length(contenido) between 1 and 2000),
  creado_en  timestamptz not null default now()
);

create or replace function public.es_miembro(p_grupo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plan_miembros where grupo_id = p_grupo and usuario = auth.uid());
$$;

create or replace function public.es_creador_grupo(p_grupo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plan_grupos where id = p_grupo and creador = auth.uid());
$$;

-- Quien crea el plan entra automáticamente como miembro
create or replace function public.unir_creador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.plan_miembros (grupo_id, usuario) values (new.id, new.creador)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists al_crear_grupo on public.plan_grupos;
create trigger al_crear_grupo
  after insert on public.plan_grupos
  for each row execute function public.unir_creador();


-- ---------------------------------------------------------------------
-- 4. DIARIO / DEVOCIONALES
--    visibilidad: 'privado' | 'amigos' | 'elegidos' (solo los de entrada_lectores)
-- ---------------------------------------------------------------------
create table if not exists public.entradas (
  id              uuid primary key default gen_random_uuid(),
  autor           uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  titulo          text check (char_length(titulo) <= 140),
  contenido       text not null check (char_length(contenido) between 1 and 20000),
  pasaje_id       text,
  pasaje_ref      text,
  pasaje_texto    text,
  grupo_id        uuid references public.plan_grupos(id) on delete set null,
  dia             int,
  visibilidad     text not null default 'privado' check (visibilidad in ('privado', 'amigos', 'elegidos')),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table if not exists public.entrada_lectores (
  entrada_id  uuid not null references public.entradas(id) on delete cascade,
  lector      uuid not null references public.perfiles(id) on delete cascade,
  primary key (entrada_id, lector)
);

create table if not exists public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  entrada_id  uuid not null references public.entradas(id) on delete cascade,
  autor       uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  contenido   text not null check (char_length(contenido) between 1 and 2000),
  creado_en   timestamptz not null default now()
);

create or replace function public.es_autor_entrada(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entradas where id = p and autor = auth.uid());
$$;

create or replace function public.puede_ver_entrada(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entradas e
    where e.id = p and (
      e.autor = auth.uid()
      or (e.visibilidad = 'amigos' and public.son_amigos(e.autor, auth.uid()))
      or (e.visibilidad = 'elegidos' and public.son_amigos(e.autor, auth.uid())
          and exists (select 1 from public.entrada_lectores l where l.entrada_id = e.id and l.lector = auth.uid()))
    )
  );
$$;


-- ---------------------------------------------------------------------
-- 5. ORACIÓN (peticiones y oraciones respondidas)
-- ---------------------------------------------------------------------
create table if not exists public.peticiones (
  id             uuid primary key default gen_random_uuid(),
  autor          uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  contenido      text not null check (char_length(contenido) between 1 and 2000),
  visibilidad    text not null default 'amigos' check (visibilidad in ('privado', 'amigos')),
  respondida     boolean not null default false,
  testimonio     text check (char_length(testimonio) <= 4000),
  respondida_en  timestamptz,
  creado_en      timestamptz not null default now()
);

create table if not exists public.peticion_apoyos (
  peticion_id  uuid not null references public.peticiones(id) on delete cascade,
  usuario      uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  creado_en    timestamptz not null default now(),
  primary key (peticion_id, usuario)
);

create or replace function public.puede_ver_peticion(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.peticiones
    where id = p and (autor = auth.uid() or (visibilidad = 'amigos' and public.son_amigos(autor, auth.uid())))
  );
$$;


-- ---------------------------------------------------------------------
-- 6. "VERSÍCULO PARA HOY" (enviar un versículo a un amigo)
-- ---------------------------------------------------------------------
create table if not exists public.envios (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  para        uuid not null references public.perfiles(id) on delete cascade,
  pasaje_id   text,
  referencia  text not null,
  texto       text not null check (char_length(texto) <= 4000),
  biblia      text,
  nota        text check (char_length(nota) <= 500),
  visto       boolean not null default false,
  creado_en   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 7. FAVORITOS Y SUBRAYADOS
-- ---------------------------------------------------------------------
create table if not exists public.favoritos (
  id             uuid primary key default gen_random_uuid(),
  usuario        uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  verso_id       text not null,
  referencia     text not null,
  texto          text,
  biblia_id      text,
  biblia_nombre  text,
  color          text not null default 'oro' check (color in ('oro', 'salvia', 'cielo', 'rosa')),
  nota           text check (char_length(nota) <= 1000),
  creado_en      timestamptz not null default now(),
  unique (usuario, verso_id)
);


-- ---------------------------------------------------------------------
-- 8. ACTIVIDAD DIARIA (momento de pausa + racha)
-- ---------------------------------------------------------------------
create table if not exists public.actividad (
  usuario  uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  fecha    date not null,
  estado   text check (char_length(estado) <= 40),
  nota     text check (char_length(nota) <= 500),
  leyo     boolean not null default false,
  primary key (usuario, fecha)
);


-- ---------------------------------------------------------------------
-- 9. ¿QUIÉN PUEDE VER EL NOMBRE DE QUIÉN?
--    Tú, tus amigos (o solicitudes), quienes comparten un plan contigo
--    y amigos de tus amigos (para ver quién comenta o quién ora).
-- ---------------------------------------------------------------------
create or replace function public.puede_ver_perfil(otro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    otro = auth.uid()
    or exists (
      select 1 from public.amistades
      where (solicitante = auth.uid() and destinatario = otro) or (solicitante = otro and destinatario = auth.uid())
    )
    or exists (
      select 1 from public.plan_miembros a
      join public.plan_miembros b on a.grupo_id = b.grupo_id
      where a.usuario = auth.uid() and b.usuario = otro
    )
    or exists (
      select 1 from (
        select case when solicitante = auth.uid() then destinatario else solicitante end as c
        from public.amistades
        where estado = 'aceptada' and auth.uid() in (solicitante, destinatario)
      ) mis
      where public.son_amigos(otro, mis.c)
    );
$$;


-- ---------------------------------------------------------------------
-- 10. FUNCIONES QUE LLAMA LA APP
-- ---------------------------------------------------------------------
create or replace function public.solicitar_amistad(p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := auth.uid();
  otro public.perfiles%rowtype;
  existente public.amistades%rowtype;
begin
  if yo is null then
    return json_build_object('ok', false, 'mensaje', 'Necesitas iniciar sesión.');
  end if;

  select * into otro from public.perfiles where codigo = upper(trim(p_codigo));
  if not found then
    return json_build_object('ok', false, 'mensaje', 'No encontramos a nadie con ese código.');
  end if;
  if otro.id = yo then
    return json_build_object('ok', false, 'mensaje', 'Ese es tu propio código.');
  end if;

  select * into existente from public.amistades
  where least(solicitante, destinatario) = least(yo, otro.id)
    and greatest(solicitante, destinatario) = greatest(yo, otro.id);

  if found then
    if existente.estado = 'aceptada' then
      return json_build_object('ok', true, 'mensaje', 'Ya son amigos.', 'nombre', otro.nombre);
    elsif existente.destinatario = yo then
      update public.amistades set estado = 'aceptada' where id = existente.id;
      return json_build_object('ok', true, 'mensaje', 'Ahora son amigos.', 'nombre', otro.nombre);
    else
      return json_build_object('ok', true, 'mensaje', 'Tu solicitud ya estaba enviada.', 'nombre', otro.nombre);
    end if;
  end if;

  insert into public.amistades (solicitante, destinatario) values (yo, otro.id);
  return json_build_object('ok', true, 'mensaje', 'Solicitud enviada. Cuando la acepte, serán amigos.', 'nombre', otro.nombre);
end; $$;

create or replace function public.aceptar_amistad(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.amistades set estado = 'aceptada'
  where id = p_id and destinatario = auth.uid() and estado = 'pendiente';
$$;

create or replace function public.marcar_envio_visto(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.envios set visto = true where id = p_id and para = auth.uid();
$$;

create or replace function public.nuevo_codigo()
returns text language plpgsql security definer set search_path = public as $$
declare nuevo text;
begin
  nuevo := upper(substr(md5(gen_random_uuid()::text), 1, 8));
  update public.perfiles set codigo = nuevo where id = auth.uid();
  return nuevo;
end; $$;

grant execute on function public.solicitar_amistad(text)   to authenticated;
grant execute on function public.aceptar_amistad(uuid)     to authenticated;
grant execute on function public.marcar_envio_visto(uuid)  to authenticated;
grant execute on function public.nuevo_codigo()            to authenticated;


-- ---------------------------------------------------------------------
-- 11. SEGURIDAD (Row Level Security)
--     Nada se ve si una política no lo permite expresamente.
-- ---------------------------------------------------------------------
alter table public.perfiles          enable row level security;
alter table public.amistades         enable row level security;
alter table public.plan_grupos       enable row level security;
alter table public.plan_miembros     enable row level security;
alter table public.plan_progreso     enable row level security;
alter table public.plan_comentarios  enable row level security;
alter table public.entradas          enable row level security;
alter table public.entrada_lectores  enable row level security;
alter table public.comentarios       enable row level security;
alter table public.peticiones        enable row level security;
alter table public.peticion_apoyos   enable row level security;
alter table public.envios            enable row level security;
alter table public.favoritos         enable row level security;
alter table public.actividad         enable row level security;

-- Borra políticas anteriores de estas tablas para poder re-ejecutar el archivo
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'perfiles','amistades','plan_grupos','plan_miembros','plan_progreso','plan_comentarios',
      'entradas','entrada_lectores','comentarios','peticiones','peticion_apoyos','envios','favoritos','actividad')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Perfiles
create policy perfiles_ver    on public.perfiles for select using (public.puede_ver_perfil(id));
create policy perfiles_editar on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Amistades (crear y aceptar va por funciones)
create policy amistades_ver    on public.amistades for select using (auth.uid() in (solicitante, destinatario));
create policy amistades_borrar on public.amistades for delete using (auth.uid() in (solicitante, destinatario));

-- Planes
create policy grupos_ver    on public.plan_grupos for select using (creador = auth.uid() or public.es_miembro(id));
create policy grupos_crear  on public.plan_grupos for insert with check (creador = auth.uid());
create policy grupos_borrar on public.plan_grupos for delete using (creador = auth.uid());

create policy miembros_ver    on public.plan_miembros for select using (usuario = auth.uid() or public.es_miembro(grupo_id));
create policy miembros_invitar on public.plan_miembros for insert
  with check (public.es_creador_grupo(grupo_id) and (usuario = auth.uid() or public.son_amigos(auth.uid(), usuario)));
create policy miembros_salir  on public.plan_miembros for delete using (usuario = auth.uid() or public.es_creador_grupo(grupo_id));

create policy progreso_ver     on public.plan_progreso for select using (usuario = auth.uid() or public.es_miembro(grupo_id));
create policy progreso_marcar  on public.plan_progreso for insert with check (usuario = auth.uid() and public.es_miembro(grupo_id));
create policy progreso_quitar  on public.plan_progreso for delete using (usuario = auth.uid());

create policy pcom_ver    on public.plan_comentarios for select using (public.es_miembro(grupo_id));
create policy pcom_crear  on public.plan_comentarios for insert with check (autor = auth.uid() and public.es_miembro(grupo_id));
create policy pcom_borrar on public.plan_comentarios for delete using (autor = auth.uid());

-- Diario
create policy entradas_ver     on public.entradas for select using (autor = auth.uid() or public.puede_ver_entrada(id));
create policy entradas_crear   on public.entradas for insert with check (autor = auth.uid());
create policy entradas_editar  on public.entradas for update using (autor = auth.uid()) with check (autor = auth.uid());
create policy entradas_borrar  on public.entradas for delete using (autor = auth.uid());

create policy lectores_ver    on public.entrada_lectores for select using (lector = auth.uid() or public.es_autor_entrada(entrada_id));
create policy lectores_crear  on public.entrada_lectores for insert
  with check (public.es_autor_entrada(entrada_id) and public.son_amigos(auth.uid(), lector));
create policy lectores_borrar on public.entrada_lectores for delete using (public.es_autor_entrada(entrada_id));

create policy comentarios_ver    on public.comentarios for select using (public.puede_ver_entrada(entrada_id));
create policy comentarios_crear  on public.comentarios for insert
  with check (autor = auth.uid() and public.puede_ver_entrada(entrada_id));
create policy comentarios_borrar on public.comentarios for delete
  using (autor = auth.uid() or public.es_autor_entrada(entrada_id));

-- Oración
create policy peticiones_ver    on public.peticiones for select
  using (autor = auth.uid() or (visibilidad = 'amigos' and public.son_amigos(autor, auth.uid())));
create policy peticiones_crear  on public.peticiones for insert with check (autor = auth.uid());
create policy peticiones_editar on public.peticiones for update using (autor = auth.uid()) with check (autor = auth.uid());
create policy peticiones_borrar on public.peticiones for delete using (autor = auth.uid());

create policy apoyos_ver    on public.peticion_apoyos for select using (public.puede_ver_peticion(peticion_id));
create policy apoyos_crear  on public.peticion_apoyos for insert
  with check (usuario = auth.uid() and public.puede_ver_peticion(peticion_id));
create policy apoyos_borrar on public.peticion_apoyos for delete using (usuario = auth.uid());

-- Envíos (marcar como visto va por función)
create policy envios_ver    on public.envios for select using (auth.uid() in (de, para));
create policy envios_crear  on public.envios for insert with check (de = auth.uid() and public.son_amigos(de, para));
create policy envios_borrar on public.envios for delete using (auth.uid() in (de, para));

-- Favoritos y actividad: solo tuyos
create policy favoritos_propios on public.favoritos for all using (usuario = auth.uid()) with check (usuario = auth.uid());
create policy actividad_propia  on public.actividad for all using (usuario = auth.uid()) with check (usuario = auth.uid());


-- ---------------------------------------------------------------------
-- 12. ÍNDICES
-- ---------------------------------------------------------------------
create index if not exists idx_entradas_autor     on public.entradas (autor, creado_en desc);
create index if not exists idx_comentarios_ent    on public.comentarios (entrada_id, creado_en);
create index if not exists idx_peticiones_autor   on public.peticiones (autor, creado_en desc);
create index if not exists idx_envios_para        on public.envios (para, creado_en desc);
create index if not exists idx_miembros_usuario   on public.plan_miembros (usuario);
create index if not exists idx_pcom_grupo_dia     on public.plan_comentarios (grupo_id, dia, creado_en);
create index if not exists idx_amistades_dest     on public.amistades (destinatario);

-- Listo. ✨
