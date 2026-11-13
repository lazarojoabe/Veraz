-- Catálogo expansível: cada item preserva a procedência e o nível de revisão.

alter table public.foods
  add column if not exists brand text check (char_length(brand) between 1 and 120),
  add column if not exists barcode text check (barcode ~ '^[0-9]{8,14}$'),
  add column if not exists source_url text check (char_length(source_url) <= 500),
  add column if not exists review_status text not null default 'user' check (review_status in ('official', 'reviewed', 'user')),
  add column if not exists reviewed_at timestamptz;

alter table public.foods drop constraint if exists foods_source_check;
alter table public.foods add constraint foods_source_check check (
  source in ('taco', 'tbca', 'verified', 'open_food_facts', 'custom')
);

alter table public.foods drop constraint if exists foods_source_owner_check;
alter table public.foods add constraint foods_source_owner_check check (
  (source in ('custom', 'open_food_facts') and user_id is not null) or
  (source in ('taco', 'tbca', 'verified') and user_id is null)
);

update public.foods
set review_status = 'official',
    reviewed_at = coalesce(reviewed_at, created_at)
where source in ('taco', 'tbca');

drop policy if exists "foods_insert_own_custom" on public.foods;
create policy "foods_insert_own_personal" on public.foods for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and source in ('custom', 'open_food_facts')
  and review_status = 'user'
);

drop policy if exists "foods_update_own_custom" on public.foods;
create policy "foods_update_own_personal" on public.foods for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and source in ('custom', 'open_food_facts')
  and review_status = 'user'
);

create unique index if not exists foods_personal_barcode_idx
  on public.foods(user_id, barcode)
  where barcode is not null;

create table public.food_catalog_suggestions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_url text check (char_length(source_url) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text check (char_length(reviewer_notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  unique (food_id, user_id)
);

create index food_catalog_suggestions_status_idx on public.food_catalog_suggestions(status, created_at);
alter table public.food_catalog_suggestions enable row level security;
revoke all on table public.food_catalog_suggestions from anon, authenticated;
grant select, insert on table public.food_catalog_suggestions to authenticated;
create policy "food_catalog_suggestions_select_own" on public.food_catalog_suggestions for select to authenticated
using ((select auth.uid()) = user_id);
create policy "food_catalog_suggestions_insert_own" on public.food_catalog_suggestions for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Item prioritário ausente da TACO. Valores do rótulo oficial do fabricante,
-- porção de 50 g convertida para 100 g para manter o padrão do catálogo.
insert into public.foods (
  id, name, preparation, source, source_reference, source_url, brand,
  review_status, reviewed_at, base_quantity, base_unit,
  calories, protein_g, carbohydrates_g, fat_g, fiber_g, sodium_mg
)
values (
  '10000000-0000-4000-8000-000000000011',
  'Pão de forma tradicional',
  null,
  'verified',
  'Bauducco Pão Tradicional: tabela nutricional do fabricante, porção de 50 g convertida para 100 g.',
  'https://atendimento.bauducco.com.br/hc/pt-br/articles/1260804720969-P%C3%A3o-Tradicional',
  'Bauducco',
  'reviewed',
  timezone('utc', now()),
  100,
  'g',
  250,
  8.6,
  44,
  4.4,
  2,
  416
)
on conflict (id) do update set
  name = excluded.name,
  preparation = excluded.preparation,
  source = excluded.source,
  source_reference = excluded.source_reference,
  source_url = excluded.source_url,
  brand = excluded.brand,
  review_status = excluded.review_status,
  reviewed_at = excluded.reviewed_at,
  base_quantity = excluded.base_quantity,
  base_unit = excluded.base_unit,
  calories = excluded.calories,
  protein_g = excluded.protein_g,
  carbohydrates_g = excluded.carbohydrates_g,
  fat_g = excluded.fat_g,
  fiber_g = excluded.fiber_g,
  sodium_mg = excluded.sodium_mg,
  is_active = true;
