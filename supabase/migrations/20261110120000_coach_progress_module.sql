-- VERAZ — perfis de coach, prescrições e evolução privada do aluno.

alter table public.profiles
  add column if not exists role text not null default 'athlete' check (role in ('athlete', 'coach')),
  add column if not exists invite_code text;

update public.profiles
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where invite_code is null;

alter table public.profiles alter column invite_code set not null;
create unique index if not exists profiles_invite_code_key on public.profiles(invite_code);

create table public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (coach_id, client_id),
  check (coach_id <> client_id)
);

create index coach_clients_client_idx on public.coach_clients(client_id, created_at desc);

create or replace function private.is_active_coach_for(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.coach_id = auth.uid() and cc.client_id = p_client_id
  );
$$;

revoke all on function private.is_active_coach_for(uuid) from public, anon;
grant execute on function private.is_active_coach_for(uuid) to authenticated;

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 500),
  recorded_at date not null default current_date,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, recorded_at)
);

create index weight_logs_user_date_idx on public.weight_logs(user_id, recorded_at desc);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  label text check (char_length(label) between 1 and 80),
  taken_at date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create index progress_photos_user_date_idx on public.progress_photos(user_id, taken_at desc);

create table public.nutrition_prescriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  calories integer not null check (calories between 0 and 15000),
  protein_g integer not null check (protein_g between 0 and 1000),
  carbohydrates_g integer not null check (carbohydrates_g between 0 and 2000),
  fat_g integer not null check (fat_g between 0 and 1000),
  instructions text check (char_length(instructions) <= 3000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index nutrition_prescriptions_client_idx on public.nutrition_prescriptions(client_id, is_active, created_at desc);
create trigger nutrition_prescriptions_set_updated_at before update on public.nutrition_prescriptions for each row execute function private.set_updated_at();

alter table public.workout_plans add column if not exists coach_id uuid references public.profiles(id) on delete set null;
create index if not exists workout_plans_coach_client_idx on public.workout_plans(coach_id, user_id, updated_at desc) where coach_id is not null;

alter table public.coach_clients enable row level security;
alter table public.weight_logs enable row level security;
alter table public.progress_photos enable row level security;
alter table public.nutrition_prescriptions enable row level security;

revoke all on table public.coach_clients, public.weight_logs, public.progress_photos, public.nutrition_prescriptions from anon, authenticated;
grant select, insert, update, delete on table public.coach_clients, public.weight_logs, public.progress_photos, public.nutrition_prescriptions to authenticated;

create policy "profiles_select_coach_clients" on public.profiles for select to authenticated using (private.is_active_coach_for(id));

create policy "coach_clients_select_participants" on public.coach_clients for select to authenticated using ((select auth.uid()) = coach_id or (select auth.uid()) = client_id);
create policy "coach_clients_delete_coach" on public.coach_clients for delete to authenticated using ((select auth.uid()) = coach_id);

create policy "weight_logs_select_own_or_coach" on public.weight_logs for select to authenticated using ((select auth.uid()) = user_id or private.is_active_coach_for(user_id));
create policy "weight_logs_insert_own" on public.weight_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weight_logs_update_own" on public.weight_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_logs_delete_own" on public.weight_logs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "progress_photos_select_own_or_coach" on public.progress_photos for select to authenticated using ((select auth.uid()) = user_id or private.is_active_coach_for(user_id));
create policy "progress_photos_insert_own" on public.progress_photos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_photos_update_own" on public.progress_photos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress_photos_delete_own" on public.progress_photos for delete to authenticated using ((select auth.uid()) = user_id);

create policy "nutrition_prescriptions_select_participants" on public.nutrition_prescriptions for select to authenticated using ((select auth.uid()) = client_id or (select auth.uid()) = coach_id);
create policy "nutrition_prescriptions_manage_coach" on public.nutrition_prescriptions for all to authenticated using ((select auth.uid()) = coach_id and private.is_active_coach_for(client_id)) with check ((select auth.uid()) = coach_id and private.is_active_coach_for(client_id));

-- Coaches can inspect, but never alter, training records from linked clients.
create policy "workout_sessions_select_coach" on public.workout_sessions for select to authenticated using (private.is_active_coach_for(user_id));
create policy "workout_session_exercises_select_coach" on public.workout_session_exercises for select to authenticated using (exists (select 1 from public.workout_sessions s where s.id = session_id and private.is_active_coach_for(s.user_id)));
create policy "workout_sets_select_coach" on public.workout_sets for select to authenticated using (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and private.is_active_coach_for(s.user_id)));

