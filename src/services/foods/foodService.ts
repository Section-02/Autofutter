import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import {
  FoodRepository,
  type FoodRecord,
  type FoodSort,
} from '@/data/repositories/foodRepository';
import type { Nutrition } from '@/domain/nutrition/nutritionTypes';

export type FoodSource = Readonly<{
  type: 'custom' | 'usda';
  id: string | null;
}>;

export type FoodInput = Readonly<{
  name: string;
  referenceWeightG: number;
  nutrition: Nutrition;
  source: FoodSource;
}>;

type FoodServiceOptions = Readonly<{
  createId?: () => string;
  now?: () => Date;
}>;

export class FoodValidationError extends Error {}

export class FoodInUseError extends Error {
  constructor(readonly recipeNames: readonly string[]) {
    super(`This food is used by: ${recipeNames.join(', ')}.`);
  }
}

function validateNumber(value: number, label: string, positive = false): void {
  if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) {
    throw new FoodValidationError(
      positive
        ? `${label} must be greater than zero.`
        : `${label} must be zero or greater.`,
    );
  }
}

export function validateFoodInput(input: FoodInput): FoodInput {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new FoodValidationError('Name is required.');
  }
  validateNumber(input.referenceWeightG, 'Reference weight', true);
  validateNumber(input.nutrition.calories, 'Calories');
  validateNumber(input.nutrition.proteinG, 'Protein');
  validateNumber(input.nutrition.fatG, 'Total fat');
  validateNumber(input.nutrition.carbsG, 'Carbohydrates');
  validateNumber(input.nutrition.sodiumMg, 'Sodium');
  validateNumber(input.nutrition.cholesterolMg, 'Cholesterol');
  if (input.source.type === 'usda' && !input.source.id) {
    throw new FoodValidationError('USDA source identifier is required.');
  }
  return { ...input, name };
}

export class FoodService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseConnection,
    options: FoodServiceOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async list(query = '', sort: FoodSort = 'most_used'): Promise<FoodRecord[]> {
    return new FoodRepository(this.database).listActive(query, sort);
  }

  async listDeleted(): Promise<FoodRecord[]> {
    return new FoodRepository(this.database).listDeleted();
  }

  async find(id: string): Promise<FoodRecord> {
    const food = await new FoodRepository(this.database).findById(id);
    if (food === null) throw new Error('Food was not found.');
    return food;
  }

  async create(input: FoodInput): Promise<FoodRecord> {
    const valid = validateFoodInput(input);
    const timestamp = this.now().toISOString();
    const food: FoodRecord = {
      id: this.createId(),
      name: valid.name,
      reference_weight_g: valid.referenceWeightG,
      calories: valid.nutrition.calories,
      protein_g: valid.nutrition.proteinG,
      fat_g: valid.nutrition.fatG,
      carbs_g: valid.nutrition.carbsG,
      sodium_mg: valid.nutrition.sodiumMg,
      cholesterol_mg: valid.nutrition.cholesterolMg,
      source_type: valid.source.type,
      source_id: valid.source.id,
      use_count: 0,
      last_used_at: null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };
    await new FoodRepository(this.database).create(food);
    return food;
  }

  async update(id: string, input: Omit<FoodInput, 'source'>): Promise<FoodRecord> {
    const repository = new FoodRepository(this.database);
    const existing = await this.find(id);
    if (existing.deleted_at !== null) throw new Error('Deleted food cannot be edited.');
    const valid = validateFoodInput({
      ...input,
      source: {
        type: existing.source_type === 'usda' ? 'usda' : 'custom',
        id: existing.source_id,
      },
    });
    const timestamp = this.now().toISOString();
    await repository.update(id, {
      name: valid.name,
      reference_weight_g: valid.referenceWeightG,
      calories: valid.nutrition.calories,
      protein_g: valid.nutrition.proteinG,
      fat_g: valid.nutrition.fatG,
      carbs_g: valid.nutrition.carbsG,
      sodium_mg: valid.nutrition.sodiumMg,
      cholesterol_mg: valid.nutrition.cholesterolMg,
      updated_at: timestamp,
    });
    return {
      ...existing,
      name: valid.name,
      reference_weight_g: valid.referenceWeightG,
      calories: valid.nutrition.calories,
      protein_g: valid.nutrition.proteinG,
      fat_g: valid.nutrition.fatG,
      carbs_g: valid.nutrition.carbsG,
      sodium_mg: valid.nutrition.sodiumMg,
      cholesterol_mg: valid.nutrition.cholesterolMg,
      updated_at: timestamp,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new FoodRepository(transaction);
      const food = await repository.findById(id);
      if (food === null || food.deleted_at !== null) {
        throw new Error('Food was not found.');
      }
      const recipeNames = await repository.listActiveRecipeReferences(id);
      if (recipeNames.length > 0) throw new FoodInUseError(recipeNames);
      await repository.softDelete(id, this.now().toISOString());
    });
  }

  async restore(id: string): Promise<void> {
    const food = await this.find(id);
    if (food.deleted_at === null) return;
    await new FoodRepository(this.database).restore(id, this.now().toISOString());
  }
}
