import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NutritionGridProps = {
  fatG: number | null;
  carbsG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
};

export function NutritionGrid(props: NutritionGridProps) {
  const items = [
    ['TOTAL FAT', props.fatG, 'g'],
    ['CARBS', props.carbsG, 'g'],
    ['SODIUM', props.sodiumMg, 'mg'],
    ['CHOLESTEROL', props.cholesterolMg, 'mg'],
  ] as const;

  return (
    <View style={styles.grid}>
      {items.map(([label, value, unit]) => (
        <View key={label} style={styles.item}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value === null ? '—' : `${value.toLocaleString()} ${unit}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  item: { width: '50%', gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
