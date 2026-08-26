import type { DatabaseConnection } from '../types';

export const foodPortionConversionsMigration = {
  version: 8,
  name: 'food_portion_conversions',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE food_portion_conversions (
        food_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
        label TEXT NOT NULL CHECK (length(trim(label)) > 0),
        amount REAL NOT NULL CHECK (amount > 0),
        gram_weight_g REAL NOT NULL CHECK (gram_weight_g > 0),
        volume_unit TEXT CHECK (
          volume_unit IS NULL OR
          volume_unit IN ('teaspoon', 'tablespoon', 'cup')
        ),
        source_type TEXT NOT NULL CHECK (source_type = 'usda'),
        source_id TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (food_id, sort_order),
        FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_food_portion_conversions_food
        ON food_portion_conversions(food_id, sort_order);
    `);
  },
} as const;
