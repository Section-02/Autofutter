import type { DatabaseConnection } from '../types';
import { initialSchemaMigration } from './001_initial_schema';

export type Migration = {
  version: number;
  name: string;
  up(database: DatabaseConnection): Promise<void>;
};

export const migrations: readonly Migration[] = [initialSchemaMigration];
