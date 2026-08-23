import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { formatChartDate } from './chartTimeline';

export function ChartDateLabels({ dates, leftInset = 48, rightInset = 8 }: Readonly<{ dates: string[]; leftInset?: number; rightInset?: number }>) {
  const middle = dates[Math.floor((dates.length - 1) / 2)] ?? dates[0];
  return (
    <View style={[styles.row, { marginLeft: leftInset, marginRight: rightInset }]}>
      <Text style={styles.label}>{formatChartDate(dates[0]!)}</Text>
      <Text style={styles.label}>{formatChartDate(middle!)}</Text>
      <Text style={styles.label}>{formatChartDate(dates.at(-1)!)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  label: { color: colors.textMuted, fontSize: 10 },
});
