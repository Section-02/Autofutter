import type { DatabaseConnection } from '../types';

export const initialSchemaMigration = {
  version: 1,
  name: 'initial_schema',
  async up(database: DatabaseConnection): Promise<void> {
    await database.execAsync(`
      CREATE TABLE foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        reference_weight_g REAL NOT NULL CHECK (reference_weight_g > 0),
        calories REAL NOT NULL CHECK (calories >= 0),
        protein_g REAL NOT NULL CHECK (protein_g >= 0),
        fat_g REAL NOT NULL CHECK (fat_g >= 0),
        carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
        sodium_mg REAL NOT NULL CHECK (sodium_mg >= 0),
        cholesterol_mg REAL NOT NULL CHECK (cholesterol_mg >= 0),
        source_type TEXT NOT NULL,
        source_id TEXT,
        use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE recipes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        finished_weight_g REAL CHECK (finished_weight_g IS NULL OR finished_weight_g > 0),
        use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
        food_id TEXT NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
        weight_g REAL NOT NULL CHECK (weight_g > 0),
        sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE recipe_variations (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        finished_weight_g REAL CHECK (finished_weight_g IS NULL OR finished_weight_g > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE recipe_variation_overrides (
        id TEXT PRIMARY KEY NOT NULL,
        variation_id TEXT NOT NULL REFERENCES recipe_variations(id) ON DELETE CASCADE,
        action TEXT NOT NULL CHECK (action IN ('replace', 'remove', 'add', 'change_weight')),
        base_recipe_ingredient_id TEXT REFERENCES recipe_ingredients(id) ON DELETE RESTRICT,
        food_id TEXT REFERENCES foods(id) ON DELETE RESTRICT,
        weight_g REAL CHECK (weight_g IS NULL OR weight_g > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE food_log_entries (
        id TEXT PRIMARY KEY NOT NULL,
        log_date TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        entry_type TEXT NOT NULL CHECK (entry_type IN ('food', 'recipe', 'recipe_variation', 'quick')),
        source_food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
        source_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
        source_variation_id TEXT REFERENCES recipe_variations(id) ON DELETE SET NULL,
        display_name_snapshot TEXT NOT NULL,
        amount_g REAL CHECK (amount_g IS NULL OR amount_g > 0),
        calories INTEGER NOT NULL CHECK (calories >= 0),
        protein_g INTEGER CHECK (protein_g IS NULL OR protein_g >= 0),
        fat_g INTEGER CHECK (fat_g IS NULL OR fat_g >= 0),
        carbs_g INTEGER CHECK (carbs_g IS NULL OR carbs_g >= 0),
        sodium_mg INTEGER CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
        cholesterol_mg INTEGER CHECK (cholesterol_mg IS NULL OR cholesterol_mg >= 0),
        is_estimated INTEGER NOT NULL DEFAULT 0 CHECK (is_estimated IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE daily_nutrition_summaries (
        date TEXT PRIMARY KEY NOT NULL,
        calories INTEGER NOT NULL CHECK (calories >= 0),
        protein_g INTEGER CHECK (protein_g IS NULL OR protein_g >= 0),
        fat_g INTEGER CHECK (fat_g IS NULL OR fat_g >= 0),
        carbs_g INTEGER CHECK (carbs_g IS NULL OR carbs_g >= 0),
        sodium_mg INTEGER CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
        cholesterol_mg INTEGER CHECK (cholesterol_mg IS NULL OR cholesterol_mg >= 0),
        has_partial_nutrition INTEGER NOT NULL DEFAULT 0 CHECK (has_partial_nutrition IN (0, 1)),
        updated_at TEXT NOT NULL
      );

      CREATE TABLE nutrition_goals (
        id TEXT PRIMARY KEY NOT NULL,
        effective_date TEXT NOT NULL UNIQUE,
        calorie_target INTEGER NOT NULL CHECK (calorie_target > 0),
        protein_minimum_g INTEGER NOT NULL CHECK (protein_minimum_g > 0),
        calorie_tolerance_percent INTEGER NOT NULL CHECK (
          calorie_tolerance_percent >= 0 AND calorie_tolerance_percent <= 100
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE weigh_ins (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        weight_lb REAL NOT NULL CHECK (weight_lb > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX foods_active_name_idx ON foods(deleted_at, name COLLATE NOCASE);
      CREATE INDEX foods_usage_idx ON foods(deleted_at, use_count DESC, last_used_at DESC);
      CREATE INDEX recipes_active_name_idx ON recipes(deleted_at, name COLLATE NOCASE);
      CREATE INDEX recipe_ingredients_recipe_idx ON recipe_ingredients(recipe_id, sort_order);
      CREATE INDEX recipe_variations_recipe_idx ON recipe_variations(recipe_id, deleted_at);
      CREATE INDEX variation_overrides_variation_idx ON recipe_variation_overrides(variation_id);
      CREATE INDEX food_log_entries_date_idx ON food_log_entries(log_date, logged_at);
      CREATE INDEX food_log_entries_logged_at_idx ON food_log_entries(logged_at);
      CREATE INDEX nutrition_goals_effective_date_idx ON nutrition_goals(effective_date DESC);
      CREATE INDEX weigh_ins_date_idx ON weigh_ins(date DESC);
    `);
  },
} as const;
