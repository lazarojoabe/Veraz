import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import type { mealTemplateSchema } from "@/lib/validations/nutrition";

export type MealTemplateInput = z.infer<typeof mealTemplateSchema>;

export type MealTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  foodNames: string[];
};

export async function listTemplates(userId: string): Promise<MealTemplateSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_templates")
    .select("id,name,description,meal_template_items(food_id,foods(name))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os modelos.");

  type Row = { id: string; name: string; description: string | null; meal_template_items: { food_id: string; foods: { name: string } | null }[] };
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    itemCount: row.meal_template_items.length,
    foodNames: row.meal_template_items.flatMap((item) => item.foods?.name ? [item.foods.name] : []),
  }));
}

export async function createTemplate(input: MealTemplateInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_meal_template_with_items", {
    p_name: input.name,
    p_description: input.description,
    p_items: input.items,
  });
  if (error) throw new Error("Não foi possível criar o modelo.");
  return data as string;
}

export async function instantiateTemplate(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_meal_from_template", { p_template_id: templateId });
  if (error) throw new Error("Não foi possível registrar o modelo.");
  return data as string;
}

export async function deleteTemplate(userId: string, templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_templates").delete().eq("id", templateId).eq("user_id", userId);
  if (error) throw new Error("Não foi possível excluir o modelo.");
}
