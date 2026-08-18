import { validateAIRecipe, type ValidationResult } from '@/lib/validation/recipeValidator';
import { synchronizeDualBasket, type DualBasketPlan } from '@/lib/dualBasket/sync';
import * as repo from './db';
import * as aiClient from './aiClient';
import type { AIContext, AIRecipe } from '@/types';

export async function buildAIContextForUser(
  uid: string,
  overrides: { availableIngredients?: string[]; userRequest: string; constraints?: AIContext['recipe_constraints'] }
): Promise<AIContext> {
  const user = await repo.getUserDoc(uid);
  if (!user?.airFryerModelId) {
    throw new Error('Configura primero tu modelo de Air Fryer en Ajustes.');
  }
  const models = await repo.listAirFryerModels();
  const model = models.find((m) => m.id === user.airFryerModelId);
  if (!model) throw new Error('No se encuentra el modelo de Air Fryer configurado.');

  const [pantry, derived] = await Promise.all([repo.listPantry(uid), repo.listDerivedPreferences(uid)]);
  const available = pantry.filter((p) => p.status !== 'AGOTADO').map((p) => p.name);
  const pref = user.preference ?? {};

  return {
    people: pref.defaultServings ?? 4,
    air_fryer: {
      model: `${model.brand} ${model.model}`,
      capacity_liters: model.capacityLiters,
      dual_zone: model.dualZone,
      max_temp_c: model.maxTempC
    },
    available_ingredients: overrides.availableIngredients ?? available,
    pantry_staples: ['sal', 'aceite de oliva', 'pimienta'],
    excluded_ingredients: pref.excludedIngredients ?? [],
    allergies: pref.allergies ?? [],
    dietary_preferences: pref.dietaryPreferences ?? [],
    recipe_constraints: {
      max_time_minutes: pref.maxCookTimeMinutes ?? undefined,
      difficulty: pref.difficultyLevel,
      ...overrides.constraints
    },
    derived_preferences: derived.map((d) => d.insight),
    user_request: overrides.userRequest
  };
}

export interface ProposalResult {
  recipe: AIRecipe;
  validation: ValidationResult;
  dualBasketPreview?: DualBasketPlan;
  matchPercentage: number;
}

export async function generateProposals(
  uid: string,
  params: { availableIngredients?: string[]; userRequest: string; constraints?: AIContext['recipe_constraints'] }
): Promise<{ context: AIContext; proposals: ProposalResult[] }> {
  const context = await buildAIContextForUser(uid, params);
  const { proposals } = await aiClient.generateRecipes(context);
  const referenceFoods = await repo.getReferenceFoodProfiles();
  const maxTempC = context.air_fryer.max_temp_c;

  const results = proposals.map((recipe): ProposalResult => {
    const validation = validateAIRecipe(recipe, { maxTempC, referenceFoods });
    let dualBasketPreview: DualBasketPlan | undefined;
    if (recipe.is_dual_zone && recipe.dual_zone_plan && recipe.dual_zone_plan.length === 2) {
      try {
        dualBasketPreview = synchronizeDualBasket(
          recipe.dual_zone_plan.map((z) => ({ zone: z.zone, foodLabel: z.food_label, tempC: z.temp_c, timeMin: z.time_min }))
        );
      } catch {
        /* validación ya lo habrá marcado si el plan es inconsistente */
      }
    }
    return { recipe, validation, dualBasketPreview, matchPercentage: computeMatchPercentage(recipe, context.available_ingredients) };
  });

  return { context, proposals: results };
}

function computeMatchPercentage(recipe: AIRecipe, available: string[]): number {
  const mainIngredients = recipe.ingredients.filter((i) => i.group !== 'OPCIONAL');
  if (mainIngredients.length === 0) return 100;
  const normalized = available.map((a) => a.toLowerCase().trim());
  const matched = mainIngredients.filter(
    (i) =>
      i.already_available ||
      normalized.some((a) => a.length > 2 && (i.name.toLowerCase().includes(a) || a.includes(i.name.toLowerCase())))
  );
  return Math.round((matched.length / mainIngredients.length) * 100);
}
