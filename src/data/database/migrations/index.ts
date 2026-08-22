import type { DatabaseConnection } from '../types';
import { initialSchemaMigration } from './001_initial_schema';
import { logNutritionBasisMigration } from './002_log_nutrition_basis';

export type Migration = {
  version: number;
  name: string;
  up(database: DatabaseConnection): Promise<void>;
};

export const migrations: readonly Migration[] = [initialSchemaMigration, logNutritionBasisMigration];
