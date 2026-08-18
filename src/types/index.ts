import { z } from 'zod';

// ---------------------------------------------------------------------------
// "Enums" de dominio. Se guardan como String en SQLite/Postgres y se validan
// aquí con zod, en vez de usar enums nativos de Prisma (no soportados en
// SQLite y así el dominio no depende del motor de base de datos elegido).
// ---------------------------------------------------------------------------

export const DIFFICULTY = ['FACIL', 'MEDIA', 'AVANZADA'] as const;
export type Difficulty = (typeof DIFFICULTY)[number];

export const RATING = ['LOVE', 'LIKE', 'NEUTRAL', 'DISLIKE'] as const;
export type Rating = (typeof RATING)[number];

export const ZONE = ['CESTA_1', 'CESTA_2', 'AMBAS', 'NONE'] as const;
export type Zone = (typeof ZONE)[number];

export const INGREDIENT_GROUP = ['PRINCIPAL', 'CONDIMENTO', 'OPCIONAL'] as const;
export type IngredientGroup = (typeof INGREDIENT_GROUP)[number];

export const RECIPE_SOURCE = ['SYSTEM', 'AI_GENERATED', 'USER_CREATED'] as const;
export type RecipeSource = (typeof RECIPE_SOURCE)[number];

export const PANTRY_STATUS = ['DISPONIBLE', 'POCO', 'AGOTADO'] as const;
export type PantryStatus = (typeof PANTRY_STATUS)[number];

export const FOOD_CATEGORIES = [
  'Pollo', 'Cerdo', 'Ternera', 'Pescado', 'Marisco', 'Patatas', 'Verduras',
  'Frutas', 'Huevos', 'Congelados', 'Empanados', 'Repostería', 'Pan', 'Snacks'
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const SYSTEM_CATEGORIES = [
  'Favoritas', 'Cenas', 'Comidas', 'Rápidas', 'Saludables', 'Para invitados', 'Pendientes de probar'
] as const;

// ---------------------------------------------------------------------------
// Contexto estructurado que recibe la IA (nunca texto libre suelto).
// ---------------------------------------------------------------------------

export const AIContextSchema = z.object({
  people: z.number().int().min(1).max(20),
  air_fryer: z.object({
    model: z.string(),
    capacity_liters: z.number(),
    dual_zone: z.boolean(),
    max_temp_c: z.number()
  }),
  available_ingredients: z.array(z.string()).default([]),
  pantry_staples: z.array(z.string()).default([]), // básicos que se asumen disponibles (sal, aceite...)
  excluded_ingredients: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  dietary_preferences: z.array(z.string()).default([]),
  recipe_constraints: z.object({
    max_time_minutes: z.number().optional(),
    difficulty: z.enum(DIFFICULTY).optional(),
    cuisine_type: z.string().optional(),
    must_use_dual_zone: z.boolean().optional()
  }).default({}),
  derived_preferences: z.array(z.string()).default([]), // p.ej. "prefiere el pollo con 3-4 min menos"
  user_request: z.string() // lo que el usuario escribió, ya como campo explícito y acotado
});
export type AIContext = z.infer<typeof AIContextSchema>;

// ---------------------------------------------------------------------------
// Receta estructurada devuelta por la IA. Es el ÚNICO formato que aceptamos:
// nunca se guarda una receta a partir de texto libre sin parsear.
// ---------------------------------------------------------------------------

export const AIRecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  group: z.enum(INGREDIENT_GROUP).default('PRINCIPAL'),
  already_available: z.boolean().default(false)
});

export const AIRecipeStepSchema = z.object({
  step_number: z.number().int(),
  instruction: z.string(),
  temp_c: z.number().nullable().optional(),
  time_min: z.number().nullable().optional(),
  zone: z.enum(ZONE).default('NONE'),
  requires_shaking: z.boolean().default(false),
  requires_flipping: z.boolean().default(false)
});

export const AIRecipeZoneSchema = z.object({
  zone: z.enum(['CESTA_1', 'CESTA_2']),
  food_label: z.string(),
  temp_c: z.number(),
  time_min: z.number()
});

export const AIRecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  servings_base: z.number().int().min(1),
  difficulty: z.enum(DIFFICULTY),
  total_time_min: z.number(),
  air_fryer_time_min: z.number(),
  cuisine_type: z.string().nullable().optional(),
  is_dual_zone: z.boolean().default(false),
  ingredients: z.array(AIRecipeIngredientSchema),
  steps: z.array(AIRecipeStepSchema),
  // Si is_dual_zone=true, dual_zone_plan trae la propuesta SIN sincronizar;
  // el algoritmo de sincronización (src/lib/dualBasket/sync.ts) es quien
  // calcula los offsets reales — la IA no debe inventar la sincronización.
  dual_zone_plan: z.array(AIRecipeZoneSchema).optional(),
  match_percentage: z.number().min(0).max(100).optional(),
  missing_ingredients: z.array(z.string()).default([]),
  safety_notes: z.string().nullable().optional()
});
export type AIRecipe = z.infer<typeof AIRecipeSchema>;

export const AIRecipeProposalsSchema = z.object({
  proposals: z.array(AIRecipeSchema).min(1).max(6)
});
export type AIRecipeProposals = z.infer<typeof AIRecipeProposalsSchema>;

export const AISubstitutionSchema = z.object({
  original: z.string(),
  substitute: z.string(),
  category: z.enum(['EQUIVALENTE', 'POSIBLE_CAMBIA_SABOR', 'NO_RECOMENDABLE']),
  explanation: z.string()
});
export type AISubstitution = z.infer<typeof AISubstitutionSchema>;

export const AIConvertedRecipeSchema = z.object({
  original_summary: z.string(),
  recommended_temp_c: z.number(),
  recommended_time_min: z.number(),
  max_quantity_note: z.string(),
  requires_preheat: z.boolean(),
  requires_flipping: z.boolean(),
  recommended_zone: z.enum(['CESTA_1', 'CESTA_2', 'CUALQUIERA']),
  explanation: z.string()
});
export type AIConvertedRecipe = z.infer<typeof AIConvertedRecipeSchema>;
