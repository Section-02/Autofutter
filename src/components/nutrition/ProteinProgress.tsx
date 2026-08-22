import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type ProteinProgressProps = { consumedG: number; minimumG: number };

export function ProteinProgress({ consumedG, minimumG }: ProteinProgressProps) {
  const progress = Math.min(consumedG / minimumG, 1);
  const remaining = Math.max(minimumG - consumedG, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>PROTEIN</Text>
        <Text style={styles.value}>{consumedG.toLocaleString()} / {minimumG.toLocaleString()} g</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.caption}>
        {remaining === 0 ? 'Minimum reached' : `${remaining.toLocaleString()} g to minimum`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  caption: { color: colors.textMuted, fontSize: 13 },
});
