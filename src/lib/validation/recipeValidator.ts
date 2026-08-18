/**
 * Validación de recetas generadas por IA.
 * ----------------------------------------------------------------------------
 * La IA puede equivocarse (temperaturas irreales, tiempos absurdos, cestas
 * mal repartidas...). Antes de guardar una receta generada por IA, se
 * contrasta contra los datos maestros de la base de datos (Food /
 * FoodCookingProfile) y contra límites físicos del modelo de Air Fryer.
 *
 * Este validador es una función pura: recibe la receta candidata y una lista
 * de "perfiles de referencia" ya resueltos desde la base de datos (para que
 * sea testeable sin necesidad de Prisma ni de una base de datos real).
 */

import type { AIRecipe } from '@/types';

export interface FoodReferenceProfile {
  name: string; // nombre normalizado del alimento (p.ej. "pollo", "patatas")
  category: string;
  tempC: number;
  minTimeMin: number;
  maxTimeMin: number;
  isRawProtein: boolean;
  safeInternalTempC?: number | null;
}

export interface ValidationIssue {
  level: 'ERROR' | 'WARNING';
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean; // false si existe al menos un ERROR
  needsReview: boolean; // true si hay WARNINGs (se puede guardar, pero marcada para revisión)
  issues: ValidationIssue[];
}

export interface ValidationContext {
  maxTempC: number; // límite físico del modelo de Air Fryer del usuario
  referenceFoods: FoodReferenceProfile[]; // catálogo resuelto desde la base de datos
}

const ABSOLUTE_TEMP_FLOOR = 40;
const ABSOLUTE_TEMP_CEILING = 240;
const TEMP_MISMATCH_WARN_DELTA = 25; // ºC de diferencia vs. perfil de referencia
const TIME_MISMATCH_MARGIN_MIN = 6; // minutos de margen antes de avisar

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findReference(name: string, refs: FoodReferenceProfile[]): FoodReferenceProfile | undefined {
  const n = normalize(name);
  return refs.find((r) => n.includes(normalize(r.name)) || normalize(r.name).includes(n));
}

export function validateAIRecipe(recipe: AIRecipe, ctx: ValidationContext): ValidationResult {
  const issues: ValidationIssue[] = [];

  // --- Comensales y tiempos generales -------------------------------------
  if (recipe.servings_base < 1) {
    issues.push({ level: 'ERROR', field: 'servings_base', message: 'El número de comensales debe ser al menos 1.' });
  } else if (recipe.servings_base > 12) {
    issues.push({
      level: 'WARNING',
      field: 'servings_base',
      message: `${recipe.servings_base} comensales es un valor inusual para uso doméstico; revisa si es correcto.`
    });
  }

  if (recipe.total_time_min <= 0 || recipe.air_fryer_time_min <= 0) {
    issues.push({ level: 'ERROR', field: 'time', message: 'Los tiempos de la receta deben ser positivos.' });
  }
  if (recipe.air_fryer_time_min > recipe.total_time_min + 5) {
    issues.push({
      level: 'WARNING',
      field: 'air_fryer_time_min',
      message: 'El tiempo en Air Fryer es mayor que el tiempo total indicado; revisa la coherencia de ambos valores.'
    });
  }

  // --- Ingredientes ---------------------------------------------------------
  if (recipe.ingredients.length === 0) {
    issues.push({ level: 'ERROR', field: 'ingredients', message: 'La receta no tiene ingredientes.' });
  }

  // --- Pasos: temperatura y tiempo -------------------------------------------
  for (const step of recipe.steps) {
    if (step.temp_c != null) {
      if (step.temp_c < ABSOLUTE_TEMP_FLOOR || step.temp_c > ABSOLUTE_TEMP_CEILING) {
        issues.push({
          level: 'ERROR',
          field: `step_${step.step_number}.temp_c`,
          message: `${step.temp_c} ºC está fuera de un rango realista para una Air Fryer.`
        });
      } else if (step.temp_c > ctx.maxTempC) {
        issues.push({
          level: 'ERROR',
          field: `step_${step.step_number}.temp_c`,
          message: `${step.temp_c} ºC supera el máximo del modelo de Air Fryer configurado (${ctx.maxTempC} ºC).`
        });
      }
    }
  }

  // --- Contraste contra datos maestros (Food / FoodCookingProfile) -----------
  for (const ing of recipe.ingredients) {
    const ref = findReference(ing.name, ctx.referenceFoods);
    if (!ref) continue; // ingrediente sin perfil conocido (condimento, básico...): no se valida

    const relatedStep = recipe.steps.find(
      (s) => s.temp_c != null && s.time_min != null && normalize(s.instruction).includes(normalize(ing.name))
    );
    const candidateTemp = relatedStep?.temp_c ?? undefined;
    const candidateTime = relatedStep?.time_min ?? undefined;

    if (candidateTemp != null && Math.abs(candidateTemp - ref.tempC) > TEMP_MISMATCH_WARN_DELTA) {
      issues.push({
        level: 'WARNING',
        field: `ingredient.${ing.name}.temp`,
        message: `La receta usa ${candidateTemp} ºC para "${ing.name}", pero el dato maestro recomienda ${ref.tempC} ºC. Revisa antes de guardar.`
      });
    }
    if (
      candidateTime != null &&
      (candidateTime < ref.minTimeMin - TIME_MISMATCH_MARGIN_MIN || candidateTime > ref.maxTimeMin + TIME_MISMATCH_MARGIN_MIN)
    ) {
      issues.push({
        level: 'WARNING',
        field: `ingredient.${ing.name}.time`,
        message: `La receta usa ${candidateTime} min para "${ing.name}", fuera del rango habitual (${ref.minTimeMin}-${ref.maxTimeMin} min). Revisa antes de guardar.`
      });
    }

    if (ref.isRawProtein && !recipe.safety_notes) {
      issues.push({
        level: 'WARNING',
        field: 'safety_notes',
        message: `"${ing.name}" es una proteína cruda y la receta no incluye una nota de seguridad sobre temperatura interna.`
      });
    }
  }

  // --- Doble cesta ------------------------------------------------------------
  if (recipe.is_dual_zone) {
    const plan = recipe.dual_zone_plan ?? [];
    const zones = new Set(plan.map((p) => p.zone));
    if (plan.length !== 2 || zones.size !== 2) {
      issues.push({
        level: 'ERROR',
        field: 'dual_zone_plan',
        message: 'Una receta de doble cesta debe definir exactamente CESTA_1 y CESTA_2.'
      });
    }
    for (const zonePlan of plan) {
      if (zonePlan.temp_c > ctx.maxTempC) {
        issues.push({
          level: 'ERROR',
          field: `dual_zone_plan.${zonePlan.zone}`,
          message: `${zonePlan.temp_c} ºC en ${zonePlan.zone} supera el máximo del modelo (${ctx.maxTempC} ºC).`
        });
      }
    }
  }

  const valid = !issues.some((i) => i.level === 'ERROR');
  const needsReview = issues.some((i) => i.level === 'WARNING');
  return { valid, needsReview, issues };
}
