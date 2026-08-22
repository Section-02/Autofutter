import { FoodRepository } from '@/data/repositories/foodRepository';
import { RecipeRepository } from '@/data/repositories/recipeRepository';
import type { DatabaseConnection } from '@/data/database/types';
import { calculateRecipeNutrition } from '@/domain/nutrition/recipeCalculator';
import type { Nutrition, WeightedIngredient } from '@/domain/nutrition/nutritionTypes';

export type LoggableSourceKind = 'food' | 'recipe';

export type LoggableSource = Readonly<{
  kind: LoggableSourceKind;
  id: string;
  name: string;
  nutritionBasisWeightG: number;
  nutritionBasis: Nutrition;
  useCount: number;
  lastUsedAt: string | null;
}>;

export class LoggableSourceService {
  constructor(private readonly database: DatabaseConnection) {}

  async load(kind: LoggableSourceKind, id: string): Promise<LoggableSource> {
    if (kind === 'food') {
      const food = await new FoodRepository(this.database).findById(id);
      if (food === null || food.deleted_at !== null) {
        throw new Error('Food was not found.');
      }

      return {
        kind,
        id: food.id,
        name: food.name,
        nutritionBasisWeightG: food.reference_weight_g,
        nutritionBasis: {
          calories: food.calories,
          proteinG: food.protein_g,
          fatG: food.fat_g,
          carbsG: food.carbs_g,
          sodiumMg: food.sodium_mg,
          cholesterolMg: food.cholesterol_mg,
        },
        useCount: food.use_count,
        lastUsedAt: food.last_used_at,
      };
    }

    const recipeRepository = new RecipeRepository(this.database);
    const recipe = await recipeRepository.findById(id);
    if (
      recipe === null ||
      recipe.deleted_at !== null ||
      recipe.finished_weight_g === null ||
      recipe.finished_weight_g <= 0
    ) {
      throw new Error('Completed recipe was not found.');
    }

    const rows = await recipeRepository.listIngredients(id);
    if (rows.length === 0) {
      throw new Error('Recipe has no ingredients.');
    }

    const ingredients: WeightedIngredient[] = rows.map((row) => ({
      id: row.id,
      foodId: row.food_id,
      weightG: row.weight_g,
      referenceWeightG: row.reference_weight_g,
      nutrition: {
        calories: row.calories,
        proteinG: row.protein_g,
        fatG: row.fat_g,
        carbsG: row.carbs_g,
        sodiumMg: row.sodium_mg,
        cholesterolMg: row.cholesterol_mg,
      },
    }));

    return {
      kind,
      id: recipe.id,
      name: recipe.name,
      nutritionBasisWeightG: recipe.finished_weight_g,
      nutritionBasis: calculateRecipeNutrition(ingredients),
      useCount: recipe.use_count,
      lastUsedAt: recipe.last_used_at,
    };
  }
}
