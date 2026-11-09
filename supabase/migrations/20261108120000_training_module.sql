-- VERAZ — domínio de treinos, fichas, séries e progresso.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  muscle_group text not null check (muscle_group in ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'glutes', 'full_body', 'cardio')),
  equipment text check (char_length(equipment) <= 80),
  tracking_type text not null default 'weight_reps' check (tracking_type in ('weight_reps', 'bodyweight_reps')),
  source text not null default 'custom' check (source in ('catalog', 'custom')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exercises_source_owner_check check (
    (source = 'catalog' and user_id is null) or
    (source = 'custom' and user_id is not null)
  )
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text check (char_length(description) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position smallint not null check (position >= 0),
  target_sets smallint not null check (target_sets between 1 and 20),
  target_reps smallint not null check (target_reps between 1 and 1000),
  rest_seconds smallint check (rest_seconds between 0 and 3600),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, exercise_id),
  unique (plan_id, position)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  status text not null default 'completed' check (status in ('draft', 'completed', 'cancelled')),
  performed_at timestamptz not null default timezone('utc', now()),
  notes text check (char_length(notes) <= 1000),
  volume_kg numeric(14,3) not null default 0 check (volume_kg >= 0),
  sets_count integer not null default 0 check (sets_count >= 0),
  reps_count integer not null default 0 check (reps_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  position smallint not null check (position >= 0),
  exercise_name text not null,
  muscle_group text not null,
  equipment text,
  tracking_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, position)
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 100),
  weight_kg numeric(9,3) not null default 0 check (weight_kg between 0 and 2000),
  reps integer not null check (reps between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_exercise_id, set_number)
);

create index exercises_user_name_idx on public.exercises(user_id, name);
create index workout_plans_user_updated_idx on public.workout_plans(user_id, updated_at desc);
create index workout_plan_exercises_plan_idx on public.workout_plan_exercises(plan_id, position);
create index workout_sessions_user_date_idx on public.workout_sessions(user_id, performed_at desc);
create index workout_session_exercises_session_idx on public.workout_session_exercises(session_id, position);
create index workout_sets_session_exercise_idx on public.workout_sets(session_exercise_id, set_number);

create trigger exercises_set_updated_at before update on public.exercises for each row execute function private.set_updated_at();
create trigger workout_plans_set_updated_at before update on public.workout_plans for each row execute function private.set_updated_at();
create trigger workout_sessions_set_updated_at before update on public.workout_sessions for each row execute function private.set_updated_at();

alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets enable row level security;

revoke all on table public.exercises, public.workout_plans, public.workout_plan_exercises, public.workout_sessions, public.workout_session_exercises, public.workout_sets from anon, authenticated;
grant select, insert, update, delete on table public.exercises, public.workout_plans, public.workout_plan_exercises, public.workout_sessions, public.workout_session_exercises, public.workout_sets to authenticated;

create policy "exercises_select_catalog_or_own" on public.exercises for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "exercises_insert_own" on public.exercises for insert to authenticated with check ((select auth.uid()) = user_id and source = 'custom');
create policy "exercises_update_own" on public.exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and source = 'custom');
create policy "exercises_delete_own" on public.exercises for delete to authenticated using ((select auth.uid()) = user_id and source = 'custom');

create policy "workout_plans_select_own" on public.workout_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_plans_insert_own" on public.workout_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_plans_update_own" on public.workout_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_plans_delete_own" on public.workout_plans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "workout_plan_exercises_select_own" on public.workout_plan_exercises for select to authenticated using (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "workout_plan_exercises_insert_own" on public.workout_plan_exercises for insert to authenticated with check (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "workout_plan_exercises_update_own" on public.workout_plan_exercises for update to authenticated using (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "workout_plan_exercises_delete_own" on public.workout_plan_exercises for delete to authenticated using (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));

create policy "workout_sessions_select_own" on public.workout_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_sessions_insert_own" on public.workout_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_sessions_update_own" on public.workout_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_sessions_delete_own" on public.workout_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "workout_session_exercises_select_own" on public.workout_session_exercises for select to authenticated using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "workout_session_exercises_insert_own" on public.workout_session_exercises for insert to authenticated with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "workout_session_exercises_update_own" on public.workout_session_exercises for update to authenticated using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))) with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "workout_session_exercises_delete_own" on public.workout_session_exercises for delete to authenticated using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

create policy "workout_sets_select_own" on public.workout_sets for select to authenticated using (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.user_id = (select auth.uid())));
create policy "workout_sets_insert_own" on public.workout_sets for insert to authenticated with check (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.user_id = (select auth.uid())));
create policy "workout_sets_update_own" on public.workout_sets for update to authenticated using (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.user_id = (select auth.uid()))) with check (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.user_id = (select auth.uid())));
create policy "workout_sets_delete_own" on public.workout_sets for delete to authenticated using (exists (select 1 from public.workout_session_exercises se join public.workout_sessions s on s.id = se.session_id where se.id = session_exercise_id and s.user_id = (select auth.uid())));

