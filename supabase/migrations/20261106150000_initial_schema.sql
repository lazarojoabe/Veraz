-- VERAZ — esquema inicial do domínio nutricional
create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  calories numeric(8,2) not null default 2000 check (calories > 0),
  protein_g numeric(8,2) not null default 120 check (protein_g >= 0),
  carbohydrates_g numeric(8,2) not null default 250 check (carbohydrates_g >= 0),
  fat_g numeric(8,2) not null default 65 check (fat_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  preparation text,
  source text not null check (source in ('taco', 'tbca', 'custom')),
  source_reference text,
  base_quantity numeric(10,3) not null default 100 check (base_quantity > 0),
  base_unit text not null default 'g' check (base_unit in ('g', 'ml', 'unit', 'portion')),
  calories numeric(10,3) not null check (calories >= 0),
  protein_g numeric(10,3) not null default 0 check (protein_g >= 0),
  carbohydrates_g numeric(10,3) not null default 0 check (carbohydrates_g >= 0),
  fat_g numeric(10,3) not null default 0 check (fat_g >= 0),
  fiber_g numeric(10,3) check (fiber_g >= 0),
  sodium_mg numeric(10,3) check (sodium_mg >= 0),
  grams_per_unit numeric(10,3) check (grams_per_unit > 0),
  density_g_ml numeric(10,5) check (density_g_ml > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint foods_source_owner_check check (
    (source = 'custom' and user_id is not null) or
    (source in ('taco', 'tbca') and user_id is null)
  )
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  meal_type text not null default 'other' check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner', 'supper', 'other')),
  source text not null default 'manual' check (source in ('manual', 'voice', 'template')),
  eaten_at timestamptz not null default timezone('utc', now()),
  notes text check (char_length(notes) <= 1000),
  calories_total numeric(10,3) not null default 0 check (calories_total >= 0),
  protein_total_g numeric(10,3) not null default 0 check (protein_total_g >= 0),
  carbohydrates_total_g numeric(10,3) not null default 0 check (carbohydrates_total_g >= 0),
  fat_total_g numeric(10,3) not null default 0 check (fat_total_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  position smallint not null default 0 check (position >= 0),
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null check (unit in ('g', 'ml', 'unit', 'portion')),
  converted_grams numeric(10,3) check (converted_grams > 0),
  -- Snapshot imutável dos dados nutricionais usados no registro.
  food_name text not null,
  preparation text,
  source text not null,
  source_reference text,
  calories numeric(10,3) not null check (calories >= 0),
  protein_g numeric(10,3) not null check (protein_g >= 0),
  carbohydrates_g numeric(10,3) not null check (carbohydrates_g >= 0),
  fat_g numeric(10,3) not null check (fat_g >= 0),
  fiber_g numeric(10,3) check (fiber_g >= 0),
  sodium_mg numeric(10,3) check (sodium_mg >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  position smallint not null default 0 check (position >= 0),
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null check (unit in ('g', 'ml', 'unit', 'portion')),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.audio_transcriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_hash text not null check (char_length(request_hash) = 64),
  provider text not null default 'elevenlabs_scribe_v2',
  provider_request_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  transcript text,
  structured_items jsonb,
  duration_seconds numeric(5,2) check (duration_seconds between 0 and 30),
  error_code text,
  audio_discarded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, request_hash)
);

create index foods_user_id_idx on public.foods(user_id);
create index foods_search_idx on public.foods using gin(to_tsvector('portuguese', name || ' ' || coalesce(preparation, '')));
create index meals_user_eaten_at_idx on public.meals(user_id, eaten_at desc);
create index meal_items_meal_id_idx on public.meal_items(meal_id);
create index meal_templates_user_id_idx on public.meal_templates(user_id);
create index meal_template_items_template_id_idx on public.meal_template_items(template_id);
create index audio_transcriptions_user_created_idx on public.audio_transcriptions(user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger nutrition_goals_set_updated_at before update on public.nutrition_goals for each row execute function private.set_updated_at();
create trigger foods_set_updated_at before update on public.foods for each row execute function private.set_updated_at();
create trigger meals_set_updated_at before update on public.meals for each row execute function private.set_updated_at();
create trigger meal_templates_set_updated_at before update on public.meal_templates for each row execute function private.set_updated_at();
create trigger audio_transcriptions_set_updated_at before update on public.audio_transcriptions for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)));
  insert into public.nutrition_goals (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;
alter table public.audio_transcriptions enable row level security;

revoke all on table public.profiles, public.nutrition_goals, public.foods, public.meals, public.meal_items, public.meal_templates, public.meal_template_items, public.audio_transcriptions from anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.nutrition_goals, public.foods, public.meals, public.meal_items, public.meal_templates, public.meal_template_items, public.audio_transcriptions to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "nutrition_goals_select_own" on public.nutrition_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "nutrition_goals_insert_own" on public.nutrition_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "nutrition_goals_update_own" on public.nutrition_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "nutrition_goals_delete_own" on public.nutrition_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "foods_select_catalog_or_own" on public.foods for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "foods_insert_own_custom" on public.foods for insert to authenticated with check ((select auth.uid()) = user_id and source = 'custom');
create policy "foods_update_own_custom" on public.foods for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and source = 'custom');
create policy "foods_delete_own_custom" on public.foods for delete to authenticated using ((select auth.uid()) = user_id and source = 'custom');

create policy "meals_select_own" on public.meals for select to authenticated using ((select auth.uid()) = user_id);
create policy "meals_insert_own" on public.meals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meals_update_own" on public.meals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meals_delete_own" on public.meals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "meal_items_select_own" on public.meal_items for select to authenticated using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy "meal_items_insert_own" on public.meal_items for insert to authenticated with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy "meal_items_update_own" on public.meal_items for update to authenticated using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy "meal_items_delete_own" on public.meal_items for delete to authenticated using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));

create policy "meal_templates_select_own" on public.meal_templates for select to authenticated using ((select auth.uid()) = user_id);
create policy "meal_templates_insert_own" on public.meal_templates for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meal_templates_update_own" on public.meal_templates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meal_templates_delete_own" on public.meal_templates for delete to authenticated using ((select auth.uid()) = user_id);

create policy "meal_template_items_select_own" on public.meal_template_items for select to authenticated using (exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = (select auth.uid())));
create policy "meal_template_items_insert_own" on public.meal_template_items for insert to authenticated with check (exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = (select auth.uid())));
create policy "meal_template_items_update_own" on public.meal_template_items for update to authenticated using (exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = (select auth.uid()))) with check (exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = (select auth.uid())));
create policy "meal_template_items_delete_own" on public.meal_template_items for delete to authenticated using (exists (select 1 from public.meal_templates t where t.id = template_id and t.user_id = (select auth.uid())));

create policy "audio_transcriptions_select_own" on public.audio_transcriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "audio_transcriptions_insert_own" on public.audio_transcriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "audio_transcriptions_update_own" on public.audio_transcriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "audio_transcriptions_delete_own" on public.audio_transcriptions for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
