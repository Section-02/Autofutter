import { StyleSheet, Text, View } from 'react-native';

import type { LoggedNutrition } from '@/domain/nutrition/nutritionTypes';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NutritionFactsProps = {
  nutrition: LoggedNutrition;
};

const rows: readonly [keyof LoggedNutrition, string, string][] = [
  ['proteinG', 'Protein', 'g'],
  ['fatG', 'Total Fat', 'g'],
  ['carbsG', 'Carbs', 'g'],
  ['sodiumMg', 'Sodium', 'mg'],
  ['cholesterolMg', 'Cholesterol', 'mg'],
];

export function NutritionFacts({ nutrition }: NutritionFactsProps) {
  return (
    <View style={styles.container}>
      {rows.map(([key, label, unit]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{nutrition[key].toLocaleString()} {unit}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontSize: 15 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
