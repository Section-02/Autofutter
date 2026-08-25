import { initializeDatabase } from '../../src/data/database/database';
import {
  FoodRepository,
  type NewFoodRecord,
} from '../../src/data/repositories/foodRepository';
import { TestDatabase } from '../database/testDatabase';

describe('FoodRepository', () => {
  let database: TestDatabase;
  let repository: FoodRepository;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeDatabase(database);
    repository = new FoodRepository(database);
  });

  afterEach(() => {
    database.close();
  });

  it('persists and reads a food with decimal source precision', async () => {
    const food: NewFoodRecord = {
      id: '42cd8a4e-c3f1-4d94-a967-807e3ef1a403',
      name: 'Foundation Test Food',
      reference_weight_g: 33.333,
      calories: 101.25,
      protein_g: 9.125,
      fat_g: 2.5,
      carbs_g: 11.75,
      sodium_mg: 187.4,
      cholesterol_mg: 16.2,
      source_type: 'custom',
      source_id: null,
      created_at: '2026-08-21T12:00:00.000Z',
      updated_at: '2026-08-21T12:00:00.000Z',
      standard_portion_label: null,
      standard_portion_weight_g: null,
    };

    await repository.create(food);

    await expect(repository.findById(food.id)).resolves.toMatchObject(food);
  });

  it('uses a bound id parameter when reading', async () => {
    await expect(repository.findById("' OR 1 = 1 --")).resolves.toBeNull();
  });

  it('persists an optional standard portion', async () => {
    const food: NewFoodRecord = {
      id: 'portion-food',
      name: 'String Cheese',
      reference_weight_g: 28,
      calories: 80,
      protein_g: 7,
      fat_g: 6,
      carbs_g: 1,
      sodium_mg: 200,
      cholesterol_mg: 15,
      source_type: 'custom',
      source_id: null,
      created_at: '2026-08-21T12:00:00.000Z',
      updated_at: '2026-08-21T12:00:00.000Z',
      standard_portion_label: 'stick',
      standard_portion_weight_g: 28,
    };

    await repository.create(food);
    await expect(repository.findById(food.id)).resolves.toMatchObject({
      standard_portion_label: 'stick',
      standard_portion_weight_g: 28,
    });
  });

  it('installs standard portion pairing integrity triggers', async () => {
    const triggers = await database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'trigger' AND name LIKE 'foods_standard_portion_%'
       ORDER BY name;`,
    );
    expect(triggers.map(({ name }) => name)).toEqual([
      'foods_standard_portion_insert_check',
      'foods_standard_portion_update_check',
    ]);
  });
});
