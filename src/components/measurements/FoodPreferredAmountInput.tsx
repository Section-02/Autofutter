import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { PreferredAmountInput } from '@/components/measurements/PreferredAmountInput';
import { FoodRepository } from '@/data/repositories/foodRepository';
import { FoodPortionRepository } from '@/data/repositories/foodPortionRepository';
import type { PortionConversion } from '@/domain/measurements/measurementOptions';
import type { MeasurementSystem } from '@/domain/measurements/measurementSystem';
import { useAppDatabase } from '@/hooks/useAppDatabase';

type Props = Readonly<{
  accessibilityLabel: string;
  autoFocus?: boolean;
  foodId: string;
  inputStyle: StyleProp<TextStyle>;
  measurementSystem: MeasurementSystem;
  onChangeGrams: (value: string) => void;
  placeholder?: string;
  selectTextOnFocus?: boolean;
  valueG: string;
}>;

export function FoodPreferredAmountInput(props: Props) {
  const database = useAppDatabase();
  const foodRepository = useMemo(() => new FoodRepository(database), [database]);
  const portionRepository = useMemo(() => new FoodPortionRepository(database), [database]);
  const [portions, setPortions] = useState<PortionConversion[]>([]);
  const [standardPortion, setStandardPortion] = useState<Readonly<{ label: string; weightG: number }> | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      foodRepository.findById(props.foodId),
      portionRepository.listForFood(props.foodId),
    ]).then(([food, rows]) => {
      if (!active) return;
      setStandardPortion(
        food?.standard_portion_label !== null && food?.standard_portion_label !== undefined &&
        food.standard_portion_weight_g !== null
          ? { label: food.standard_portion_label, weightG: food.standard_portion_weight_g }
          : null,
      );
      setPortions(rows.map((row) => ({
        key: `usda:${row.sort_order}`,
        label: row.label,
        amount: row.amount,
        gramWeightG: row.gram_weight_g,
        volumeUnit: row.volume_unit,
      })));
    });
    return () => { active = false; };
  }, [foodRepository, portionRepository, props.foodId]);

  return <PreferredAmountInput {...props} portions={portions} standardPortion={standardPortion} />;
}
