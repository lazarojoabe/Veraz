import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TACO_API = "https://brolesi.github.io/taco";
const OUTPUT = resolve("supabase/migrations/20261112100000_import_full_taco_catalog.sql");
const CONCURRENCY = 16;

// These catalogue entries already exist in production and can be referenced by
// meal templates. Keeping their IDs avoids breaking those references.
const existingFoodIds = new Map([
  [1, "10000000-0000-4000-8000-000000000002"],
  [3, "10000000-0000-4000-8000-000000000001"],
  [7, "10000000-0000-4000-8000-000000000010"],
  [53, "10000000-0000-4000-8000-000000000007"],
  [88, "10000000-0000-4000-8000-000000000009"],
  [410, "10000000-0000-4000-8000-000000000004"],
  [461, "10000000-0000-4000-8000-000000000008"],
  [488, "10000000-0000-4000-8000-000000000005"],
  [561, "10000000-0000-4000-8000-000000000003"],
]);
const gramsPerUnit = new Map([[488, 50]]);

const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlNumber = (value, field, food) => {
  if (value === null || value === undefined) return "null";
  if (!Number.isFinite(Number(value))) throw new Error(`Valor inválido em ${field} para TACO ${food.id}.`);
  return String(Number(value));
};
const sqlRequiredNumber = (value, field, food) => {
  if (value === null || value === undefined) return "0";
  return sqlNumber(value, field, food);
};

function tacoUuid(foodId) {
  const hash = createHash("sha1").update(`veraz:taco:${foodId}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function fetchJson(path) {
  const response = await fetch(`${TACO_API}${path}`);
  if (!response.ok) throw new Error(`TACO respondeu ${response.status} em ${path}.`);
  return response.json();
}

async function mapWithConcurrency(items, callback) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const current = next++;
      results[current] = await callback(items[current]);
    }
  }));
  return results;
}

const index = await fetchJson("/foods.json");
if (!Array.isArray(index.foods) || index.foods.length !== 597) {
  throw new Error("A fonte TACO não retornou os 597 alimentos esperados.");
}

const foods = await mapWithConcurrency(index.foods, ({ id }) => fetchJson(`/foods/${id}.json`));

const rows = foods.map((food) => {
  const id = existingFoodIds.get(food.id) ?? tacoUuid(food.id);
  const reference = `TACO 4ª edição, NEPA/Unicamp, valores por 100 g, alimento ${food.id}`;
  // A TACO deixa nutrientes sem ocorrência em branco (por exemplo, proteína
  // em óleos). A coluna interna é obrigatória para os cálculos de refeições,
  // então estes casos entram como zero, sem inventar um valor nutricional.
  return `  (${sqlString(id)}, ${sqlString(food.description)}, null, 'taco', ${sqlString(reference)}, 100, 'g', ${sqlRequiredNumber(food.energy_kcal, "energy_kcal", food)}, ${sqlRequiredNumber(food.protein_g, "protein_g", food)}, ${sqlRequiredNumber(food.carbohydrate_g, "carbohydrate_g", food)}, ${sqlRequiredNumber(food.lipids_g, "lipids_g", food)}, ${sqlNumber(food.dietary_fiber_g, "dietary_fiber_g", food)}, ${sqlNumber(food.sodium_mg, "sodium_mg", food)}, ${sqlNumber(gramsPerUnit.get(food.id), "grams_per_unit", food)}, null)`;
});

const schemaSql = [
  "alter table public.foods add column if not exists search_text text not null default '';",
  "",
  "create or replace function private.set_food_search_text()",
  "returns trigger",
  "language plpgsql",
  "set search_path = ''",
  "as $$",
  "begin",
  "  new.search_text := pg_catalog.lower(pg_catalog.translate(",
  "    coalesce(new.name, '') || ' ' || coalesce(new.preparation, ''),",
  "    'áàãâäéèêëíìîïóòõôöúùûüç',",
  "    'aaaaaeeeeiiiiooooouuuuc'",
  "  ));",
  "  return new;",
  "end;",
  "$$;",
  "",
  "drop trigger if exists foods_set_search_text on public.foods;",
  "create trigger foods_set_search_text",
  "before insert or update on public.foods",
  "for each row execute function private.set_food_search_text();",
  "",
  "update public.foods set search_text = '';",
  "",
].join("\n");

const sql = `-- Catálogo brasileiro TACO (4ª edição, NEPA/Unicamp).\n-- Fonte de geração: https://brolesi.github.io/taco (espelho estruturado da TACO).\n-- Os valores nutricionais são por 100 g.\n\ninsert into public.foods (\n  id, name, preparation, source, source_reference, base_quantity, base_unit,\n  calories, protein_g, carbohydrates_g, fat_g, fiber_g, sodium_mg,\n  grams_per_unit, density_g_ml\n)\nvalues\n${rows.join(",\n")}\non conflict (id) do update set\n  name = excluded.name,\n  preparation = excluded.preparation,\n  source = excluded.source,\n  source_reference = excluded.source_reference,\n  base_quantity = excluded.base_quantity,\n  base_unit = excluded.base_unit,\n  calories = excluded.calories,\n  protein_g = excluded.protein_g,\n  carbohydrates_g = excluded.carbohydrates_g,\n  fat_g = excluded.fat_g,\n  fiber_g = excluded.fiber_g,\n  sodium_mg = excluded.sodium_mg,\n  grams_per_unit = excluded.grams_per_unit,\n  density_g_ml = excluded.density_g_ml,\n  is_active = true;\n`;

await mkdir(resolve("supabase/migrations"), { recursive: true });
await writeFile(OUTPUT, `${schemaSql}${sql}`, "utf8");
console.log(`Gerado ${OUTPUT} com ${foods.length} alimentos TACO.`);
