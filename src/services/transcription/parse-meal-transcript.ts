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
  `^(${quantityPattern}|\\d+(?:[.,]\\d+)?)\\s*(quilogramas|quilograma|mililitros|mililitro|unidades|unidade|gramas|grama|quilos|quilo|porcoes|porcao|kg|ml|g)?\\s*(?:de\\s+)?(.*)$`,
);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9,. ]/g, " ").replace(/\s+/g, " ").trim();
}

function parseQuantity(raw: string) {
  const normalized = normalize(raw);
  return wordNumbers[normalized] ?? Number(normalized.replace(",", "."));
}

function unitFromSpeech(raw: string | undefined, quantity: number) {
  const value = normalize(raw ?? "g");
  if (["kg", "quilo", "quilos", "quilograma", "quilogramas"].includes(value)) return { quantity: quantity * 1000, unit: "g" as const };
  if (["ml", "mililitro", "mililitros"].includes(value)) return { quantity, unit: "ml" as const };
  if (["unidade", "unidades", "ovo", "ovos"].includes(value)) return { quantity, unit: "unit" as const };
  if (["porcao", "porcoes"].includes(value)) return { quantity, unit: "portion" as const };
  return { quantity, unit: "g" as const };
}

function matchFood(description: string, foods: FoodCatalogItem[]) {
  const haystack = normalize(description);
  const aliases: Record<string, string[]> = {
    arroz: ["arroz"], feijao: ["feijao"], frango: ["frango", "peito"], ovo: ["ovo"],
    banana: ["banana"], pao: ["pao"], queijo: ["queijo"], batata: ["batata"], aveia: ["aveia"],
  };

  return foods
    .map((food) => {
      const foodText = normalize(`${food.name} ${food.preparation ?? ""}`);
      const meaningful = foodText.split(" ").filter((word) => word.length >= 4);
      let score = meaningful.filter((word) => haystack.includes(word)).length;
      for (const [key, values] of Object.entries(aliases)) {
        if (foodText.includes(key) && values.some((alias) => haystack.includes(alias))) score += 2;
      }
      return { food, score };
    })
    .sort((a, b) => b.score - a.score)[0];
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
