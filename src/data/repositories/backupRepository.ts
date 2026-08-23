import type { DatabaseConnection } from '@/data/database/types';
import type { BackupData } from '@/schemas/backup';

export class BackupRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async exportData(): Promise<BackupData> {
    const [
      foods,
      recipes,
      recipeIngredients,
      recipeVariations,
      variationOverrides,
      dailyNutrition,
      foodLogs,
      weighIns,
      goals,
      logDayCompletions,
    ] = await Promise.all([
      this.database.getAllAsync<BackupData['foods'][number]>('SELECT * FROM foods ORDER BY id;'),
      this.database.getAllAsync<BackupData['recipes'][number]>('SELECT * FROM recipes ORDER BY id;'),
      this.database.getAllAsync<BackupData['recipeIngredients'][number]>('SELECT * FROM recipe_ingredients ORDER BY id;'),
      this.database.getAllAsync<BackupData['recipeVariations'][number]>('SELECT * FROM recipe_variations ORDER BY id;'),
      this.database.getAllAsync<BackupData['variationOverrides'][number]>('SELECT * FROM recipe_variation_overrides ORDER BY id;'),
      this.database.getAllAsync<BackupData['dailyNutrition'][number]>('SELECT * FROM daily_nutrition_summaries ORDER BY date;'),
      this.database.getAllAsync<BackupData['foodLogs'][number]>('SELECT * FROM food_log_entries ORDER BY log_date, logged_at, id;'),
      this.database.getAllAsync<BackupData['weighIns'][number]>('SELECT * FROM weigh_ins ORDER BY date;'),
      this.database.getAllAsync<BackupData['goals'][number]>('SELECT * FROM nutrition_goals ORDER BY effective_date;'),
      this.database.getAllAsync<BackupData['logDayCompletions'][number]>('SELECT * FROM log_day_completions ORDER BY date;'),
    ]);
    return {
      foods,
      recipes,
      recipeIngredients,
      recipeVariations,
      variationOverrides,
      dailyNutrition,
      foodLogs,
      weighIns,
      goals,
      logDayCompletions,
    };
  }

  async replaceAll(data: BackupData): Promise<void> {
    await this.clearBackedUpTables();
    for (const row of data.foods) await this.insertFood(row);
    for (const row of data.recipes) await this.insertRecipe(row);
    for (const row of data.recipeIngredients) await this.insertRecipeIngredient(row);
    for (const row of data.recipeVariations) await this.insertRecipeVariation(row);
    for (const row of data.variationOverrides) await this.insertVariationOverride(row);
    for (const row of data.foodLogs) await this.insertFoodLog(row);
    for (const row of data.dailyNutrition) await this.insertDailyNutrition(row);
    for (const row of data.goals) await this.insertGoal(row);
    for (const row of data.weighIns) await this.insertWeighIn(row);
    for (const row of data.logDayCompletions) await this.insertLogDayCompletion(row);
  }

  async verifyIntegrity(): Promise<void> {
    const foreignKeys = await this.database.getAllAsync<Record<string, unknown>>(
      'PRAGMA foreign_key_check;',
    );
    if (foreignKeys.length > 0) {
      throw new Error('The backup contains broken references.');
    }
    const integrity = await this.database.getFirstAsync<{ integrity_check: string }>(
      'PRAGMA integrity_check;',
    );
    if (integrity?.integrity_check !== 'ok') {
      throw new Error('Database integrity verification failed.');
    }
  }

  private async clearBackedUpTables(): Promise<void> {
    for (const table of [
      'food_log_entries',
      'recipe_variation_overrides',
      'recipe_variations',
      'recipe_ingredients',
      'recipes',
      'foods',
      'daily_nutrition_summaries',
      'nutrition_goals',
      'weigh_ins',
      'log_day_completions',
    ]) {
      await this.database.runAsync(`DELETE FROM ${table};`);
    }
  }

  private async insertFood(row: BackupData['foods'][number]): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO foods VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      row.id, row.name, row.reference_weight_g, row.calories, row.protein_g,
      row.fat_g, row.carbs_g, row.sodium_mg, row.cholesterol_mg, row.source_type,
      row.source_id, row.use_count, row.last_used_at, row.created_at, row.updated_at,
      row.deleted_at,
    );
  }

  private async insertRecipe(row: BackupData['recipes'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO recipes VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      row.id, row.name, row.finished_weight_g, row.use_count, row.last_used_at,
      row.created_at, row.updated_at, row.deleted_at,
    );
  }

  private async insertRecipeIngredient(row: BackupData['recipeIngredients'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO recipe_ingredients VALUES (?, ?, ?, ?, ?, ?, ?);',
      row.id, row.recipe_id, row.food_id, row.weight_g, row.sort_order,
      row.created_at, row.updated_at,
    );
  }

  private async insertRecipeVariation(row: BackupData['recipeVariations'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO recipe_variations VALUES (?, ?, ?, ?, ?, ?, ?);',
      row.id, row.recipe_id, row.name, row.finished_weight_g, row.created_at,
      row.updated_at, row.deleted_at,
    );
  }

  private async insertVariationOverride(row: BackupData['variationOverrides'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO recipe_variation_overrides VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      row.id, row.variation_id, row.action, row.base_recipe_ingredient_id,
      row.food_id, row.weight_g, row.created_at, row.updated_at,
    );
  }

  private async insertFoodLog(row: BackupData['foodLogs'][number]): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO food_log_entries (
        id, log_date, logged_at, entry_type, source_food_id, source_recipe_id,
        source_variation_id, display_name_snapshot, amount_g, calories, protein_g,
        fat_g, carbs_g, sodium_mg, cholesterol_mg, is_estimated, created_at,
        updated_at, nutrition_basis_weight_g, nutrition_basis_calories,
        nutrition_basis_protein_g, nutrition_basis_fat_g, nutrition_basis_carbs_g,
        nutrition_basis_sodium_mg, nutrition_basis_cholesterol_mg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      row.id, row.log_date, row.logged_at, row.entry_type, row.source_food_id,
      row.source_recipe_id, row.source_variation_id, row.display_name_snapshot,
      row.amount_g, row.calories, row.protein_g, row.fat_g, row.carbs_g,
      row.sodium_mg, row.cholesterol_mg, row.is_estimated, row.created_at,
      row.updated_at, row.nutrition_basis_weight_g, row.nutrition_basis_calories,
      row.nutrition_basis_protein_g, row.nutrition_basis_fat_g,
      row.nutrition_basis_carbs_g, row.nutrition_basis_sodium_mg,
      row.nutrition_basis_cholesterol_mg,
    );
  }

  private async insertDailyNutrition(row: BackupData['dailyNutrition'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO daily_nutrition_summaries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
      row.date, row.calories, row.protein_g, row.fat_g, row.carbs_g,
      row.sodium_mg, row.cholesterol_mg, row.has_partial_nutrition, row.updated_at,
    );
  }

  private async insertGoal(row: BackupData['goals'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO nutrition_goals VALUES (?, ?, ?, ?, ?, ?, ?);',
      row.id, row.effective_date, row.calorie_target, row.protein_minimum_g,
      row.calorie_tolerance_percent, row.created_at, row.updated_at,
    );
  }

  private async insertWeighIn(row: BackupData['weighIns'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO weigh_ins VALUES (?, ?, ?, ?, ?);',
      row.id, row.date, row.weight_lb, row.created_at, row.updated_at,
    );
  }

  private async insertLogDayCompletion(row: BackupData['logDayCompletions'][number]): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO log_day_completions VALUES (?, ?);',
      row.date, row.ended_at,
    );
  }
}
