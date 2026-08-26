import type { DatabaseConnection } from '@/data/database/types';
import { BackupRepository } from '@/data/repositories/backupRepository';
import type { BackupData } from '@/schemas/backup';
import {
  foodShareDocumentSchema,
  recipeShareDocumentSchema,
  type FoodShareDocument,
  type RecipeShareDocument,
} from '@/schemas/shareExport';

export class ShareExportService {
  constructor(private readonly database: DatabaseConnection) {}

  async createFoodDocument(createdAt = new Date().toISOString()): Promise<FoodShareDocument> {
    const snapshot = await this.loadSnapshot();
    const foods = snapshot.foods.filter(({ deleted_at }) => deleted_at === null);
    const foodIds = new Set(foods.map(({ id }) => id));

    return foodShareDocumentSchema.parse({
      format: 'autofutter-share',
      version: 1,
      kind: 'foods',
      createdAt,
      data: {
        foods,
        foodPortions: snapshot.foodPortions.filter(({ food_id }) => foodIds.has(food_id)),
      },
    });
  }

  async createRecipeDocument(createdAt = new Date().toISOString()): Promise<RecipeShareDocument> {
    const snapshot = await this.loadSnapshot();
    const recipes = snapshot.recipes.filter(({ deleted_at }) => deleted_at === null);
    const recipeIds = new Set(recipes.map(({ id }) => id));
    const recipeIngredients = snapshot.recipeIngredients.filter(({ recipe_id }) => recipeIds.has(recipe_id));
    const recipeVariations = snapshot.recipeVariations.filter(
      ({ recipe_id, deleted_at }) => recipeIds.has(recipe_id) && deleted_at === null,
    );
    const variationIds = new Set(recipeVariations.map(({ id }) => id));
    const variationOverrides = snapshot.variationOverrides.filter(({ variation_id }) => variationIds.has(variation_id));
    const foodIds = new Set([
      ...recipeIngredients.map(({ food_id }) => food_id),
      ...variationOverrides.flatMap(({ food_id }) => food_id === null ? [] : [food_id]),
    ]);
    const foods = snapshot.foods.filter(({ id }) => foodIds.has(id));

    return recipeShareDocumentSchema.parse({
      format: 'autofutter-share',
      version: 1,
      kind: 'recipes',
      createdAt,
      data: {
        foods,
        foodPortions: snapshot.foodPortions.filter(({ food_id }) => foodIds.has(food_id)),
        recipes,
        recipeIngredients,
        recipeVariations,
        variationOverrides,
      },
    });
  }

  async createFoodContents(createdAt = new Date().toISOString()): Promise<string> {
    return JSON.stringify(await this.createFoodDocument(createdAt), null, 2);
  }

  async createRecipeContents(createdAt = new Date().toISOString()): Promise<string> {
    return JSON.stringify(await this.createRecipeDocument(createdAt), null, 2);
  }

  private async loadSnapshot(): Promise<BackupData> {
    const holder: { snapshot: BackupData | null } = { snapshot: null };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      holder.snapshot = await new BackupRepository(transaction).exportData();
    });
    if (!holder.snapshot) throw new Error('The library snapshot could not be created.');
    return holder.snapshot;
  }
}
