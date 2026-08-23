import type { DatabaseConnection } from '@/data/database/types';

export type GoalRecord = {
  id: string;
  effective_date: string;
  calorie_target: number;
  protein_minimum_g: number;
  calorie_tolerance_percent: number;
  created_at: string;
  updated_at: string;
};

export class GoalRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findForDate(date: string): Promise<GoalRecord | null> {
    return this.database.getFirstAsync<GoalRecord>(
      `SELECT * FROM nutrition_goals
       WHERE effective_date <= ?
       ORDER BY effective_date DESC
       LIMIT 1;`,
      date,
    );
  }

  async findByEffectiveDate(date: string): Promise<GoalRecord | null> {
    return this.database.getFirstAsync<GoalRecord>(
      'SELECT * FROM nutrition_goals WHERE effective_date = ?;',
      date,
    );
  }

  async upsert(record: GoalRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO nutrition_goals (
         id, effective_date, calorie_target, protein_minimum_g,
         calorie_tolerance_percent, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(effective_date) DO UPDATE SET
         calorie_target = excluded.calorie_target,
         protein_minimum_g = excluded.protein_minimum_g,
         calorie_tolerance_percent = excluded.calorie_tolerance_percent,
         updated_at = excluded.updated_at;`,
      record.id,
      record.effective_date,
      record.calorie_target,
      record.protein_minimum_g,
      record.calorie_tolerance_percent,
      record.created_at,
      record.updated_at,
    );
  }
}
