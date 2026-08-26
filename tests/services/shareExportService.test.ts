import { initializeDatabase } from '../../src/data/database/database';
import { FoodPortionRepository } from '../../src/data/repositories/foodPortionRepository';
import { FoodRepository, type NewFoodRecord } from '../../src/data/repositories/foodRepository';
import { recipeShareDocumentSchema } from '../../src/schemas/shareExport';
import { ShareExportService } from '../../src/services/backup/shareExportService';
import { RecipeService } from '../../src/services/recipes/recipeService';
import { TestDatabase } from '../database/testDatabase';

const timestamp = '2026-08-26T22:00:00.000Z';

function food(id: string, name: string): NewFoodRecord {
  return {
    id,
    name,
    reference_weight_g: 100,
    calories: 100,
    protein_g: 10,
    fat_g: 5,
    carbs_g: 12,
    sodium_mg: 50,
    cholesterol_mg: 10,
    source_type: 'custom',
    source_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    standard_portion_label: id === 'ingredient' ? 'piece' : null,
    standard_portion_weight_g: id === 'ingredient' ? 30 : null,
  };
}

describe('ShareExportService', () => {
  let database: TestDatabase;
  let service: ShareExportService;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    const foods = new FoodRepository(database);
    await foods.create(food('ingredient', 'Recipe Ingredient'));
    await foods.create(food('variation-food', 'Variation Food'));
    await foods.create(food('unrelated', 'Unrelated Food'));
    await foods.create(food('deleted', 'Deleted Food'));
    await foods.softDelete('deleted', timestamp);
    await new FoodPortionRepository(database).replaceForFood('ingredient', [{
      label: 'cup',
      amount: 1,
      gramWeightG: 120,
      volumeUnit: 'cup',
      sourceType: 'usda',
      sourceId: 'usda-portion',
    }], timestamp);
    service = new ShareExportService(database);
  });

  afterEach(() => database.close());

  it('exports active foods and their stored conversions without personal history', async () => {
    const document = await service.createFoodDocument(timestamp);

    expect(document).toMatchObject({ format: 'autofutter-share', version: 1, kind: 'foods' });
    expect(document.data.foods.map(({ id }) => id)).toEqual(['ingredient', 'unrelated', 'variation-food']);
    expect(document.data.foodPortions).toHaveLength(1);
    expect(document.data.foods.find(({ id }) => id === 'ingredient')).toMatchObject({
      standard_portion_label: 'piece',
      standard_portion_weight_g: 30,
    });
    expect(JSON.stringify(document)).not.toContain('foodLogs');
    expect(JSON.stringify(document)).not.toContain('preferences');
  });

  it('exports recipes with only the foods and conversions required to recreate them', async () => {
    let nextId = 0;
    const recipes = new RecipeService(database, {
      createId: () => `generated-${++nextId}`,
      now: () => new Date(timestamp),
    });
    const recipe = await recipes.create({
      name: 'Shared Recipe',
      finishedWeightG: 300,
      ingredients: [{ foodId: 'ingredient', weightG: 150 }],
    });
    await recipes.createVariation(recipe.recipe.id, {
      name: 'Variation',
      finishedWeightG: 320,
      overrides: [{ action: 'add', foodId: 'variation-food', weightG: 20 }],
    });

    const document = await service.createRecipeDocument(timestamp);

    expect(document).toMatchObject({ format: 'autofutter-share', version: 1, kind: 'recipes' });
    expect(document.data.recipes.map(({ name }) => name)).toEqual(['Shared Recipe']);
    expect(document.data.recipeIngredients).toHaveLength(1);
    expect(document.data.recipeVariations.map(({ name }) => name)).toEqual(['Variation']);
    expect(document.data.variationOverrides).toHaveLength(1);
    expect(document.data.foods.map(({ id }) => id)).toEqual(['ingredient', 'variation-food']);
    expect(document.data.foodPortions).toHaveLength(1);
    expect(document.data.foods.some(({ id }) => id === 'unrelated')).toBe(false);
  });

  it('serializes schema-valid, human-readable JSON', async () => {
    const contents = await service.createFoodContents(timestamp);

    expect(contents).toContain('\n  "format": "autofutter-share"');
    expect(JSON.parse(contents)).toMatchObject({ kind: 'foods', createdAt: timestamp });
  });

  it('rejects a recipe document with missing food dependencies', async () => {
    let nextId = 0;
    const recipes = new RecipeService(database, {
      createId: () => `schema-${++nextId}`,
      now: () => new Date(timestamp),
    });
    await recipes.create({
      name: 'Dependency Check',
      finishedWeightG: 100,
      ingredients: [{ foodId: 'ingredient', weightG: 100 }],
    });
    const document = await service.createRecipeDocument(timestamp);

    expect(() => recipeShareDocumentSchema.parse({
      ...document,
      data: { ...document.data, foods: [] },
    })).toThrow();
  });
});
