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
}>;
