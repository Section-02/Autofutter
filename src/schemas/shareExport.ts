import { z } from 'zod';

import {
  foodPortionSchema,
  foodSchema,
  recipeIngredientSchema,
  recipeSchema,
  recipeVariationSchema,
  variationOverrideSchema,
} from '@/schemas/backup';

const timestamp = z.string().min(1);

const foodShareDataSchema = z.object({
  foods: z.array(foodSchema),
  foodPortions: z.array(foodPortionSchema),
}).strict().superRefine((data, context) => {
  const foodIds = new Set(data.foods.map(({ id }) => id));
  for (const [index, portion] of data.foodPortions.entries()) {
    if (!foodIds.has(portion.food_id)) {
      context.addIssue({
        code: 'custom',
        message: 'Food portion references a food outside this export.',
        path: ['foodPortions', index, 'food_id'],
      });
    }
  }
});

const recipeShareDataSchema = z.object({
  foods: z.array(foodSchema),
  foodPortions: z.array(foodPortionSchema),
  recipes: z.array(recipeSchema),
  recipeIngredients: z.array(recipeIngredientSchema),
  recipeVariations: z.array(recipeVariationSchema),
  variationOverrides: z.array(variationOverrideSchema),
}).strict().superRefine((data, context) => {
  const foodIds = new Set(data.foods.map(({ id }) => id));
  const recipeIds = new Set(data.recipes.map(({ id }) => id));
  const ingredientIds = new Set(data.recipeIngredients.map(({ id }) => id));
  const variationIds = new Set(data.recipeVariations.map(({ id }) => id));

  for (const [index, portion] of data.foodPortions.entries()) {
    if (!foodIds.has(portion.food_id)) {
      context.addIssue({ code: 'custom', message: 'Food portion references a missing food.', path: ['foodPortions', index, 'food_id'] });
    }
  }
  for (const [index, ingredient] of data.recipeIngredients.entries()) {
    if (!recipeIds.has(ingredient.recipe_id)) {
      context.addIssue({ code: 'custom', message: 'Ingredient references a missing recipe.', path: ['recipeIngredients', index, 'recipe_id'] });
    }
    if (!foodIds.has(ingredient.food_id)) {
      context.addIssue({ code: 'custom', message: 'Ingredient references a missing food.', path: ['recipeIngredients', index, 'food_id'] });
    }
  }
  for (const [index, variation] of data.recipeVariations.entries()) {
    if (!recipeIds.has(variation.recipe_id)) {
      context.addIssue({ code: 'custom', message: 'Variation references a missing recipe.', path: ['recipeVariations', index, 'recipe_id'] });
    }
  }
  for (const [index, override] of data.variationOverrides.entries()) {
    if (!variationIds.has(override.variation_id)) {
      context.addIssue({ code: 'custom', message: 'Override references a missing variation.', path: ['variationOverrides', index, 'variation_id'] });
    }
    if (override.base_recipe_ingredient_id !== null && !ingredientIds.has(override.base_recipe_ingredient_id)) {
      context.addIssue({ code: 'custom', message: 'Override references a missing ingredient.', path: ['variationOverrides', index, 'base_recipe_ingredient_id'] });
    }
    if (override.food_id !== null && !foodIds.has(override.food_id)) {
      context.addIssue({ code: 'custom', message: 'Override references a missing food.', path: ['variationOverrides', index, 'food_id'] });
    }
  }
});

export const foodShareDocumentSchema = z.object({
  format: z.literal('autofutter-share'),
  version: z.literal(1),
  kind: z.literal('foods'),
  createdAt: timestamp,
  data: foodShareDataSchema,
}).strict();

export const recipeShareDocumentSchema = z.object({
  format: z.literal('autofutter-share'),
  version: z.literal(1),
  kind: z.literal('recipes'),
  createdAt: timestamp,
  data: recipeShareDataSchema,
}).strict();

export const shareDocumentSchema = z.discriminatedUnion('kind', [
  foodShareDocumentSchema,
  recipeShareDocumentSchema,
]);

export type FoodShareDocument = z.infer<typeof foodShareDocumentSchema>;
export type RecipeShareDocument = z.infer<typeof recipeShareDocumentSchema>;
export type ShareDocument = z.infer<typeof shareDocumentSchema>;

export function parseShareDocument(value: string): ShareDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('This shared library file is not valid JSON.');
  }
  const result = shareDocumentSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('This shared library file is incomplete or unsupported.');
  }
  return result.data;
}
