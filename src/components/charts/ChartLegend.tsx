import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Kind = 'weight' | 'calories' | 'target' | 'range';

export function ChartLegend({ items }: { items: readonly Readonly<{ kind: Kind; label: string }>[] }) {
  return (
    <View style={styles.row}>
      {items.map(({ kind, label }) => (
        <View key={kind} style={styles.item}>
          <View style={[styles.swatch, styles[kind]]} />
          <Text style={styles.text}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  item: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  swatch: { height: 3, width: 16 },
  weight: { backgroundColor: colors.accent },
  calories: { backgroundColor: colors.calorieWithin },
  target: { backgroundColor: colors.textMuted },
  range: { backgroundColor: colors.calorieBand, height: 8 },
  text: { color: colors.textMuted, fontSize: 10 },
});
