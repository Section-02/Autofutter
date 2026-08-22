import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FoodLogEntryRecord } from '@/data/repositories/foodLogRepository';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type FoodLogListProps = {
  entries: readonly FoodLogEntryRecord[];
  onPressEntry: (id: string) => void;
};

export function FoodLogList({ entries, onPressEntry }: FoodLogListProps) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>No food logged today.</Text>;
  }

  return (
    <View>
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          onPress={() => onPressEntry(entry.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text numberOfLines={2} style={styles.name}>{entry.display_name_snapshot}</Text>
          <Text style={styles.amount}>{entry.amount_g === null ? '' : `${entry.amount_g.toLocaleString()} g`}</Text>
          <Text style={styles.calories}>{entry.calories.toLocaleString()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 15, paddingVertical: spacing.xl, textAlign: 'center' },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: spacing.sm },
  pressed: { opacity: 0.55 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  amount: { width: 72, color: colors.textMuted, textAlign: 'right', fontSize: 14 },
  calories: { width: 50, color: colors.text, textAlign: 'right', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
