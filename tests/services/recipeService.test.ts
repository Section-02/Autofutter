import { initializeDatabase } from '../../src/data/database/database';
import {
  FoodRepository,
  type NewFoodRecord,
} from '../../src/data/repositories/foodRepository';
import { RecipeRepository } from '../../src/data/repositories/recipeRepository';
import {
  RecipeRestoreError,
  RecipeService,
  type VariationOverrideInput,
} from '../../src/services/recipes/recipeService';
import { TestDatabase } from '../database/testDatabase';

const timestamp = '2026-08-22T20:00:00.000Z';

function food(id: string, name: string, calories: number): NewFoodRecord {
  return {
    id,
    name,
    reference_weight_g: 100,
    calories,
    protein_g: calories / 10,
    fat_g: calories / 20,
    carbs_g: calories / 8,
    sodium_mg: calories * 2,
    cholesterol_mg: calories / 4,
    source_type: 'custom',
    source_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

describe('RecipeService', () => {
  let database: TestDatabase;
  let service: RecipeService;
  let nextId: number;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    const foods = new FoodRepository(database);
    await foods.create(food('beef', 'Ground Beef', 250));
    await foods.create(food('black-beans', 'Black Beans', 125));
    await foods.create(food('pinto-beans', 'Pinto Beans', 140));
    await foods.create(food('onion', 'Onion', 40));
    await foods.create(food('garlic', 'Garlic', 150));
    nextId = 0;
    service = new RecipeService(database, {
      createId: () => `id-${++nextId}`,
      now: () => new Date(timestamp),
    });
  });

  afterEach(() => database.close());

  it('saves incomplete recipes and calculates completed recipes per 100 grams', async () => {
    const incomplete = await service.create({
      name: 'Vegetable Soup',
      finishedWeightG: null,
      ingredients: [],
    });
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.nutritionPer100G).toBeNull();

    const complete = await service.create({
      name: 'Chili',
      finishedWeightG: 1_653,
      ingredients: [
        { foodId: 'beef', weightG: 500 },
        { foodId: 'black-beans', weightG: 400 },
        { foodId: 'onion', weightG: 150 },
      ],
    });
    expect(complete.isComplete).toBe(true);
    expect(complete.exactNutrition?.calories).toBe(1_810);
    expect(complete.nutritionPer100G?.calories).toBeCloseTo(
      1_810 * (100 / 1_653),
      12,
    );
  });

  it('preserves ingredient ids during edits and removes only invalidated overrides', async () => {
    const recipe = await service.create({
      name: 'Chili',
      finishedWeightG: 1_800,
      ingredients: [
        { foodId: 'beef', weightG: 500 },
        { foodId: 'black-beans', weightG: 400 },
        { foodId: 'onion', weightG: 150 },
      ],
    });
    const beefLine = recipe.ingredients[0]!;
    const beansLine = recipe.ingredients[1]!;
    const variation = await service.createVariation(recipe.recipe.id, {
      name: 'No Beans',
      finishedWeightG: 1_400,
      overrides: [
        { action: 'remove', baseIngredientId: beansLine.id },
        { action: 'change_weight', baseIngredientId: beefLine.id, weightG: 450 },
      ],
    });

    const edited = await service.update(recipe.recipe.id, {
      name: 'Chili',
      finishedWeightG: 1_500,
      ingredients: [
        { id: beefLine.id, foodId: 'beef', weightG: 475 },
        { id: beansLine.id, foodId: 'pinto-beans', weightG: 410 },
      ],
    });

    expect(edited.ingredients.map(({ id }) => id)).toEqual([
      beefLine.id,
      beansLine.id,
    ]);
    const overrides = await new RecipeRepository(database).listVariationOverrides(
      variation.variation.id,
    );
    expect(overrides).toHaveLength(2);

    await service.update(recipe.recipe.id, {
      name: 'Chili',
      finishedWeightG: 1_100,
      ingredients: [{ id: beefLine.id, foodId: 'beef', weightG: 475 }],
    });
    const afterRemoval =
      await new RecipeRepository(database).listVariationOverrides(
        variation.variation.id,
      );
    expect(afterRemoval.map(({ action }) => action)).toEqual(['change_weight']);
  });

  it('persists and resolves replace, remove, add, and change-weight overrides', async () => {
    const recipe = await service.create({
      name: 'Chili',
      finishedWeightG: 1_800,
      ingredients: [
        { foodId: 'beef', weightG: 500 },
        { foodId: 'black-beans', weightG: 400 },
        { foodId: 'onion', weightG: 150 },
      ],
    });
    const overrides: VariationOverrideInput[] = [
      {
        action: 'replace',
        baseIngredientId: recipe.ingredients[1]!.id,
        foodId: 'pinto-beans',
        weightG: 410.25,
      },
      {
        action: 'remove',
        baseIngredientId: recipe.ingredients[2]!.id,
      },
      {
        action: 'add',
        foodId: 'garlic',
        weightG: 10.5,
      },
      {
        action: 'change_weight',
        baseIngredientId: recipe.ingredients[0]!.id,
        weightG: 475.75,
      },
    ];

    const variation = await service.createVariation(recipe.recipe.id, {
      name: 'Pinto Beans',
      finishedWeightG: 1_920,
      overrides,
    });

    expect(
      variation.resolvedIngredients.map(({ foodId, weightG }) => ({
        foodId,
        weightG,
      })),
    ).toEqual([
      { foodId: 'beef', weightG: 475.75 },
      { foodId: 'pinto-beans', weightG: 410.25 },
      { foodId: 'garlic', weightG: 10.5 },
    ]);
    expect(variation.overrides.map(({ action }) => action).sort()).toEqual([
      'add',
      'change_weight',
      'remove',
      'replace',
    ]);
    expect(variation.nutritionPer100G.calories).toBeGreaterThan(0);
  });

  it('soft deletes and restores recipes only when ingredient foods are active', async () => {
    const recipe = await service.create({
      name: 'Beef',
      finishedWeightG: 500,
      ingredients: [{ foodId: 'beef', weightG: 500 }],
    });
    await service.softDelete(recipe.recipe.id);
    await new FoodRepository(database).softDelete('beef', timestamp);

    await expect(service.restore(recipe.recipe.id)).rejects.toEqual(
      new RecipeRestoreError(['Ground Beef']),
    );

    await new FoodRepository(database).restore('beef', timestamp);
    await service.restore(recipe.recipe.id);
    await expect(service.load(recipe.recipe.id)).resolves.toMatchObject({
      recipe: { deleted_at: null },
      isComplete: true,
    });
  });
});
