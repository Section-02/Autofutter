import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import { DailySummaryRepository } from '@/data/repositories/dailySummaryRepository';
import {
  FoodLogRepository,
  type FoodLogEntryRecord,
} from '@/data/repositories/foodLogRepository';
import { FoodRepository } from '@/data/repositories/foodRepository';
import { RecipeRepository } from '@/data/repositories/recipeRepository';
import {
  roundLoggedNutrition,
  scaleNutrition,
} from '@/domain/nutrition/nutritionCalculator';
import type { LoggedNutrition, Nutrition } from '@/domain/nutrition/nutritionTypes';
import { assertLocalDate, toLocalDateString } from '@/utils/dates';
import {
  LoggableSourceService,
  type LoggableSource,
  type LoggableSourceKind,
} from './loggableSourceService';

type FoodLoggingServiceOptions = Readonly<{
  createId?: () => string;
  now?: () => Date;
}>;

export type AddWeighedEntryInput = Readonly<{
  kind: LoggableSourceKind;
  sourceId: string;
  amountG: number;
  logDate: string;
}>;

function basisNutritionFromEntry(entry: FoodLogEntryRecord): Nutrition {
  const values = [
    entry.nutrition_basis_calories,
    entry.nutrition_basis_protein_g,
    entry.nutrition_basis_fat_g,
    entry.nutrition_basis_carbs_g,
    entry.nutrition_basis_sodium_mg,
    entry.nutrition_basis_cholesterol_mg,
  ];

  if (values.some((value) => value === null)) {
    throw new Error('Logged entry is missing its nutrition calculation basis.');
  }

  return {
    calories: entry.nutrition_basis_calories!,
    proteinG: entry.nutrition_basis_protein_g!,
    fatG: entry.nutrition_basis_fat_g!,
    carbsG: entry.nutrition_basis_carbs_g!,
    sodiumMg: entry.nutrition_basis_sodium_mg!,
    cholesterolMg: entry.nutrition_basis_cholesterol_mg!,
  };
}

export function calculateWeighedNutrition(
  nutritionBasis: Nutrition,
  nutritionBasisWeightG: number,
  amountG: number,
): LoggedNutrition {
  return roundLoggedNutrition(
    scaleNutrition(nutritionBasis, amountG, nutritionBasisWeightG),
  );
}

export class FoodLoggingService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseConnection,
    options: FoodLoggingServiceOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async loadSource(kind: LoggableSourceKind, id: string): Promise<LoggableSource> {
    return new LoggableSourceService(this.database).load(kind, id);
  }

  async addWeighedEntry(input: AddWeighedEntryInput): Promise<FoodLogEntryRecord> {
    assertLocalDate(input.logDate);
    const now = this.now();
    if (input.logDate > toLocalDateString(now)) {
      throw new Error('Future logging is not supported.');
    }

    let inserted: FoodLogEntryRecord | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const source = await new LoggableSourceService(transaction).load(
        input.kind,
        input.sourceId,
      );
      const nutrition = calculateWeighedNutrition(
        source.nutritionBasis,
        source.nutritionBasisWeightG,
        input.amountG,
      );
      const timestamp = now.toISOString();
      const entry: FoodLogEntryRecord = {
        id: this.createId(),
        log_date: input.logDate,
        logged_at: timestamp,
        entry_type: input.kind,
        source_food_id: input.kind === 'food' ? input.sourceId : null,
        source_recipe_id: input.kind === 'recipe' ? input.sourceId : null,
        source_variation_id: null,
        display_name_snapshot: source.name,
        amount_g: input.amountG,
        calories: nutrition.calories,
        protein_g: nutrition.proteinG,
        fat_g: nutrition.fatG,
        carbs_g: nutrition.carbsG,
        sodium_mg: nutrition.sodiumMg,
        cholesterol_mg: nutrition.cholesterolMg,
        is_estimated: 0,
        nutrition_basis_weight_g: source.nutritionBasisWeightG,
        nutrition_basis_calories: source.nutritionBasis.calories,
        nutrition_basis_protein_g: source.nutritionBasis.proteinG,
        nutrition_basis_fat_g: source.nutritionBasis.fatG,
        nutrition_basis_carbs_g: source.nutritionBasis.carbsG,
        nutrition_basis_sodium_mg: source.nutritionBasis.sodiumMg,
        nutrition_basis_cholesterol_mg: source.nutritionBasis.cholesterolMg,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await new FoodLogRepository(transaction).insert(entry);
      if (input.kind === 'food') {
        await new FoodRepository(transaction).updateUsage(input.sourceId, timestamp);
      } else {
        await new RecipeRepository(transaction).updateUsage(input.sourceId, timestamp);
      }
      await new DailySummaryRepository(transaction).recalculate(
        input.logDate,
        timestamp,
      );
      inserted = entry;
    });

    if (inserted === null) {
      throw new Error('Food log entry was not created.');
    }
    return inserted;
  }

  previewEntryEdit(
    entry: FoodLogEntryRecord,
    amountG: number,
  ): LoggedNutrition {
    if (entry.nutrition_basis_weight_g === null) {
      throw new Error('Logged entry is missing its nutrition calculation basis.');
    }
    return calculateWeighedNutrition(
      basisNutritionFromEntry(entry),
      entry.nutrition_basis_weight_g,
      amountG,
    );
  }

  async updateWeighedEntry(id: string, amountG: number): Promise<FoodLogEntryRecord> {
    let updated: FoodLogEntryRecord | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new FoodLogRepository(transaction);
      const entry = await repository.findById(id);
      if (entry === null || entry.amount_g === null) {
        throw new Error('Weighed log entry was not found.');
      }
      if (entry.nutrition_basis_weight_g === null) {
        throw new Error('Logged entry is missing its nutrition calculation basis.');
      }

      const nutrition = calculateWeighedNutrition(
        basisNutritionFromEntry(entry),
        entry.nutrition_basis_weight_g,
        amountG,
      );
      const timestamp = this.now().toISOString();
      await repository.updateWeighedNutrition(id, amountG, nutrition, timestamp);
      await new DailySummaryRepository(transaction).recalculate(
        entry.log_date,
        timestamp,
      );
      updated = { ...entry, amount_g: amountG, updated_at: timestamp,
        calories: nutrition.calories, protein_g: nutrition.proteinG,
        fat_g: nutrition.fatG, carbs_g: nutrition.carbsG,
        sodium_mg: nutrition.sodiumMg, cholesterol_mg: nutrition.cholesterolMg };
    });

    if (updated === null) {
      throw new Error('Food log entry was not updated.');
    }
    return updated;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new FoodLogRepository(transaction);
      const entry = await repository.findById(id);
      if (entry === null) {
        throw new Error('Food log entry was not found.');
      }
      const timestamp = this.now().toISOString();
      await repository.deleteById(id);
      await new DailySummaryRepository(transaction).recalculate(
        entry.log_date,
        timestamp,
      );
    });
  }
}
