import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const newline = String.fromCharCode(10);
const catalogMigration = resolve("supabase/migrations/20261112100000_import_full_taco_catalog.sql");
const output = resolve("supabase/migrations/20261113110000_format_taco_food_names.sql");

const specificNames = new Map([
  ["Pão, aveia, forma", "Pão de forma com aveia"],
  ["Pão, glúten, forma", "Pão de forma com glúten"],
  ["Pão, milho, forma", "Pão de forma de milho"],
  ["Pão, trigo, forma, integral", "Pão de forma integral"],
  ["Pão, trigo, francês", "Pão francês"],
  ["Pão, trigo, sovado", "Pão sovado"],
]);

const sqlString = (value) => "'" + value.replaceAll("'", "''") + "'";

export function formatTacoDisplayName(description) {
  const specific = specificNames.get(description);
  if (specific) return specific;

  const words = description
    .split(",")
    .map((part) => part.trim())
    .join(" ")
    .replaceAll("/", " por ")
    .split(" ")
    .filter(Boolean);

  return words.flatMap((word) => {
    for (const unit of ["minutos", "minuto", "horas", "hora"]) {
      if (word.endsWith(unit) && word.length > unit.length) {
        const quantity = word.slice(0, -unit.length);
        if (Number.isFinite(Number(quantity))) return [quantity, unit];
      }
    }
    return word;
  }).join(" ");
}

function readFoodRow(line) {
  const prefix = "  ('";
  const separator = "', '";
  const suffix = "', null, 'taco'";
  if (!line.startsWith(prefix) || !line.includes(suffix)) return null;

  const idEnd = line.indexOf(separator, prefix.length);
  if (idEnd < 0) return null;
  const id = line.slice(prefix.length, idEnd);
  const nameStart = idEnd + separator.length;
  const nameEnd = line.indexOf(suffix, nameStart);
  if (nameEnd < 0) return null;
  return { id, name: line.slice(nameStart, nameEnd).replaceAll("''", "'") };
}

const source = await readFile(catalogMigration, "utf8");
const rows = source.split(newline).map(readFoodRow).filter(Boolean);

if (rows.length !== 597) {
  throw new Error("Esperados 597 alimentos TACO; encontrados " + rows.length + ".");
}

const cases = rows.map(({ id, name }) => "  when " + sqlString(id) + " then " + sqlString(formatTacoDisplayName(name)));
const ids = rows.map(({ id }) => sqlString(id)).join(", ");
const sql = [
  "-- Nomes amigáveis para apresentação do catálogo TACO.",
  "-- A fonte e os valores nutricionais permanecem inalterados.",
  "",
  "update public.foods",
  "set name = case id",
  cases.join(newline),
  "end",
  "where id in (" + ids + ");",
  "",
].join(newline);

await writeFile(output, sql, "utf8");
console.log("Gerado " + output + " com " + rows.length + " nomes amigáveis.");
