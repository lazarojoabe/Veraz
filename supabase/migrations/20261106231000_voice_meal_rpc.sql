-- VERAZ — preserva a origem por voz sem duplicar a lógica nutricional.
create or replace function public.create_voice_meal_with_items(
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
  update public.meals set source = 'voice' where id = v_meal_id and user_id = auth.uid();
  return v_meal_id;
end;
$$;

revoke all on function public.create_voice_meal_with_items(text, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.create_voice_meal_with_items(text, text, timestamptz, text, jsonb) to authenticated;
