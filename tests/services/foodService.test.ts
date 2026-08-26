import { initializeDatabase } from '../../src/data/database/database';
import { FoodRepository } from '../../src/data/repositories/foodRepository';
import { FoodPortionRepository } from '../../src/data/repositories/foodPortionRepository';
import {
  FoodInUseError,
  FoodService,
  FoodValidationError,
  type FoodInput,
} from '../../src/services/foods/foodService';
import { TestDatabase } from '../database/testDatabase';

const now = new Date('2026-08-22T20:00:00.000Z');

function input(name = 'Chicken Breast'): FoodInput {
  return {
    name,
    referenceWeightG: 150,
    nutrition: {
      calories: 248.4,
      proteinG: 46.2,
      fatG: 5.1,
      carbsG: 0,
      sodiumMg: 111.5,
      cholesterolMg: 128.2,
    },
    source: { type: 'custom', id: null },
    standardPortion: null,
  };
}

describe('FoodService', () => {
  let database: TestDatabase;
  let service: FoodService;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    service = new FoodService(database, {
      createId: () => 'food-id',
      now: () => now,
    });
  });

  afterEach(() => database.close());

  it('creates, updates, searches, and sorts reusable foods', async () => {
    const created = await service.create(input('  Chicken Breast  '));
    expect(created).toMatchObject({
      id: 'food-id',
      name: 'Chicken Breast',
      reference_weight_g: 150,
      calories: 248.4,
    });

    const updated = await service.update(created.id, {
      ...input('Roasted Chicken'),
      nutrition: { ...input().nutrition, calories: 255.25 },
    });
    expect(updated.name).toBe('Roasted Chicken');
    await expect(service.list('roasted', 'name')).resolves.toHaveLength(1);
  });

  it('requires complete valid nutrition and a positive reference weight', async () => {
    await expect(
      service.create({ ...input(), referenceWeightG: 0 }),
    ).rejects.toThrow(FoodValidationError);
    await expect(
      service.create({
        ...input(),
        nutrition: { ...input().nutrition, sodiumMg: Number.NaN },
      }),
    ).rejects.toThrow('Sodium is required. Enter 0 if the value is truly zero.');
  });

  it('accepts true zero nutrient values', async () => {
    const created = await service.create({
      ...input(),
      nutrition: { ...input().nutrition, sodiumMg: 0, cholesterolMg: 0 },
    });
    expect(created).toMatchObject({ sodium_mg: 0, cholesterol_mg: 0 });
  });

  it('creates, trims, updates, and removes an optional standard portion', async () => {
    const created = await service.create({
      ...input('String Cheese'),
      standardPortion: { label: '  stick  ', weightG: 28 },
    });
    expect(created).toMatchObject({
      standard_portion_label: 'stick',
      standard_portion_weight_g: 28,
    });

    const updated = await service.update(created.id, {
      ...input('String Cheese'),
      standardPortion: null,
    });
    expect(updated).toMatchObject({
      standard_portion_label: null,
      standard_portion_weight_g: null,
    });
  });

  it('requires a complete positive standard portion when one is provided', async () => {
    await expect(service.create({
      ...input(),
      standardPortion: { label: '', weightG: 28 },
    })).rejects.toThrow('Standard portion name is required.');
    await expect(service.create({
      ...input(),
      standardPortion: { label: 'stick', weightG: 0 },
    })).rejects.toThrow('Standard portion weight must be greater than zero.');
  });

  it('stores USDA portion conversions with the food for offline use', async () => {
    await service.create({
      ...input('Broccoli'),
      source: { type: 'usda', id: '170379' },
      portionConversions: [{
        label: ' cup, chopped ',
        amount: 0.5,
        gramWeightG: 44,
        volumeUnit: 'cup',
        sourceType: 'usda',
        sourceId: '135806',
      }],
    });

    await expect(new FoodPortionRepository(database).listForFood('food-id')).resolves.toEqual([{
      food_id: 'food-id',
      sort_order: 0,
      label: 'cup, chopped',
      amount: 0.5,
      gram_weight_g: 44,
      volume_unit: 'cup',
      source_type: 'usda',
      source_id: '135806',
      created_at: now.toISOString(),
    }]);
  });

  it('does not accept automatic portions for a custom food', async () => {
    await expect(service.create({
      ...input(),
      portionConversions: [{
        label: 'cup', amount: 1, gramWeightG: 100, volumeUnit: 'cup',
        sourceType: 'usda', sourceId: null,
      }],
    })).rejects.toThrow('Automatic portions require a USDA food source.');
  });

  it('soft deletes and restores a food', async () => {
    await service.create(input());
    await service.softDelete('food-id');

    await expect(service.list()).resolves.toEqual([]);
    await expect(service.listDeleted()).resolves.toHaveLength(1);

    await service.restore('food-id');
    await expect(service.list()).resolves.toHaveLength(1);
    await expect(service.listDeleted()).resolves.toEqual([]);
  });

  it('does not delete a food referenced by an active recipe', async () => {
    await service.create(input());
    await database.runAsync(
      `INSERT INTO recipes (
        id, name, finished_weight_g, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?);`,
      'recipe-id',
      'Chicken Soup',
      1000,
      now.toISOString(),
      now.toISOString(),
    );
    await database.runAsync(
      `INSERT INTO recipe_ingredients (
        id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      'ingredient-id',
      'recipe-id',
      'food-id',
      500,
      0,
      now.toISOString(),
      now.toISOString(),
    );

    await expect(service.softDelete('food-id')).rejects.toEqual(
      new FoodInUseError(['Chicken Soup']),
    );
    await expect(new FoodRepository(database).findById('food-id')).resolves.toMatchObject({
      deleted_at: null,
    });
  });
  it('permanently deletes only unreferenced deleted foods', async () => {
    await service.create(input());
    await service.softDelete('food-id');
    await service.permanentlyDelete('food-id');
    await expect(new FoodRepository(database).findById('food-id')).resolves.toBeNull();
  });

  it('blocks permanent food deletion while a deleted recipe still references it', async () => {
    await service.create(input());
    await database.runAsync(`INSERT INTO recipes (id, name, finished_weight_g, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?);`, 'recipe-id', 'Chicken Soup', 1000, now.toISOString(), now.toISOString(), now.toISOString());
    await database.runAsync(`INSERT INTO recipe_ingredients (id, recipe_id, food_id, weight_g, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`, 'ingredient-id', 'recipe-id', 'food-id', 500, 0, now.toISOString(), now.toISOString());
    await service.softDelete('food-id');
    await expect(service.permanentlyDelete('food-id')).rejects.toEqual(new FoodInUseError(['Chicken Soup']));
  });
});
