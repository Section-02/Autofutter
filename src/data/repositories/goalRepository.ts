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
}
