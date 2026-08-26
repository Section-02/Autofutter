import type { DatabaseConnection } from '@/data/database/types';
import type { FreedomVolumeUnit } from '@/domain/measurements/freedomUnits';

export type FoodPortionRecord = Readonly<{
  food_id: string;
  sort_order: number;
  label: string;
  amount: number;
  gram_weight_g: number;
  volume_unit: FreedomVolumeUnit | null;
  source_type: 'usda';
  source_id: string | null;
  created_at: string;
}>;

export type NewFoodPortion = Readonly<{
  label: string;
  amount: number;
  gramWeightG: number;
  volumeUnit: FreedomVolumeUnit | null;
  sourceType: 'usda';
  sourceId: string | null;
}>;

export class FoodPortionRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async listForFood(foodId: string): Promise<FoodPortionRecord[]> {
    return this.database.getAllAsync<FoodPortionRecord>(
      `SELECT * FROM food_portion_conversions
       WHERE food_id = ? ORDER BY sort_order;`,
      foodId,
    );
  }

  async replaceForFood(
    foodId: string,
    portions: readonly NewFoodPortion[],
    createdAt: string,
  ): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM food_portion_conversions WHERE food_id = ?;',
      foodId,
    );
    for (const [index, portion] of portions.entries()) {
      await this.database.runAsync(
        `INSERT INTO food_portion_conversions (
          food_id, sort_order, label, amount, gram_weight_g, volume_unit,
          source_type, source_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        foodId,
        index,
        portion.label,
        portion.amount,
        portion.gramWeightG,
        portion.volumeUnit,
        portion.sourceType,
        portion.sourceId,
        createdAt,
      );
    }
  }
}
