-- VERAZ — edição transacional preservando identidade, origem e data de criação da refeição.
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
  v_temporary_meal_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform 1 from public.meals where id = p_meal_id and user_id = v_user_id for update;
  if not found then
    raise exception 'meal_not_found' using errcode = 'P0002';
  end if;

  -- Reutiliza a única fonte de verdade dos cálculos; toda a função permanece na mesma transação.
  v_temporary_meal_id := public.create_meal_with_items(p_name, p_meal_type, p_eaten_at, p_notes, p_items);

  delete from public.meal_items where meal_id = p_meal_id;

  update public.meals original
  set name = temporary.name,
      meal_type = temporary.meal_type,
      eaten_at = temporary.eaten_at,
      notes = temporary.notes,
      calories_total = temporary.calories_total,
      protein_total_g = temporary.protein_total_g,
      carbohydrates_total_g = temporary.carbohydrates_total_g,
      fat_total_g = temporary.fat_total_g
  from public.meals temporary
  where original.id = p_meal_id
    and temporary.id = v_temporary_meal_id
    and original.user_id = v_user_id;

  update public.meal_items
  set meal_id = p_meal_id
  where meal_id = v_temporary_meal_id;

  delete from public.meals where id = v_temporary_meal_id and user_id = v_user_id;
  return p_meal_id;
end;
$$;

revoke all on function public.replace_meal_with_items(uuid, text, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.replace_meal_with_items(uuid, text, text, timestamptz, text, jsonb) to authenticated;
