import { z } from 'zod';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.string().min(1);
const nullableTimestamp = timestamp.nullable();
const nonnegativeNumber = z.number().finite().nonnegative();
const positiveNumber = z.number().finite().positive();
const nonnegativeInteger = z.number().int().nonnegative();

const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  reference_weight_g: positiveNumber,
  calories: nonnegativeNumber,
  protein_g: nonnegativeNumber,
  fat_g: nonnegativeNumber,
  carbs_g: nonnegativeNumber,
  sodium_mg: nonnegativeNumber,
  cholesterol_mg: nonnegativeNumber,
  source_type: z.string().min(1),
  source_id: z.string().nullable(),
  use_count: nonnegativeInteger,
  last_used_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: nullableTimestamp,
  standard_portion_label: z.string().trim().min(1).nullable().default(null),
  standard_portion_weight_g: positiveNumber.nullable().default(null),
}).strict().superRefine((food, context) => {
  const hasLabel = food.standard_portion_label !== null;
  const hasWeight = food.standard_portion_weight_g !== null;
  if (hasLabel !== hasWeight) {
    context.addIssue({
      code: 'custom',
      message: 'Standard portion label and weight must be provided together.',
    });
  }
});

const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  finished_weight_g: positiveNumber.nullable(),
  use_count: nonnegativeInteger,
  last_used_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: nullableTimestamp,
}).strict();

const recipeIngredientSchema = z.object({
  id: z.string().min(1),
  recipe_id: z.string().min(1),
  food_id: z.string().min(1),
  weight_g: positiveNumber,
  sort_order: nonnegativeInteger,
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const recipeVariationSchema = z.object({
  id: z.string().min(1),
  recipe_id: z.string().min(1),
  name: z.string().trim().min(1),
  finished_weight_g: positiveNumber.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: nullableTimestamp,
}).strict();

const variationOverrideSchema = z.object({
  id: z.string().min(1),
  variation_id: z.string().min(1),
  action: z.enum(['replace', 'remove', 'add', 'change_weight']),
  base_recipe_ingredient_id: z.string().nullable(),
  food_id: z.string().nullable(),
  weight_g: positiveNumber.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const dailyNutritionSchema = z.object({
  date: localDate,
  calories: nonnegativeInteger,
  protein_g: nonnegativeInteger.nullable(),
  fat_g: nonnegativeInteger.nullable(),
  carbs_g: nonnegativeInteger.nullable(),
  sodium_mg: nonnegativeInteger.nullable(),
  cholesterol_mg: nonnegativeInteger.nullable(),
  has_partial_nutrition: z.union([z.literal(0), z.literal(1)]),
  updated_at: timestamp,
}).strict();

const foodLogSchema = z.object({
  id: z.string().min(1),
  log_date: localDate,
  logged_at: timestamp,
  entry_type: z.enum(['food', 'recipe', 'recipe_variation', 'quick']),
  source_food_id: z.string().nullable(),
  source_recipe_id: z.string().nullable(),
  source_variation_id: z.string().nullable(),
  display_name_snapshot: z.string().min(1),
  amount_g: positiveNumber.nullable(),
  calories: nonnegativeInteger,
  protein_g: nonnegativeInteger.nullable(),
  fat_g: nonnegativeInteger.nullable(),
  carbs_g: nonnegativeInteger.nullable(),
  sodium_mg: nonnegativeInteger.nullable(),
  cholesterol_mg: nonnegativeInteger.nullable(),
  is_estimated: z.union([z.literal(0), z.literal(1)]),
  nutrition_basis_weight_g: positiveNumber.nullable(),
  nutrition_basis_calories: nonnegativeNumber.nullable(),
  nutrition_basis_protein_g: nonnegativeNumber.nullable(),
  nutrition_basis_fat_g: nonnegativeNumber.nullable(),
  nutrition_basis_carbs_g: nonnegativeNumber.nullable(),
  nutrition_basis_sodium_mg: nonnegativeNumber.nullable(),
  nutrition_basis_cholesterol_mg: nonnegativeNumber.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const weighInSchema = z.object({
  id: z.string().min(1),
  date: localDate,
  weight_lb: positiveNumber,
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const goalSchema = z.object({
  id: z.string().min(1),
  effective_date: localDate,
  calorie_target: z.number().int().positive(),
  protein_minimum_g: z.number().int().positive(),
  calorie_tolerance_percent: z.number().int().min(0).max(100),
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const logDayCompletionSchema = z.object({
  date: localDate,
  ended_at: timestamp,
}).strict();

export const backupDataSchema = z.object({
  foods: z.array(foodSchema),
  recipes: z.array(recipeSchema),
  recipeIngredients: z.array(recipeIngredientSchema),
  recipeVariations: z.array(recipeVariationSchema),
  variationOverrides: z.array(variationOverrideSchema),
  dailyNutrition: z.array(dailyNutritionSchema),
  foodLogs: z.array(foodLogSchema),
  weighIns: z.array(weighInSchema),
  goals: z.array(goalSchema),
  logDayCompletions: z.array(logDayCompletionSchema),
}).strict();

export const backupDocumentSchema = z.object({
  format: z.literal('personal-nutrition-tracker'),
  version: z.literal(2),
  createdAt: timestamp,
  data: backupDataSchema,
}).strict();

export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupDocument = z.infer<typeof backupDocumentSchema>;

export function parseBackupDocument(value: string): BackupDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('This backup is not valid JSON.');
  }

  const result = backupDocumentSchema.safeParse(upgradeLegacyBackup(parsed));
  if (!result.success) {
    const version = typeof parsed === 'object' && parsed !== null && 'version' in parsed
      ? (parsed as { version?: unknown }).version
      : undefined;
    if (version !== undefined && version !== 1 && version !== 2) {
      throw new Error('This backup version is not supported.');
    }
    throw new Error('This backup is incomplete or invalid.');
  }
  return result.data;
}

function upgradeLegacyBackup(parsed: unknown): unknown {
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('version' in parsed) || parsed.version !== 1 ||
    !('data' in parsed) || typeof parsed.data !== 'object' || parsed.data === null ||
    !('foods' in parsed.data) || !Array.isArray(parsed.data.foods)
  ) {
    return parsed;
  }

  return {
    ...parsed,
    version: 2,
    data: {
      ...parsed.data,
      foods: parsed.data.foods.map((food) =>
        typeof food === 'object' && food !== null
          ? {
              ...food,
              standard_portion_label: null,
              standard_portion_weight_g: null,
            }
          : food,
      ),
    },
  };
}
