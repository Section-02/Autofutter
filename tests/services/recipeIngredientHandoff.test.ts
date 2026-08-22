import type { FoodRecord } from '../../src/data/repositories/foodRepository';
import {
  deliverRecipeIngredient,
  registerRecipeIngredientHandoff,
} from '../../src/services/recipes/recipeIngredientHandoff';

const food = { id: 'food-id', name: 'Chili Powder' } as FoodRecord;

describe('recipe ingredient handoff', () => {
  it('delivers a newly saved food only to the originating recipe editor', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unregisterFirst = registerRecipeIngredientHandoff('first', first);
    const unregisterSecond = registerRecipeIngredientHandoff('second', second);

    expect(deliverRecipeIngredient('second', food)).toBe(true);
    expect(second).toHaveBeenCalledWith(food);
    expect(first).not.toHaveBeenCalled();

    unregisterFirst();
    unregisterSecond();
    expect(deliverRecipeIngredient('second', food)).toBe(false);
  });
});
