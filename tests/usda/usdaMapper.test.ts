import {
  mapUsdaFood,
  mapUsdaSearchResponse,
} from '../../src/services/usda/usdaMapper';

const nutrients = [
  { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 165.25 },
  { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 31.02 },
  { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'G', value: 3.57 },
  { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 0 },
  { nutrientId: 1093, nutrientName: 'Sodium, Na', unitName: 'MG', value: 74.4 },
  { nutrientId: 1253, nutrientName: 'Cholesterol', unitName: 'MG', value: 85.6 },
];

describe('USDA mapper', () => {
  it('maps generic USDA nutrition on its 100 gram basis', () => {
    expect(
      mapUsdaFood({
        fdcId: 171077,
        description: 'Chicken breast, roasted',
        dataType: 'SR Legacy',
        foodNutrients: nutrients,
      }),
    ).toEqual({
      fdcId: '171077',
      name: 'Chicken breast, roasted',
      dataType: 'SR Legacy',
      brandOwner: null,
      referenceWeightG: 100,
      nutrition: {
        calories: 165.25,
        proteinG: 31.02,
        fatG: 3.57,
        carbsG: 0,
        sodiumMg: 74.4,
        cholesterolMg: 85.6,
      },
    });
  });

  it('scales per-100-gram branded nutrition to a gram serving', () => {
    const mapped = mapUsdaFood({
      fdcId: 200,
      description: 'Plain yogurt',
      dataType: 'Branded',
      brandOwner: 'Example Dairy',
      servingSize: 170,
      servingSizeUnit: 'g',
      foodNutrients: nutrients,
    });

    expect(mapped).toMatchObject({
      referenceWeightG: 170,
      brandOwner: 'Example Dairy',
    });
    expect(mapped?.nutrition.calories).toBeCloseTo(280.925);
    expect(mapped?.nutrition.proteinG).toBeCloseTo(52.734);
    expect(mapped?.nutrition.carbsG).toBe(0);
  });

  it('prefers food-specific Atwater calories and supports the new USDA energy identifiers', () => {
    const mapped = mapUsdaFood({
      fdcId: 2646170,
      description: 'Chicken, breast, boneless, skinless, raw',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 2047, nutrientNumber: '957', nutrientName: 'Energy (Atwater General Factors)', unitName: 'KCAL', value: 106.034 },
        { nutrientId: 2048, nutrientNumber: '958', nutrientName: 'Energy (Atwater Specific Factors)', unitName: 'KCAL', value: 112.20227 },
      ],
    });

    expect(mapped?.nutrition.calories).toBeCloseTo(112.20227);
  });

  it('keeps missing nutrient values unknown for review instead of inventing zero', () => {
    const results = mapUsdaSearchResponse({
      foods: [
        {
          fdcId: 300,
          description: 'Incomplete food',
          dataType: 'Foundation',
          foodNutrients: nutrients.slice(0, 2),
        },
        { description: 'Missing identifier' },
      ],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.nutrition.fatG).toBeNull();
    expect(results[0]?.nutrition.cholesterolMg).toBeNull();
  });
});
