begin;
select plan(13);

select has_table('public', 'foods', 'foods exists');
select has_table('public', 'meals', 'meals exists');
select has_table('public', 'meal_items', 'meal_items exists');
select has_table('public', 'nutrition_goals', 'nutrition_goals exists');
select has_table('public', 'audio_transcriptions', 'audio audit exists');

select ok((select relrowsecurity from pg_class where oid = 'public.foods'::regclass), 'foods has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.meals'::regclass), 'meals has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.meal_items'::regclass), 'meal_items has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.nutrition_goals'::regclass), 'goals has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.audio_transcriptions'::regclass), 'audio audit has RLS enabled');

select has_function('public', 'create_meal_with_items', array['text', 'text', 'timestamp with time zone', 'text', 'jsonb'], 'transactional meal RPC exists');
select has_function('public', 'create_meal_from_template', array['uuid'], 'template RPC exists');
select has_function('public', 'replace_meal_with_items', array['uuid', 'text', 'text', 'timestamp with time zone', 'text', 'jsonb'], 'meal editing RPC exists');

select * from finish();
rollback;
