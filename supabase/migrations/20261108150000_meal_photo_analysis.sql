-- VERAZ — análise assistida de refeições por foto, sem persistir a imagem original.

alter table public.meals drop constraint if exists meals_source_check;
alter table public.meals add constraint meals_source_check check (source in ('manual', 'voice', 'template', 'photo'));

create table public.meal_photo_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  status text not null default 'completed' check (status in ('completed', 'confirmed', 'discarded')),
  model text not null,
  provider_request_id text,
  image_sha256 text not null check (length(image_sha256) = 64),
  image_mime_type text not null check (image_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  image_bytes integer not null check (image_bytes > 0 and image_bytes <= 10485760),
  plate_diameter_cm numeric(5,2) check (plate_diameter_cm between 10 and 60),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  raw_analysis jsonb not null,
  predicted_items jsonb not null default '[]'::jsonb,
  confirmed_items jsonb,
  measurement_method text check (measurement_method in ('visual_review', 'weighed')),
  review_duration_ms integer check (review_duration_ms >= 0),
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meal_photo_confirmation_consistency check (
    (status = 'completed' and confirmed_items is null and confirmed_at is null) or
    (status = 'confirmed' and confirmed_items is not null and confirmed_at is not null and meal_id is not null) or
    status = 'discarded'
  )
);

create index meal_photo_analyses_user_created_idx on public.meal_photo_analyses(user_id, created_at desc);
create index meal_photo_analyses_meal_idx on public.meal_photo_analyses(meal_id) where meal_id is not null;
create trigger meal_photo_analyses_set_updated_at before update on public.meal_photo_analyses for each row execute function private.set_updated_at();

alter table public.meal_photo_analyses enable row level security;
revoke all on table public.meal_photo_analyses from anon, authenticated;
grant select, insert, update, delete on table public.meal_photo_analyses to authenticated;
create policy "meal_photo_analyses_select_own" on public.meal_photo_analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy "meal_photo_analyses_insert_own" on public.meal_photo_analyses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meal_photo_analyses_update_own" on public.meal_photo_analyses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meal_photo_analyses_delete_own" on public.meal_photo_analyses for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.create_photo_meal_with_items(
  p_name text,
  p_meal_type text,
  p_eaten_at timestamptz,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meal_id uuid;
begin
  v_meal_id := public.create_meal_with_items(p_name, p_meal_type, p_eaten_at, p_notes, p_items);
  update public.meals set source = 'photo' where id = v_meal_id and user_id = auth.uid();
  return v_meal_id;
end;
$$;

revoke all on function public.create_photo_meal_with_items(text, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.create_photo_meal_with_items(text, text, timestamptz, text, jsonb) to authenticated;

