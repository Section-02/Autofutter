import type { DatabaseConnection } from '@/data/database/types';

export type FoodRecord = {
  id: string;
  name: string;
  reference_weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  source_type: string;
  source_id: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NewFoodRecord = Omit<
  FoodRecord,
  'use_count' | 'last_used_at' | 'deleted_at'
>;

export class FoodRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async create(food: NewFoodRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO foods (
        id, name, reference_weight_g, calories, protein_g, fat_g, carbs_g,
        sodium_mg, cholesterol_mg, source_type, source_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      food.id,
      food.name,
      food.reference_weight_g,
      food.calories,
      food.protein_g,
      food.fat_g,
      food.carbs_g,
      food.sodium_mg,
      food.cholesterol_mg,
      food.source_type,
      food.source_id,
      food.created_at,
      food.updated_at,
    );
  }

  async findById(id: string): Promise<FoodRecord | null> {
    return this.database.getFirstAsync<FoodRecord>(
      'SELECT * FROM foods WHERE id = ?;',
      id,
    );
  }
}