-- A coach owns assigned plans; an athlete may still read and use them, but cannot alter them.
drop policy if exists "workout_plans_select_own" on public.workout_plans;
drop policy if exists "workout_plans_insert_own" on public.workout_plans;
drop policy if exists "workout_plans_update_own" on public.workout_plans;
drop policy if exists "workout_plans_delete_own" on public.workout_plans;
create policy "workout_plans_select_participant" on public.workout_plans for select to authenticated using ((select auth.uid()) = user_id or (select auth.uid()) = coach_id);
create policy "workout_plans_insert_personal" on public.workout_plans for insert to authenticated with check ((select auth.uid()) = user_id and coach_id is null);
create policy "workout_plans_update_manager" on public.workout_plans for update to authenticated using (((select auth.uid()) = user_id and coach_id is null) or ((select auth.uid()) = coach_id and private.is_active_coach_for(user_id))) with check (((select auth.uid()) = user_id and coach_id is null) or ((select auth.uid()) = coach_id and private.is_active_coach_for(user_id)));
create policy "workout_plans_delete_manager" on public.workout_plans for delete to authenticated using (((select auth.uid()) = user_id and coach_id is null) or ((select auth.uid()) = coach_id and private.is_active_coach_for(user_id)));

drop policy if exists "workout_plan_exercises_select_own" on public.workout_plan_exercises;
drop policy if exists "workout_plan_exercises_insert_own" on public.workout_plan_exercises;
drop policy if exists "workout_plan_exercises_update_own" on public.workout_plan_exercises;
drop policy if exists "workout_plan_exercises_delete_own" on public.workout_plan_exercises;
create policy "workout_plan_exercises_select_participant" on public.workout_plan_exercises for select to authenticated using (exists (select 1 from public.workout_plans p where p.id = plan_id and ((select auth.uid()) = p.user_id or (select auth.uid()) = p.coach_id)));
create policy "workout_plan_exercises_manage_owner" on public.workout_plan_exercises for all to authenticated using (exists (select 1 from public.workout_plans p where p.id = plan_id and (((select auth.uid()) = p.user_id and p.coach_id is null) or ((select auth.uid()) = p.coach_id and private.is_active_coach_for(p.user_id)))) ) with check (exists (select 1 from public.workout_plans p where p.id = plan_id and (((select auth.uid()) = p.user_id and p.coach_id is null) or ((select auth.uid()) = p.coach_id and private.is_active_coach_for(p.user_id)))) );

create policy "exercises_select_linked_coach" on public.exercises for select to authenticated using (user_id is not null and private.is_active_coach_for(user_id));

create or replace function public.connect_coach_by_invite(p_invite_code text)
returns public.coach_clients
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach_id uuid := auth.uid();
  v_client_id uuid;
  v_connection public.coach_clients%rowtype;
begin
  if v_coach_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_coach_id and role = 'coach') then raise exception 'coach_role_required' using errcode = '42501'; end if;
  select id into v_client_id from public.profiles where invite_code = upper(trim(p_invite_code)) and id <> v_coach_id;
  if v_client_id is null then raise exception 'invite_code_not_found' using errcode = 'P0002'; end if;
  insert into public.coach_clients (coach_id, client_id) values (v_coach_id, v_client_id)
  on conflict (coach_id, client_id) do update set coach_id = excluded.coach_id
  returning * into v_connection;
  return v_connection;
end;
$$;

create or replace function public.create_coach_workout_plan_with_exercises(
  p_client_id uuid,
  p_name text,
  p_description text,
  p_exercises jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach_id uuid := auth.uid();
  v_plan_id uuid;
  v_item jsonb;
  v_exercise public.exercises%rowtype;
  v_position smallint := 0;
begin
  if v_coach_id is null or not exists (select 1 from public.profiles where id = v_coach_id and role = 'coach') then raise exception 'coach_role_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.coach_clients where coach_id = v_coach_id and client_id = p_client_id) then raise exception 'client_access_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) not between 1 and 40 then raise exception 'invalid_plan_exercises' using errcode = '22023'; end if;
  insert into public.workout_plans (user_id, coach_id, name, description) values (p_client_id, v_coach_id, trim(p_name), nullif(trim(p_description), '')) returning id into v_plan_id;
  for v_item in select value from jsonb_array_elements(p_exercises) loop
    select * into strict v_exercise from public.exercises where id = (v_item ->> 'exerciseId')::uuid and is_active and (user_id is null or user_id = v_coach_id);
    insert into public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds)
    values (v_plan_id, v_exercise.id, v_position, (v_item ->> 'targetSets')::smallint, (v_item ->> 'targetReps')::smallint, coalesce((v_item ->> 'restSeconds')::smallint, 90));
    v_position := v_position + 1;
  end loop;
  return v_plan_id;
end;
$$;

revoke all on function public.connect_coach_by_invite(text) from public, anon;
revoke all on function public.create_coach_workout_plan_with_exercises(uuid, text, text, jsonb) from public, anon;
grant execute on function public.connect_coach_by_invite(text), public.create_coach_workout_plan_with_exercises(uuid, text, text, jsonb) to authenticated;

insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do update set public = false;
create policy "progress_photos_storage_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress_photos_storage_select_participants" on storage.objects for select to authenticated using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or exists (select 1 from public.progress_photos pp where pp.storage_path = name and private.is_active_coach_for(pp.user_id))));
create policy "progress_photos_storage_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
