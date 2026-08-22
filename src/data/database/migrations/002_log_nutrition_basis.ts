import type { DatabaseConnection } from '../types';

export const logNutritionBasisMigration = {
  version: 2,
  name: 'log_nutrition_basis',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_weight_g REAL
        CHECK (nutrition_basis_weight_g IS NULL OR nutrition_basis_weight_g > 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_calories REAL
        CHECK (nutrition_basis_calories IS NULL OR nutrition_basis_calories >= 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_protein_g REAL
        CHECK (nutrition_basis_protein_g IS NULL OR nutrition_basis_protein_g >= 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_fat_g REAL
        CHECK (nutrition_basis_fat_g IS NULL OR nutrition_basis_fat_g >= 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_carbs_g REAL
        CHECK (nutrition_basis_carbs_g IS NULL OR nutrition_basis_carbs_g >= 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_sodium_mg REAL
        CHECK (nutrition_basis_sodium_mg IS NULL OR nutrition_basis_sodium_mg >= 0);
      ALTER TABLE food_log_entries
        ADD COLUMN nutrition_basis_cholesterol_mg REAL
        CHECK (nutrition_basis_cholesterol_mg IS NULL OR nutrition_basis_cholesterol_mg >= 0);
    `);
  },
} as const;
