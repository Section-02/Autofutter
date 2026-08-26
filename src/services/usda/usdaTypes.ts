export type UsdaNutrition = Readonly<{
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
}>;

export type UsdaFoodCandidate = Readonly<{
  fdcId: string;
  name: string;
  dataType: string;
  brandOwner: string | null;
  referenceWeightG: number;
  nutrition: UsdaNutrition;
  portions: readonly UsdaPortion[];
}>;

export type UsdaPortion = Readonly<{
  label: string;
  amount: number;
  gramWeightG: number;
  volumeUnit: 'teaspoon' | 'tablespoon' | 'cup' | null;
  sourceId: string | null;
}>;
