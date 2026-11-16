-- Medida doméstica baseada no rótulo do fabricante: 50 g correspondem a 2 fatias.
-- Isso permite registrar pão de forma por fatia sem estimar uma conversão.
update public.foods
set grams_per_unit = 25
where id = '10000000-0000-4000-8000-000000000011'
  and source = 'verified';
