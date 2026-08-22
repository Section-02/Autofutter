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
    };

    await repository.create(food);

    await expect(repository.findById(food.id)).resolves.toMatchObject(food);
  });

  it('uses a bound id parameter when reading', async () => {
    await expect(repository.findById("' OR 1 = 1 --")).resolves.toBeNull();
  });
});
