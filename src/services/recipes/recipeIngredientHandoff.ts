import type { FoodRecord } from '@/data/repositories/foodRepository';

type FoodListener = (food: FoodRecord) => void;

const listeners = new Map<string, FoodListener>();

export function registerRecipeIngredientHandoff(
  token: string,
  listener: FoodListener,
): () => void {
  listeners.set(token, listener);
  return () => {
    if (listeners.get(token) === listener) listeners.delete(token);
  };
}

export function deliverRecipeIngredient(
  token: string | undefined,
  food: FoodRecord,
): boolean {
  if (!token) return false;
  const listener = listeners.get(token);
  if (!listener) return false;
  listener(food);
  return true;
}
