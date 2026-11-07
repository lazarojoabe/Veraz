-- VERAZ — catálogo nutricional inicial e criação transacional de refeições.

insert into public.foods (
  id, name, preparation, source, source_reference, base_quantity, base_unit,
  calories, protein_g, carbohydrates_g, fat_g, fiber_g, sodium_mg,
  grams_per_unit, density_g_ml
)
values
  ('10000000-0000-4000-8000-000000000001', 'Arroz tipo 1', 'cozido', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 3', 100, 'g', 128, 2.5, 28.1, 0.2, 1.6, 1, null, null),
  ('10000000-0000-4000-8000-000000000002', 'Arroz integral', 'cozido', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 1', 100, 'g', 124, 2.6, 25.8, 1.0, 2.7, 1, null, null),
  ('10000000-0000-4000-8000-000000000003', 'Feijão carioca', 'cozido', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 561', 100, 'g', 76, 4.8, 13.6, 0.5, 8.5, 2, null, null),
  ('10000000-0000-4000-8000-000000000004', 'Peito de frango sem pele', 'grelhado', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 410', 100, 'g', 159, 32, 0, 2.5, null, 50, null, null),
  ('10000000-0000-4000-8000-000000000005', 'Ovo de galinha inteiro', 'cozido por 10 minutos', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 488', 100, 'g', 146, 13.3, 0.6, 9.5, null, 146, 50, null),
  ('10000000-0000-4000-8000-000000000006', 'Banana in natura', 'média de diferentes variedades', 'tbca', 'TBCA, código BRC0006C, valores por 100 g', 100, 'g', 109, 1.27, 26.7, 0.19, 2.24, 0, 65, null),
  ('10000000-0000-4000-8000-000000000007', 'Pão de trigo francês', null, 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 53', 100, 'g', 300, 8, 58.6, 3.1, 2.3, 648, null, null),
  ('10000000-0000-4000-8000-000000000008', 'Queijo minas frescal', null, 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 461', 100, 'g', 264, 17.4, 3.2, 20.2, null, 31, null, null),
  ('10000000-0000-4000-8000-000000000009', 'Batata-doce', 'cozida', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 88', 100, 'g', 77, 0.6, 18.4, 0.1, 2.2, 3, null, null),
  ('10000000-0000-4000-8000-000000000010', 'Aveia em flocos', 'crua', 'taco', 'TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento 7', 100, 'g', 394, 13.9, 66.6, 8.5, 9.1, 5, null, null)
on conflict (id) do update set
  name = excluded.name,
  preparation = excluded.preparation,
  source = excluded.source,
  source_reference = excluded.source_reference,
  base_quantity = excluded.base_quantity,
  base_unit = excluded.base_unit,
  calories = excluded.calories,
  protein_g = excluded.protein_g,
  carbohydrates_g = excluded.carbohydrates_g,
  fat_g = excluded.fat_g,
  fiber_g = excluded.fiber_g,
  sodium_mg = excluded.sodium_mg,
  grams_per_unit = excluded.grams_per_unit,
  density_g_ml = excluded.density_g_ml,
  is_active = true;

create or replace function public.create_meal_with_items(
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
  v_meal_id uuid;
  v_item jsonb;
  v_food public.foods%rowtype;
  v_quantity numeric;
  v_unit text;
  v_base_amount numeric;
  v_factor numeric;
  v_grams numeric;
  v_calories numeric := 0;
  v_protein numeric := 0;
  v_carbohydrates numeric := 0;
  v_fat numeric := 0;
  v_position smallint := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_meal_items' using errcode = '22023';
  end if;

  insert into public.meals (user_id, name, meal_type, source, eaten_at, notes)
  values (v_user_id, trim(p_name), p_meal_type, 'manual', coalesce(p_eaten_at, timezone('utc', now())), nullif(trim(p_notes), ''))
  returning id into v_meal_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit := v_item ->> 'unit';

    if v_quantity <= 0 or v_unit not in ('g', 'ml', 'unit', 'portion') then
      raise exception 'invalid_item_quantity_or_unit' using errcode = '22023';
    end if;

    select * into strict v_food
    from public.foods
    where id = (v_item ->> 'foodId')::uuid
      and is_active
      and (user_id is null or user_id = v_user_id);

    if v_unit = v_food.base_unit then
      v_base_amount := v_quantity;
    elsif v_food.base_unit = 'g' and v_unit in ('unit', 'portion') and v_food.grams_per_unit is not null then
      v_base_amount := v_quantity * v_food.grams_per_unit;
    elsif v_food.base_unit = 'g' and v_unit = 'ml' and v_food.density_g_ml is not null then
      v_base_amount := v_quantity * v_food.density_g_ml;
    elsif v_food.base_unit = 'ml' and v_unit = 'g' and v_food.density_g_ml is not null then
      v_base_amount := v_quantity / v_food.density_g_ml;
    elsif v_food.base_unit = 'ml' and v_unit in ('unit', 'portion') and v_food.grams_per_unit is not null and v_food.density_g_ml is not null then
      v_base_amount := (v_quantity * v_food.grams_per_unit) / v_food.density_g_ml;
    elsif v_food.base_unit in ('unit', 'portion') and v_unit = 'g' and v_food.grams_per_unit is not null then
      v_base_amount := v_quantity / v_food.grams_per_unit;
    else
      raise exception 'unsupported_unit_conversion' using errcode = '22023';
    end if;

    v_grams := case
      when v_unit = 'g' then v_quantity
      when v_unit = 'ml' and v_food.density_g_ml is not null then v_quantity * v_food.density_g_ml
      when v_unit in ('unit', 'portion') and v_food.grams_per_unit is not null then v_quantity * v_food.grams_per_unit
      else null
    end;
    v_factor := v_base_amount / v_food.base_quantity;

    insert into public.meal_items (
      meal_id, food_id, position, quantity, unit, converted_grams,
      food_name, preparation, source, source_reference,
      calories, protein_g, carbohydrates_g, fat_g, fiber_g, sodium_mg
    )
    values (
      v_meal_id, v_food.id, v_position, v_quantity, v_unit, v_grams,
      v_food.name, v_food.preparation, v_food.source, v_food.source_reference,
      round(v_food.calories * v_factor, 3),
      round(v_food.protein_g * v_factor, 3),
      round(v_food.carbohydrates_g * v_factor, 3),
      round(v_food.fat_g * v_factor, 3),
      case when v_food.fiber_g is null then null else round(v_food.fiber_g * v_factor, 3) end,
      case when v_food.sodium_mg is null then null else round(v_food.sodium_mg * v_factor, 3) end
    );

    v_calories := v_calories + (v_food.calories * v_factor);
    v_protein := v_protein + (v_food.protein_g * v_factor);
    v_carbohydrates := v_carbohydrates + (v_food.carbohydrates_g * v_factor);
    v_fat := v_fat + (v_food.fat_g * v_factor);
    v_position := v_position + 1;
  end loop;

  update public.meals
  set calories_total = round(v_calories, 3),
      protein_total_g = round(v_protein, 3),
      carbohydrates_total_g = round(v_carbohydrates, 3),
      fat_total_g = round(v_fat, 3)
  where id = v_meal_id;

  return v_meal_id;
end;
$$;

revoke all on function public.create_meal_with_items(text, text, timestamptz, text, jsonb) from public, anon;
grant execute on function public.create_meal_with_items(text, text, timestamptz, text, jsonb) to authenticated;
