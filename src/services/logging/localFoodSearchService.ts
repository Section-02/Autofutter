import type { DatabaseConnection } from '@/data/database/types';
import { FoodRepository } from '@/data/repositories/foodRepository';
import { RecipeRepository } from '@/data/repositories/recipeRepository';
import type { LoggableSourceKind } from './loggableSourceService';

export type LocalFoodSearchResult = Readonly<{
  kind: LoggableSourceKind;
  id: string;
  name: string;
  useCount: number;
  lastUsedAt: string | null;
}>;

function byName(left: LocalFoodSearchResult, right: LocalFoodSearchResult): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function byRecent(left: LocalFoodSearchResult, right: LocalFoodSearchResult): number {
  const dateComparison = (right.lastUsedAt ?? '').localeCompare(left.lastUsedAt ?? '');
  return dateComparison !== 0 ? dateComparison : right.useCount - left.useCount;
}

export class LocalFoodSearchService {
  constructor(private readonly database: DatabaseConnection) {}

  async search(query: string, limit = 30): Promise<LocalFoodSearchResult[]> {
    const [foods, recipes] = await Promise.all([
      new FoodRepository(this.database).searchActive(query, limit),
      new RecipeRepository(this.database).searchLoggable(query, limit),
    ]);

    return [
      ...foods.map((food) => ({
        kind: 'food' as const,
        id: food.id,
        name: food.name,
        useCount: food.use_count,
        lastUsedAt: food.last_used_at,
      })),
      ...recipes.map((recipe) => ({
        kind: 'recipe' as const,
        id: recipe.id,
        name: recipe.name,
        useCount: recipe.use_count,
        lastUsedAt: recipe.last_used_at,
      })),
    ]
      .sort(byName)
      .slice(0, limit);
  }

  async recent(limit = 8): Promise<LocalFoodSearchResult[]> {
    const [foods, recipes] = await Promise.all([
      new FoodRepository(this.database).listRecent(limit),
      new RecipeRepository(this.database).listRecentLoggable(limit),
    ]);

    return [
      ...foods.map((food) => ({
        kind: 'food' as const,
        id: food.id,
        name: food.name,
        useCount: food.use_count,
        lastUsedAt: food.last_used_at,
      })),
      ...recipes.map((recipe) => ({
        kind: 'recipe' as const,
        id: recipe.id,
        name: recipe.name,
        useCount: recipe.use_count,
        lastUsedAt: recipe.last_used_at,
      })),
    ]
      .sort(byRecent)
      .slice(0, limit);
  }
}
