import type { FoodCatalogItem, NutritionUnit } from "@/types/nutrition";

export type ParsedTranscriptItem = {
  foodId: string;
  quantity: number;
  unit: NutritionUnit;
  confidence: number;
  spokenText: string;
};

const wordNumbers: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, meio: 0.5, meia: 0.5,
};

const quantityPattern = Object.keys(wordNumbers).sort((a, b) => b.length - a.length).join("|");
const itemPattern = new RegExp(
  `^(${quantityPattern}|\\d+(?:[.,]\\d+)?)\\s*(quilogramas|quilograma|mililitros|mililitro|unidades|unidade|gramas|grama|quilos|quilo|porcoes|porcao|fatias|fatia|kg|ml|g)?\\s*(?:de\\s+)?(.*)$`,
);

const ignoredFoodWords = new Set([
  "a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "ou",
]);
const preparationWords = new Set(["assado", "assada", "cozido", "cozida", "cru", "crua", "frito", "frita", "grelhado", "grelhada"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9,. ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseQuantity(raw: string) {
  const normalized = normalize(raw);
  return wordNumbers[normalized] ?? Number(normalized.replace(",", "."));
}

function canonicalToken(value: string) {
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

function foodTokens(value: string) {
  return normalize(value)
    .split(" ")
    .map(canonicalToken)
    .filter((token) => token.length >= 3 && !ignoredFoodWords.has(token));
}

function unitFromSpeech(raw: string | undefined, quantity: number) {
  const value = normalize(raw ?? "g");
  if (["kg", "quilo", "quilos", "quilograma", "quilogramas"].includes(value)) return { quantity: quantity * 1000, unit: "g" as const };
  if (["ml", "mililitro", "mililitros"].includes(value)) return { quantity, unit: "ml" as const };
  if (["unidade", "unidades", "fatia", "fatias", "ovo", "ovos"].includes(value)) return { quantity, unit: "unit" as const };
  if (["porcao", "porcoes"].includes(value)) return { quantity, unit: "portion" as const };
  return { quantity, unit: "g" as const };
}

function matchFood(description: string, foods: FoodCatalogItem[]) {
  const requested = foodTokens(description);
  const requestedSet = new Set(requested);
  const requestedPreparation = requested.filter((token) => preparationWords.has(token));

  return foods
    .map((food) => {
      const tokens = foodTokens(`${food.name} ${food.preparation ?? ""}`);
      const tokenSet = new Set(tokens);
      const matched = requested.filter((token) => tokenSet.has(token));
      let score = matched.length * 2;

      // Prefer a sensible default only when the person mentioned a generic egg.
      // This keeps "dois ovos" from being resolved as quail egg, egg white, or yolk.
      if (requestedSet.has("ovo")) {
        if (tokenSet.has("galinha")) score += 1.4;
        if (tokenSet.has("inteiro")) score += 0.9;
        if (tokenSet.has("cozido")) score += 0.4;
        if (tokenSet.has("codorna") || tokenSet.has("clara") || tokenSet.has("gema")) score -= 1.2;
      }

      if (requestedSet.has("pao") && requestedSet.has("forma") && tokenSet.has("forma")) score += 1.2;
      if (requestedSet.has("arroz") && !requestedSet.has("integral")) {
        if (tokenSet.has("tipo")) score += 0.8;
        if (tokenSet.has("integral")) score -= 0.6;
      }
      if (requestedPreparation.length) {
        score += requestedPreparation.filter((token) => tokenSet.has(token)).length;
        score -= requestedPreparation.filter((token) => !tokenSet.has(token)).length * 0.6;
      }

      return { food, score };
    })
    .sort((a, b) => b.score - a.score || Number(Boolean(b.food.gramsPerUnit)) - Number(Boolean(a.food.gramsPerUnit)) || a.food.name.localeCompare(b.food.name, "pt-BR"))[0];
}

export function parseMealTranscript(transcript: string, foods: FoodCatalogItem[]) {
  const segments = normalize(transcript)
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/\s+(?:e|mais)\s+|[,;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const items: ParsedTranscriptItem[] = [];
  const unresolved: string[] = [];

  for (const segment of segments) {
    const cleaned = segment.replace(/^(?:(?:eu\s+)?(?:comi|consumi|ingeri|tomei|bebi)|tambem)\s+/, "");
    const match = cleaned.match(itemPattern);
    if (!match) {
      unresolved.push(segment);
      continue;
    }
    const quantity = parseQuantity(match[1]);
    const description = match[3] || match[2] || "";
    const candidate = matchFood(description, foods);
    if (!Number.isFinite(quantity) || quantity <= 0 || !candidate || candidate.score <= 0) {
      unresolved.push(segment);
      continue;
    }
    const inferredUnit = match[2] ?? (candidate.food.gramsPerUnit !== null ? "unidade" : undefined);
    const converted = unitFromSpeech(inferredUnit, quantity);
    items.push({
      foodId: candidate.food.id,
      quantity: converted.quantity,
      unit: converted.unit,
      confidence: Math.min(0.98, 0.58 + candidate.score * 0.1),
      spokenText: segment,
    });
  }

  return { items, unresolved };
}
