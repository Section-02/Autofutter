import { initializeDatabase } from '../../src/data/database/database';
import { FoodPortionRepository } from '../../src/data/repositories/foodPortionRepository';
import { FoodRepository, type NewFoodRecord } from '../../src/data/repositories/foodRepository';
import { RecipeRepository } from '../../src/data/repositories/recipeRepository';
import { ShareExportService } from '../../src/services/backup/shareExportService';
import { ShareImportService } from '../../src/services/backup/shareImportService';
import { RecipeService } from '../../src/services/recipes/recipeService';
import { TestDatabase } from '../database/testDatabase';

const timestamp = '2026-08-26T22:00:00.000Z';

function food(id: string, name: string, calories: number): NewFoodRecord {
  return {
    id,
    name,
    reference_weight_g: 100,
    calories,
    protein_g: 10,
    fat_g: 5,
    carbs_g: 12,
    sodium_mg: 50,
    cholesterol_mg: 10,
    source_type: 'custom',
    source_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    standard_portion_label: null,
    standard_portion_weight_g: null,
  };
}

describe('ShareImportService', () => {
  let source: TestDatabase;
  let target: TestDatabase;
  let nextId: number;

  beforeEach(async () => {
    source = new TestDatabase();
    target = new TestDatabase();
    await initializeDatabase(source);
    await initializeDatabase(target);
    nextId = 0;
  });

  afterEach(() => {
    source.close();
    target.close();
  });

  function importer(): ShareImportService {
    return new ShareImportService(target, {
      createId: () => `imported-${++nextId}`,
      now: () => new Date(timestamp),
    });
  }

  it('finds case-insensitive name conflicts and keeps existing food by default choice', async () => {
    await new FoodRepository(source).create(food('incoming-salt', 'Salt', 10));
    await new FoodRepository(target).create(food('local-salt', ' salt ', 99));
    const contents = await new ShareExportService(source).createFoodContents(timestamp);
    const service = importer();

    await expect(service.preview(contents)).resolves.toMatchObject({
      kind: 'foods',
      foods: 1,
      recipes: 0,
      conflicts: [{ key: 'food:incoming-salt', existingId: 'local-salt' }],
    });
    await expect(service.import(contents, { 'food:incoming-salt': 'keep' })).resolves.toMatchObject({
      foodsKept: 1,
      foodsAdded: 0,
    });
    await expect(new FoodRepository(target).findById('local-salt')).resolves.toMatchObject({ calories: 99 });
    await expect(new FoodRepository(target).findById('incoming-salt')).resolves.toBeNull();
  });

  it('overwrites reusable food data and portions while preserving local identity and usage', async () => {
    await new FoodRepository(source).create(food('incoming-butter', 'Butter', 717));
    await new FoodPortionRepository(source).replaceForFood('incoming-butter', [{
      label: 'tablespoon', amount: 1, gramWeightG: 14.2, volumeUnit: 'tablespoon',
      sourceType: 'usda', sourceId: 'portion',
    }], timestamp);
    await new FoodRepository(target).create(food('local-butter', 'Butter', 100));
    await target.runAsync("UPDATE foods SET use_count = 7, last_used_at = '2026-08-25T12:00:00.000Z' WHERE id = 'local-butter';");
    const contents = await new ShareExportService(source).createFoodContents(timestamp);

    await importer().import(contents, { 'food:incoming-butter': 'overwrite' });

    await expect(new FoodRepository(target).findById('local-butter')).resolves.toMatchObject({
      id: 'local-butter', calories: 717, use_count: 7, last_used_at: '2026-08-25T12:00:00.000Z',
    });
    await expect(new FoodPortionRepository(target).listForFood('local-butter')).resolves.toMatchObject([
      { label: 'tablespoon', gram_weight_g: 14.2 },
    ]);
  });

  it('imports a recipe using a kept local food and remaps all internal IDs', async () => {
    await new FoodRepository(source).create(food('source-onion', 'Onion', 40));
    const sourceRecipes = new RecipeService(source, {
      createId: () => `source-${++nextId}`,
      now: () => new Date(timestamp),
    });
    const sourceRecipe = await sourceRecipes.create({
      name: 'Onion Soup', finishedWeightG: 300,
      ingredients: [{ foodId: 'source-onion', weightG: 150 }],
    });
    await sourceRecipes.createVariation(sourceRecipe.recipe.id, {
      name: 'More Onion',
      finishedWeightG: 340,
      overrides: [{ action: 'change_weight', baseIngredientId: sourceRecipe.ingredients[0]!.id, weightG: 190 }],
    });
    await new FoodRepository(target).create(food('local-onion', 'Onion', 41));
    const contents = await new ShareExportService(source).createRecipeContents(timestamp);
    nextId = 0;

    const result = await importer().import(contents, { 'food:source-onion': 'keep' });

    expect(result).toMatchObject({ foodsKept: 1, recipesAdded: 1 });
    const recipes = await new RecipeRepository(target).listActive('Onion Soup', 'name');
    expect(recipes).toHaveLength(1);
    const ingredients = await new RecipeRepository(target).listIngredients(recipes[0]!.id);
    expect(ingredients).toMatchObject([{ id: 'imported-1', food_id: 'local-onion', weight_g: 150 }]);
    const variations = await new RecipeRepository(target).listVariations(recipes[0]!.id);
    expect(variations).toMatchObject([{ id: 'imported-2', name: 'More Onion', finished_weight_g: 340 }]);
    await expect(new RecipeRepository(target).listVariationOverrides('imported-2')).resolves.toMatchObject([
      { id: 'imported-3', action: 'change_weight', base_recipe_ingredient_id: 'imported-1', weight_g: 190 },
    ]);
  });

  it('overwrites a recipe in place while preserving its usage and historical recipe link', async () => {
    await new FoodRepository(source).create(food('source-food', 'Beans', 120));
    const sourceRecipes = new RecipeService(source, {
      createId: () => `source-${++nextId}`,
      now: () => new Date(timestamp),
    });
    await sourceRecipes.create({ name: 'Chili', finishedWeightG: 400, ingredients: [{ foodId: 'source-food', weightG: 250 }] });

    await new FoodRepository(target).create(food('local-food', 'Beans', 121));
    const targetRecipes = new RecipeService(target, {
      createId: () => `local-${++nextId}`,
      now: () => new Date(timestamp),
    });
    const existing = await targetRecipes.create({ name: 'Chili', finishedWeightG: 100, ingredients: [{ foodId: 'local-food', weightG: 50 }] });
    await target.runAsync('UPDATE recipes SET use_count = 4 WHERE id = ?;', existing.recipe.id);
    await target.runAsync(
      `INSERT INTO food_log_entries (
        id, log_date, logged_at, entry_type, source_recipe_id, display_name_snapshot,
        amount_g, calories, protein_g, fat_g, carbs_g, sodium_mg, cholesterol_mg,
        is_estimated, created_at, updated_at, nutrition_basis_weight_g,
        nutrition_basis_calories, nutrition_basis_protein_g, nutrition_basis_fat_g,
        nutrition_basis_carbs_g, nutrition_basis_sodium_mg, nutrition_basis_cholesterol_mg
      ) VALUES ('history', '2026-08-26', ?, 'recipe', ?, 'Old Chili', 100, 100,
        10, 5, 12, 50, 10, 0, ?, ?, 100, 100, 10, 5, 12, 50, 10);`,
      timestamp, existing.recipe.id, timestamp, timestamp,
    );
    const contents = await new ShareExportService(source).createRecipeContents(timestamp);
    const preview = await importer().preview(contents);
    const foodConflict = preview.conflicts.find(({ kind }) => kind === 'food')!;
    const recipeConflict = preview.conflicts.find(({ kind }) => kind === 'recipe')!;

    const result = await importer().import(contents, {
      [foodConflict.key]: 'keep',
      [recipeConflict.key]: 'overwrite',
    });

    expect(result.recipesOverwritten).toBe(1);
    await expect(new RecipeRepository(target).findById(existing.recipe.id)).resolves.toMatchObject({
      id: existing.recipe.id, finished_weight_g: 400, use_count: 4,
    });
    await expect(new RecipeRepository(target).listIngredients(existing.recipe.id)).resolves.toMatchObject([
      { food_id: 'local-food', weight_g: 250 },
    ]);
    await expect(target.getFirstAsync('SELECT source_recipe_id, display_name_snapshot FROM food_log_entries WHERE id = ?;', 'history')).resolves.toEqual({
      source_recipe_id: existing.recipe.id,
      display_name_snapshot: 'Old Chili',
    });
  });

  it('rolls back before adding anything when a conflict choice is missing', async () => {
    await new FoodRepository(source).create(food('conflict', 'Salt', 1));
    await new FoodRepository(source).create(food('new-food', 'Pepper', 2));
    await new FoodRepository(target).create(food('local', 'Salt', 3));
    const contents = await new ShareExportService(source).createFoodContents(timestamp);

    await expect(importer().import(contents, {})).rejects.toThrow('Choose how to resolve every import conflict.');
    await expect(new FoodRepository(target).findById('new-food')).resolves.toBeNull();
  });
});
