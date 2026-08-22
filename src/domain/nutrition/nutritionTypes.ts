export type Nutrition = Readonly<{
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  sodiumMg: number;
  cholesterolMg: number;
}>;

export type LoggedNutrition = Nutrition;

export type FoodNutritionSource = Readonly<{
  foodId: string;
  referenceWeightG: number;
  nutrition: Nutrition;
}>;

export type WeightedIngredient = FoodNutritionSource &
  Readonly<{
    id: string;
    weightG: number;
  }>;

export const ZERO_NUTRITION: Nutrition = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  sodiumMg: 0,
  cholesterolMg: 0,
};
