import { initializeDatabase } from '../../src/data/database/database';
import { DailySummaryRepository } from '../../src/data/repositories/dailySummaryRepository';
import { RecipeRepository } from '../../src/data/repositories/recipeRepository';
import { FoodLogRepository } from '../../src/data/repositories/foodLogRepository';
import {
  FoodRepository,
  type NewFoodRecord,
} from '../../src/data/repositories/foodRepository';
import {
  roundLoggedNutrition,
  scaleNutrition,
} from '../../src/domain/nutrition/nutritionCalculator';
import { calculateRecipeNutrition } from '../../src/domain/nutrition/recipeCalculator';
import type { WeightedIngredient } from '../../src/domain/nutrition/nutritionTypes';
import { FoodLoggingService } from '../../src/services/logging/foodLoggingService';
import { RecipeService } from '../../src/services/recipes/recipeService';
import { TestDatabase } from '../database/testDatabase';

const timestamp = '2026-08-21T19:30:00.000Z';

function testFood(id = 'food-id'): NewFoodRecord {
  return {
    id,
    name: 'Awkward Test Food',
    reference_weight_g: 33.333,
    calories: 101.25,
    protein_g: 9.125,
    fat_g: 2.5,
    carbs_g: 11.75,
    sodium_mg: 187.4,
    cholesterol_mg: 16.2,
    source_type: 'custom',
    source_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

describe('FoodLoggingService', () => {
  let database: TestDatabase;
  let service: FoodLoggingService;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    service = new FoodLoggingService(database, {
      createId: () => 'log-id',
      now: () => new Date(timestamp),
    });
  });

  afterEach(() => database.close());

  it('logs a Food snapshot and makes the daily summary equal visible entry totals', async () => {
    const food = testFood();
    await new FoodRepository(database).create(food);

    const entry = await service.addWeighedEntry({
      kind: 'food',
      sourceId: food.id,
      amountG: 187,
      logDate: '2026-08-21',
    });
    const expected = roundLoggedNutrition(
      scaleNutrition(
        {
          calories: food.calories,
          proteinG: food.protein_g,
          fatG: food.fat_g,
          carbsG: food.carbs_g,
          sodiumMg: food.sodium_mg,
          cholesterolMg: food.cholesterol_mg,
        },
        187,
        food.reference_weight_g,
      ),
    );
    const summary = await new DailySummaryRepository(database).findByDate(
      '2026-08-21',
    );

    expect(entry).toMatchObject({
      display_name_snapshot: food.name,
      amount_g: 187,
      calories: expected.calories,
      protein_g: expected.proteinG,
      nutrition_basis_weight_g: 33.333,
      nutrition_basis_calories: 101.25,
    });
    expect(summary).toMatchObject({
      calories: entry.calories,
      protein_g: entry.protein_g,
      fat_g: entry.fat_g,
      carbs_g: entry.carbs_g,
      sodium_mg: entry.sodium_mg,
      cholesterol_mg: entry.cholesterol_mg,
      has_partial_nutrition: 0,
    });
  });

  it('keeps history unchanged after Food edits and edits grams from the original basis', async () => {
    const food = testFood();
    await new FoodRepository(database).create(food);
    const original = await service.addWeighedEntry({
      kind: 'food',
      sourceId: food.id,
      amountG: 187,
      logDate: '2026-08-21',
    });

    await database.runAsync(
      'UPDATE foods SET calories = ?, protein_g = ?, updated_at = ? WHERE id = ?;',
      999,
      999,
      '2026-08-21T20:00:00.000Z',
      food.id,
    );
    expect(await new FoodLogRepository(database).findById(original.id)).toMatchObject({
      calories: original.calories,
      protein_g: original.protein_g,
      nutrition_basis_calories: food.calories,
      nutrition_basis_protein_g: food.protein_g,
    });

    const updated = await service.updateWeighedEntry(original.id, 100);
    const expected = roundLoggedNutrition(
      scaleNutrition(
        {
          calories: food.calories,
          proteinG: food.protein_g,
          fatG: food.fat_g,
          carbsG: food.carbs_g,
          sodiumMg: food.sodium_mg,
          cholesterolMg: food.cholesterol_mg,
        },
        100,
        food.reference_weight_g,
      ),
    );
    expect(updated).toMatchObject({
      amount_g: 100,
      calories: expected.calories,
      protein_g: expected.proteinG,
    });
  });

  it('recalculates the summary after edit and delete', async () => {
    const food = testFood();
    await new FoodRepository(database).create(food);
    await service.addWeighedEntry({
      kind: 'food', sourceId: food.id, amountG: 50, logDate: '2026-08-21',
    });
    const updated = await service.updateWeighedEntry('log-id', 75);
    expect(
      await new DailySummaryRepository(database).findByDate('2026-08-21'),
    ).toMatchObject({ calories: updated.calories });

    await service.deleteEntry('log-id');
    expect(
      await new DailySummaryRepository(database).findByDate('2026-08-21'),
    ).toMatchObject({ calories: 0, protein_g: 0, has_partial_nutrition: 0 });
  });

  it('calculates a completed Recipe portion and logs its exact-total snapshot', async () => {
    const first = testFood('first-food');
    const second = { ...testFood('second-food'), reference_weight_g: 112,
      calories: 254.4, protein_g: 19.75, fat_g: 20.2, carbs_g: 0.125,
      sodium_mg: 72.6, cholesterol_mg: 66.6 };
    await new FoodRepository(database).create(first);
    await new FoodRepository(database).create(second);
    await database.runAsync(
      `INSERT INTO recipes (id, name, finished_weight_g, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      'recipe-id', 'Exact Recipe', 1_653, timestamp, timestamp,
    );
    await database.runAsync(
      `INSERT INTO recipe_ingredients
       (id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?);`,
      'ingredient-1', 'recipe-id', first.id, 187, 0, timestamp, timestamp,
      'ingredient-2', 'recipe-id', second.id, 73.4, 1, timestamp, timestamp,
    );

    const entry = await service.addWeighedEntry({
      kind: 'recipe', sourceId: 'recipe-id', amountG: 187, logDate: '2026-08-21',
    });
    const ingredients: WeightedIngredient[] = [
      { id: 'ingredient-1', foodId: first.id, weightG: 187,
        referenceWeightG: first.reference_weight_g,
        nutrition: { calories: first.calories, proteinG: first.protein_g,
          fatG: first.fat_g, carbsG: first.carbs_g, sodiumMg: first.sodium_mg,
          cholesterolMg: first.cholesterol_mg } },
      { id: 'ingredient-2', foodId: second.id, weightG: 73.4,
        referenceWeightG: second.reference_weight_g,
        nutrition: { calories: second.calories, proteinG: second.protein_g,
          fatG: second.fat_g, carbsG: second.carbs_g, sodiumMg: second.sodium_mg,
          cholesterolMg: second.cholesterol_mg } },
    ];
    const exactTotal = calculateRecipeNutrition(ingredients);
    const expected = roundLoggedNutrition(scaleNutrition(exactTotal, 187, 1_653));

    expect(entry).toMatchObject({
      entry_type: 'recipe', source_recipe_id: 'recipe-id', amount_g: 187,
      calories: expected.calories,
      nutrition_basis_weight_g: 1_653,
      nutrition_basis_calories: exactTotal.calories,
    });

    await new RecipeService(database, {
      now: () => new Date('2026-08-21T21:00:00.000Z'),
    }).update('recipe-id', {
      name: 'Edited Recipe',
      finishedWeightG: 1_200,
      ingredients: [
        { id: 'ingredient-1', foodId: first.id, weightG: 100 },
        { id: 'ingredient-2', foodId: second.id, weightG: 50 },
      ],
    });
    await expect(new FoodLogRepository(database).findById(entry.id)).resolves.toMatchObject({
      display_name_snapshot: 'Exact Recipe',
      calories: expected.calories,
      nutrition_basis_weight_g: 1_653,
      nutrition_basis_calories: exactTotal.calories,
    });
  });

  it('resolves, snapshots, and logs a Recipe Variation by grams', async () => {
    const beef = testFood('beef');
    const beans = { ...testFood('beans'), calories: 130 };
    const pinto = { ...testFood('pinto'), calories: 145 };
    await new FoodRepository(database).create(beef);
    await new FoodRepository(database).create(beans);
    await new FoodRepository(database).create(pinto);
    let id = 0;
    const recipes = new RecipeService(database, {
      createId: () => "recipe-id-" + ++id,
      now: () => new Date(timestamp),
    });
    const recipe = await recipes.create({
      name: 'Chili',
      finishedWeightG: 1_653,
      ingredients: [
        { foodId: beef.id, weightG: 500 },
        { foodId: beans.id, weightG: 400 },
      ],
    });
    const variation = await recipes.createVariation(recipe.recipe.id, {
      name: 'Pinto Beans',
      finishedWeightG: 1_700,
      overrides: [{
        action: 'replace',
        baseIngredientId: recipe.ingredients[1]!.id,
        foodId: pinto.id,
      }],
    });

    const entry = await service.addWeighedEntry({
      kind: 'recipe_variation',
      sourceId: variation.variation.id,
      amountG: 187,
      logDate: '2026-08-21',
    });
    const expected = roundLoggedNutrition(
      scaleNutrition(variation.exactNutrition, 187, 1_700),
    );

    expect(entry).toMatchObject({
      entry_type: 'recipe_variation',
      source_recipe_id: recipe.recipe.id,
      source_variation_id: variation.variation.id,
      display_name_snapshot: 'Chili — Pinto Beans',
      calories: expected.calories,
      nutrition_basis_calories: variation.exactNutrition.calories,
    });
    expect(await new RecipeRepository(database).findById(recipe.recipe.id)).toMatchObject({
      use_count: 1,
    });

    await recipes.updateVariation(variation.variation.id, {
      name: 'Pinto Beans',
      finishedWeightG: 1_700,
      overrides: [{
        action: 'change_weight',
        baseIngredientId: recipe.ingredients[0]!.id,
        weightG: 250,
      }],
    });
    await expect(new FoodLogRepository(database).findById(entry.id)).resolves.toMatchObject({
      calories: expected.calories,
      nutrition_basis_calories: variation.exactNutrition.calories,
    });
  });

  it('rejects future logging', async () => {
    await new FoodRepository(database).create(testFood());
    await expect(service.addWeighedEntry({
      kind: 'food', sourceId: 'food-id', amountG: 10, logDate: '2026-08-22',
    })).rejects.toThrow('Future logging is not supported.');
  });
});
