-- VERAZ — desafios sociais com grupos, rankings e pontuação calculada em servidor.

create table public.challenge_groups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 300),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.challenge_group_members (
  group_id uuid not null references public.challenge_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.challenge_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  metric_type text not null check (metric_type in ('workout_days', 'diet_consistency', 'evolution_checkins')),
  start_date date not null,
  end_date date not null,
  target integer not null check (target between 1 and 365),
  created_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date),
  check (end_date - start_date <= 366)
);

create index challenge_groups_created_by_idx on public.challenge_groups(created_by, created_at desc);
create index challenge_group_members_user_idx on public.challenge_group_members(user_id, joined_at desc);
create index challenges_group_dates_idx on public.challenges(group_id, end_date desc);

create or replace function private.is_challenge_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.challenge_group_members where group_id = p_group_id and user_id = auth.uid());
$$;

revoke all on function private.is_challenge_group_member(uuid) from public, anon;
grant execute on function private.is_challenge_group_member(uuid) to authenticated;

alter table public.challenge_groups enable row level security;
alter table public.challenge_group_members enable row level security;
alter table public.challenges enable row level security;
revoke all on table public.challenge_groups, public.challenge_group_members, public.challenges from anon, authenticated;
grant select, insert, update, delete on table public.challenge_groups, public.challenge_group_members, public.challenges to authenticated;

create policy "challenge_groups_select_members" on public.challenge_groups for select to authenticated using (private.is_challenge_group_member(id));
create policy "challenge_groups_manage_owner" on public.challenge_groups for all to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "challenge_members_select_members" on public.challenge_group_members for select to authenticated using (private.is_challenge_group_member(group_id));
create policy "challenges_select_members" on public.challenges for select to authenticated using (private.is_challenge_group_member(group_id));
create policy "challenges_create_members" on public.challenges for insert to authenticated with check ((select auth.uid()) = created_by and private.is_challenge_group_member(group_id));
create policy "challenges_manage_creator" on public.challenges for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by and private.is_challenge_group_member(group_id));
create policy "challenges_delete_creator" on public.challenges for delete to authenticated using ((select auth.uid()) = created_by);

create or replace function public.create_challenge_group(p_name text, p_description text)
returns public.challenge_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.challenge_groups%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  insert into public.challenge_groups (created_by, name, description)
  values (v_user_id, trim(p_name), nullif(trim(p_description), ''))
  returning * into v_group;
  insert into public.challenge_group_members (group_id, user_id) values (v_group.id, v_user_id);
  return v_group;
end;
$$;

create or replace function public.join_challenge_group_by_code(p_invite_code text)
returns public.challenge_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.challenge_groups%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_group from public.challenge_groups where invite_code = upper(trim(p_invite_code));
  if v_group.id is null then raise exception 'challenge_group_not_found' using errcode = 'P0002'; end if;
  insert into public.challenge_group_members (group_id, user_id) values (v_group.id, v_user_id) on conflict do nothing;
  return v_group;
end;
$$;

create or replace function public.get_challenge_ranking(p_challenge_id uuid)
returns table (member_id uuid, display_name text, score integer, position bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges%rowtype;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  if v_challenge.id is null then raise exception 'challenge_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.challenge_group_members where group_id = v_challenge.group_id and user_id = auth.uid()) then raise exception 'challenge_membership_required' using errcode = '42501'; end if;

  return query
  with member_scores as (
    select cm.user_id,
      case v_challenge.metric_type
        when 'workout_days' then (
          select count(distinct ws.performed_at::date)::integer from public.workout_sessions ws
          where ws.user_id = cm.user_id and ws.status = 'completed' and ws.performed_at::date between v_challenge.start_date and v_challenge.end_date
        )
        when 'diet_consistency' then (
          select count(*)::integer from (
            select m.eaten_at::date from public.meals m
            where m.user_id = cm.user_id and m.eaten_at::date between v_challenge.start_date and v_challenge.end_date
            group by m.eaten_at::date having count(*) >= 3
          ) as consistent_days
        )
        when 'evolution_checkins' then (
          select count(*)::integer from (
            select wl.recorded_at as day from public.weight_logs wl where wl.user_id = cm.user_id and wl.recorded_at between v_challenge.start_date and v_challenge.end_date
            union
            select pp.taken_at as day from public.progress_photos pp where pp.user_id = cm.user_id and pp.taken_at between v_challenge.start_date and v_challenge.end_date
          ) as checkin_days
        )
      end as current_score
    from public.challenge_group_members cm where cm.group_id = v_challenge.group_id
  )
  select ms.user_id, p.display_name, ms.current_score, dense_rank() over (order by ms.current_score desc, p.display_name asc)
  from member_scores ms join public.profiles p on p.id = ms.user_id
  order by ms.current_score desc, p.display_name asc;
end;
$$;

revoke all on function public.create_challenge_group(text, text), public.join_challenge_group_by_code(text), public.get_challenge_ranking(uuid) from public, anon;
grant execute on function public.create_challenge_group(text, text), public.join_challenge_group_by_code(text), public.get_challenge_ranking(uuid) to authenticated;