insert into public.exercises (id, name, muscle_group, equipment, tracking_type, source)
values
  ('20000000-0000-4000-8000-000000000001', 'Supino reto', 'chest', 'Barra', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000002', 'Supino inclinado com halteres', 'chest', 'Halteres', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000003', 'Puxada frontal', 'back', 'Polia', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000004', 'Remada baixa', 'back', 'Polia', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000005', 'Agachamento livre', 'legs', 'Barra', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000006', 'Leg press 45°', 'legs', 'Máquina', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000007', 'Cadeira extensora', 'legs', 'Máquina', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000008', 'Levantamento terra romeno', 'glutes', 'Barra', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000009', 'Desenvolvimento com halteres', 'shoulders', 'Halteres', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000010', 'Elevação lateral', 'shoulders', 'Halteres', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000011', 'Rosca direta', 'arms', 'Barra', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000012', 'Tríceps na polia', 'arms', 'Polia', 'weight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000013', 'Prancha', 'core', 'Peso corporal', 'bodyweight_reps', 'catalog'),
  ('20000000-0000-4000-8000-000000000014', 'Flexão de braços', 'chest', 'Peso corporal', 'bodyweight_reps', 'catalog')
on conflict (id) do update set name = excluded.name, muscle_group = excluded.muscle_group, equipment = excluded.equipment, tracking_type = excluded.tracking_type, is_active = true;

create or replace function public.create_workout_plan_with_exercises(
  p_name text,
  p_description text,
  p_exercises jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_item jsonb;
  v_exercise public.exercises%rowtype;
  v_position smallint := 0;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) not between 1 and 40 then
    raise exception 'invalid_plan_exercises' using errcode = '22023';
  end if;

  insert into public.workout_plans (user_id, name, description)
  values (v_user_id, trim(p_name), nullif(trim(p_description), ''))
  returning id into v_plan_id;

  for v_item in select value from jsonb_array_elements(p_exercises)
  loop
    select * into strict v_exercise from public.exercises
    where id = (v_item ->> 'exerciseId')::uuid and is_active and (user_id is null or user_id = v_user_id);

    insert into public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds)
    values (
      v_plan_id,
      v_exercise.id,
      v_position,
      (v_item ->> 'targetSets')::smallint,
      (v_item ->> 'targetReps')::smallint,
      coalesce((v_item ->> 'restSeconds')::smallint, 90)
    );
    v_position := v_position + 1;
  end loop;

  return v_plan_id;
end;
$$;

create or replace function public.create_workout_session_with_sets(
  p_plan_id uuid,
  p_name text,
  p_performed_at timestamptz,
  p_notes text,
  p_exercises jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_session_exercise_id uuid;
  v_exercise_item jsonb;
  v_set_item jsonb;
  v_exercise public.exercises%rowtype;
  v_exercise_position smallint := 0;
  v_set_number smallint;
  v_weight numeric;
  v_reps integer;
  v_volume numeric := 0;
  v_sets_count integer := 0;
  v_reps_count integer := 0;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_plan_id is not null and not exists (select 1 from public.workout_plans where id = p_plan_id and user_id = v_user_id) then
    raise exception 'invalid_workout_plan' using errcode = '42501';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) not between 1 and 40 then
    raise exception 'invalid_session_exercises' using errcode = '22023';
  end if;

  insert into public.workout_sessions (user_id, plan_id, name, status, performed_at, notes)
  values (v_user_id, p_plan_id, trim(p_name), 'completed', coalesce(p_performed_at, timezone('utc', now())), nullif(trim(p_notes), ''))
  returning id into v_session_id;

  for v_exercise_item in select value from jsonb_array_elements(p_exercises)
  loop
    select * into strict v_exercise from public.exercises
    where id = (v_exercise_item ->> 'exerciseId')::uuid and is_active and (user_id is null or user_id = v_user_id);

    insert into public.workout_session_exercises (session_id, exercise_id, position, exercise_name, muscle_group, equipment, tracking_type)
    values (v_session_id, v_exercise.id, v_exercise_position, v_exercise.name, v_exercise.muscle_group, v_exercise.equipment, v_exercise.tracking_type)
    returning id into v_session_exercise_id;

    v_set_number := 1;
    if jsonb_typeof(v_exercise_item -> 'sets') <> 'array' or jsonb_array_length(v_exercise_item -> 'sets') not between 1 and 100 then
      raise exception 'invalid_workout_sets' using errcode = '22023';
    end if;

    for v_set_item in select value from jsonb_array_elements(v_exercise_item -> 'sets')
    loop
      v_weight := (v_set_item ->> 'weightKg')::numeric;
      v_reps := (v_set_item ->> 'reps')::integer;
      if v_weight < 0 or v_weight > 2000 or v_reps < 1 or v_reps > 1000 then
        raise exception 'invalid_set_values' using errcode = '22023';
      end if;

      insert into public.workout_sets (session_exercise_id, set_number, weight_kg, reps)
      values (v_session_exercise_id, v_set_number, v_weight, v_reps);
      v_volume := v_volume + (v_weight * v_reps);
      v_sets_count := v_sets_count + 1;
      v_reps_count := v_reps_count + v_reps;
      v_set_number := v_set_number + 1;
    end loop;
    v_exercise_position := v_exercise_position + 1;
  end loop;

  update public.workout_sessions
  set volume_kg = round(v_volume, 3), sets_count = v_sets_count, reps_count = v_reps_count
  where id = v_session_id;

  return v_session_id;
end;
$$;

revoke all on function public.create_workout_plan_with_exercises(text, text, jsonb) from public, anon;
revoke all on function public.create_workout_session_with_sets(uuid, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.create_workout_plan_with_exercises(text, text, jsonb) to authenticated;
grant execute on function public.create_workout_session_with_sets(uuid, text, timestamptz, text, jsonb) to authenticated;

