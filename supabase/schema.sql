-- Esquema de la base de datos. Pégalo entero en Supabase → SQL Editor → Run.
-- Incluye ya las tablas de los pasos siguientes para no tener que volver aquí.

-- PERFIL ------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 1 and 30),
  dietas        text[] not null default '{estandar}',
  comensales    int  not null default 2 check (comensales between 1 and 8),
  comidas       text[] not null default '{comida}',
  nivel_actual  text not null default 'novato',
  plan          text not null default 'free',          -- preparado para el modelo de pago
  acepta_privacidad    timestamptz,                    -- cuándo aceptó la política de privacidad
  consentimiento_salud timestamptz,                    -- consentimiento expreso para guardar dieta y alergias
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

-- RECETAS COCINADAS (con foto) ----------------------------------------------
create table if not exists public.recipe_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  receta_id     text not null,
  tecnicas      text[] not null default '{}',          -- copia de las técnicas que practicó
  foto_path     text,
  cocinado      timestamptz not null default now()
);
create index if not exists recipe_completions_user_idx on public.recipe_completions (user_id, cocinado desc);

-- PLANES DE N DÍAS --------------------------------------------------------
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  inicio        date not null,
  dias          int  not null check (dias between 1 and 7),
  comidas       text[] not null,
  comensales    int  not null check (comensales between 1 and 12),  -- habituales del plan
  ajustes       jsonb not null default '{}',             -- excepciones por comida: {"2-cena": 4, "3-comida": 0}
  usar_sobras   boolean not null default false,
  dificultad_max int not null default 3 check (dificultad_max between 1 and 3), -- 1 fácil, 2 media, 3 elaborada
  huecos        jsonb not null,                         -- lo que devuelve planificar()
  creado        timestamptz not null default now()
);
create index if not exists plans_user_idx on public.plans (user_id, inicio desc);

-- LISTA DE LA COMPRA: lo que ya tiene en casa ------------------------------
create table if not exists public.plan_checks (
  plan_id        uuid not null references public.plans (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  ingrediente_id text not null,
  ya_tengo       boolean not null default true,
  primary key (plan_id, ingrediente_id)
);

-- SEGURIDAD: cada usuario solo ve y toca lo suyo ---------------------------
alter table public.profiles           enable row level security;
alter table public.recipe_completions enable row level security;
alter table public.plans              enable row level security;
alter table public.plan_checks        enable row level security;

drop policy if exists "perfil propio" on public.profiles;
create policy "perfil propio" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "recetas propias" on public.recipe_completions;
create policy "recetas propias" on public.recipe_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planes propios" on public.plans;
create policy "planes propios" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lista propia" on public.plan_checks;
create policy "lista propia" on public.plan_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fecha de actualización automática del perfil
create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$ begin new.actualizado = now(); return new; end $$;

drop trigger if exists profiles_actualizado on public.profiles;
create trigger profiles_actualizado before update on public.profiles
  for each row execute function public.tocar_actualizado();

-- FOTOS: bucket privado, cada usuario en su carpeta (user_id/archivo.webp) --
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos propias" on storage.objects;
create policy "fotos propias" on storage.objects
  for all using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- RECETAS DE LOS USUARIOS ---------------------------------------------------
-- estado: 'privada' (solo su autor), 'pendiente' (propuesta a la comunidad),
-- 'aprobada' (la ve todo el mundo) o 'rechazada'. Solo tú, desde el panel de
-- Supabase (Table Editor), puedes poner 'aprobada' o 'rechazada'.
create table if not exists public.user_recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  autor       text,
  receta      jsonb not null,
  estado      text not null default 'privada' check (estado in ('privada', 'pendiente', 'aprobada', 'rechazada')),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists user_recipes_estado_idx on public.user_recipes (estado);

alter table public.user_recipes enable row level security;

drop policy if exists "ver propias y aprobadas" on public.user_recipes;
create policy "ver propias y aprobadas" on public.user_recipes
  for select using (auth.uid() = user_id or estado = 'aprobada');

drop policy if exists "crear propias" on public.user_recipes;
create policy "crear propias" on public.user_recipes
  for insert with check (auth.uid() = user_id and estado in ('privada', 'pendiente'));

-- Al editar, vuelve a revisión: el usuario no puede marcarla como aprobada
drop policy if exists "editar propias" on public.user_recipes;
create policy "editar propias" on public.user_recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and estado in ('privada', 'pendiente'));

drop policy if exists "borrar propias" on public.user_recipes;
create policy "borrar propias" on public.user_recipes
  for delete using (auth.uid() = user_id);

drop trigger if exists user_recipes_actualizado on public.user_recipes;
create trigger user_recipes_actualizado before update on public.user_recipes
  for each row execute function public.tocar_actualizado();

-- BORRAR CUENTA ---------------------------------------------------------------
-- La app borra antes las fotos con la API de almacenamiento y luego llama a esta función.
-- Al borrar el usuario se borran en cascada perfil, progreso, planes, lista y recetas.
create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- OPINIONES SOBRE LAS RECETAS ---------------------------------------------
-- Para corregir recetas: valoración 1 (me ha costado), 2 (bien), 3 (genial) y comentario opcional.
-- Consúltalas en Table Editor → recipe_feedback, o con:
--   select receta_id, round(avg(valoracion), 2) as media, count(*) from recipe_feedback group by 1 order by 2;
create table if not exists public.recipe_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  receta_id   text not null,
  valoracion  int  not null check (valoracion between 1 and 3),
  comentario  text check (char_length(comentario) <= 500),
  creado      timestamptz not null default now()
);
alter table public.recipe_feedback enable row level security;
drop policy if exists "opiniones propias" on public.recipe_feedback;
create policy "opiniones propias" on public.recipe_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Si ya habías creado la tabla de planes antes de añadir la dificultad:
alter table public.plans add column if not exists dificultad_max int not null default 3;

-- PREMIUM: nadie puede hacerse Premium a sí mismo ----------------------------
-- Solo el webhook de Stripe (que usa la clave de servicio) puede cambiar «plan».
create or replace function public.proteger_plan() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then new.plan := 'free';
    else new.plan := old.plan;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_proteger_plan on public.profiles;
create trigger profiles_proteger_plan before insert or update on public.profiles
  for each row execute function public.proteger_plan();

-- Registro de pagos (para tu control y para no procesar dos veces el mismo)
create table if not exists public.pagos (
  id            text primary key,          -- id de la sesión de Stripe
  user_id       uuid references auth.users (id) on delete set null,
  importe       int,                       -- en céntimos
  moneda        text,
  creado        timestamptz not null default now()
);
alter table public.pagos enable row level security; -- sin políticas: solo la clave de servicio puede leer y escribir
