import type { DatabaseConnection } from '../types';

export const standardFoodPortionsMigration = {
  version: 6,
  name: 'standard_food_portions',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      ALTER TABLE foods ADD COLUMN standard_portion_label TEXT
        CHECK (
          standard_portion_label IS NULL OR
          length(trim(standard_portion_label)) > 0
        );

      ALTER TABLE foods ADD COLUMN standard_portion_weight_g REAL
        CHECK (
          standard_portion_weight_g IS NULL OR
          standard_portion_weight_g > 0
        );

      CREATE TRIGGER foods_standard_portion_insert_check
      BEFORE INSERT ON foods
      WHEN
        (NEW.standard_portion_label IS NULL) <>
        (NEW.standard_portion_weight_g IS NULL)
      BEGIN
        SELECT RAISE(ABORT, 'standard portion label and weight must be provided together');
      END;

      CREATE TRIGGER foods_standard_portion_update_check
      BEFORE UPDATE OF standard_portion_label, standard_portion_weight_g ON foods
      WHEN
        (NEW.standard_portion_label IS NULL) <>
        (NEW.standard_portion_weight_g IS NULL)
      BEGIN
        SELECT RAISE(ABORT, 'standard portion label and weight must be provided together');
      END;
    `);
  },
} as const;
