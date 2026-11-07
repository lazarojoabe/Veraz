-- VERAZ — edição transacional e métricas mínimas de custo da transcrição.

alter table public.audio_transcriptions
  add column if not exists estimated_cost_usd numeric(10,6) check (estimated_cost_usd >= 0),
  add column if not exists audio_bytes integer check (audio_bytes >= 0);

create or replace function public.replace_meal_with_items(
  p_meal_id uuid,
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
  v_user_id uuid := auth.uid();
  v_new_meal_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from public.meals where id = p_meal_id and user_id = v_user_id;
  if not found then
    raise exception 'meal_not_found' using errcode = 'P0002';
  end if;

  v_new_meal_id := public.create_meal_with_items(p_name, p_meal_type, p_eaten_at, p_notes, p_items);
  return v_new_meal_id;
end;
$$;

revoke all on function public.replace_meal_with_items(uuid, text, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.replace_meal_with_items(uuid, text, text, timestamptz, text, jsonb) to authenticated;
