import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import { DailySummaryRepository } from '@/data/repositories/dailySummaryRepository';
import {
  FoodLogRepository,
  type FoodLogEntryRecord,
} from '@/data/repositories/foodLogRepository';
import { assertLocalDate, toLocalDateString } from '@/utils/dates';

export type QuickEntryNutritionInput = Readonly<{
  calories: number;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
}>;

export type QuickEntryInput = Readonly<{
  name: string;
  logDate: string;
  nutrition: QuickEntryNutritionInput;
  isEstimated: boolean;
}>;

type Options = Readonly<{ createId?: () => string; now?: () => Date }>;

export class QuickEntryValidationError extends Error {}

function rounded(value: number | null, label: string, required = false): number | null {
  if (value === null) {
    if (required) throw new QuickEntryValidationError(`${label} is required.`);
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new QuickEntryValidationError(`${label} must be zero or greater.`);
  }
  return Math.ceil(value);
}

export class QuickEntryService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  private validate(input: QuickEntryInput): Omit<FoodLogEntryRecord, 'id' | 'logged_at' | 'created_at' | 'updated_at'> {
    assertLocalDate(input.logDate);
    if (input.logDate > toLocalDateString(this.now())) {
      throw new QuickEntryValidationError('Future logging is not supported.');
    }
    const name = input.name.trim();
    if (!name) throw new QuickEntryValidationError('Name is required.');
    return {
      log_date: input.logDate,
      entry_type: 'quick',
      source_food_id: null,
      source_recipe_id: null,
      source_variation_id: null,
      display_name_snapshot: name,
      amount_g: null,
      calories: rounded(input.nutrition.calories, 'Calories', true)!,
      protein_g: rounded(input.nutrition.proteinG, 'Protein'),
      fat_g: rounded(input.nutrition.fatG, 'Total fat'),
      carbs_g: rounded(input.nutrition.carbsG, 'Carbohydrates'),
      sodium_mg: rounded(input.nutrition.sodiumMg, 'Sodium'),
      cholesterol_mg: rounded(input.nutrition.cholesterolMg, 'Cholesterol'),
      is_estimated: input.isEstimated ? 1 : 0,
      nutrition_basis_weight_g: null,
      nutrition_basis_calories: null,
      nutrition_basis_protein_g: null,
      nutrition_basis_fat_g: null,
      nutrition_basis_carbs_g: null,
      nutrition_basis_sodium_mg: null,
      nutrition_basis_cholesterol_mg: null,
    };
  }

  async add(input: QuickEntryInput): Promise<FoodLogEntryRecord> {
    const valid = this.validate(input);
    const timestamp = this.now().toISOString();
    const entry: FoodLogEntryRecord = {
      ...valid,
      id: this.createId(),
      logged_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new FoodLogRepository(transaction).insert(entry);
      await new DailySummaryRepository(transaction).recalculate(input.logDate, timestamp);
    });
    return entry;
  }

  async update(id: string, input: QuickEntryInput): Promise<FoodLogEntryRecord> {
    const valid = this.validate(input);
    let updated: FoodLogEntryRecord | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new FoodLogRepository(transaction);
      const existing = await repository.findById(id);
      if (existing === null || existing.entry_type !== 'quick') {
        throw new Error('Quick Entry was not found.');
      }
      const timestamp = this.now().toISOString();
      updated = {
        ...existing,
        ...valid,
        log_date: existing.log_date,
        logged_at: existing.logged_at,
        updated_at: timestamp,
      };
      await repository.updateQuickEntry(updated);
      await new DailySummaryRepository(transaction).recalculate(existing.log_date, timestamp);
    });
    if (updated === null) throw new Error('Quick Entry was not updated.');
    return updated;
  }
}
