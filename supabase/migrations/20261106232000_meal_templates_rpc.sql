-- VERAZ — criação e uso transacional de modelos de refeições.
create or replace function public.create_meal_template_with_items(
  p_name text,
  p_description text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template_id uuid;
  v_item jsonb;
  v_position smallint := 0;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_template_items' using errcode = '22023';
  end if;

  insert into public.meal_templates (user_id, name, description)
  values (v_user_id, trim(p_name), nullif(trim(p_description), ''))
  returning id into v_template_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if not exists (
      select 1 from public.foods
      where id = (v_item ->> 'foodId')::uuid and is_active and (user_id is null or user_id = v_user_id)
    ) then raise exception 'food_not_found' using errcode = 'P0002'; end if;

    insert into public.meal_template_items (template_id, food_id, position, quantity, unit)
    values (v_template_id, (v_item ->> 'foodId')::uuid, v_position, (v_item ->> 'quantity')::numeric, v_item ->> 'unit');
    v_position := v_position + 1;
  end loop;
  return v_template_id;
end;
$$;

create or replace function public.create_meal_from_template(p_template_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.meal_templates%rowtype;
  v_items jsonb;
  v_meal_id uuid;
begin
  select * into strict v_template from public.meal_templates where id = p_template_id and user_id = v_user_id;
  select jsonb_agg(jsonb_build_object('foodId', food_id, 'quantity', quantity, 'unit', unit) order by position)
  into v_items from public.meal_template_items where template_id = p_template_id;
  v_meal_id := public.create_meal_with_items(v_template.name, 'other', timezone('utc', now()), v_template.description, v_items);
  update public.meals set source = 'template' where id = v_meal_id and user_id = v_user_id;
  return v_meal_id;
end;
$$;

revoke all on function public.create_meal_template_with_items(text, text, jsonb) from public, anon;
revoke all on function public.create_meal_from_template(uuid) from public, anon;
grant execute on function public.create_meal_template_with_items(text, text, jsonb) to authenticated;
grant execute on function public.create_meal_from_template(uuid) to authenticated;
