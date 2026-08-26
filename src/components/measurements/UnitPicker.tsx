import { ActionSheetIOS, Pressable, StyleSheet, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { MeasurementOption } from '@/domain/measurements/measurementOptions';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = Readonly<{
  options: readonly MeasurementOption[];
  selected: MeasurementOption;
  onSelect: (option: MeasurementOption) => void;
}>;

export function UnitPicker({ options, selected, onSelect }: Props) {
  const open = () => {
    if (options.length <= 1) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...options.map(({ label }) => label), 'Cancel'],
        cancelButtonIndex: options.length,
        title: 'Measurement',
      },
      (index) => {
        const option = options[index];
        if (option) onSelect(option);
      },
    );
  };

  return <Pressable accessibilityLabel={`Measurement: ${selected.label}`} disabled={options.length <= 1} hitSlop={6} onPress={open} style={styles.button}><Text numberOfLines={1} style={styles.label}>{selected.label}</Text>{options.length > 1 ? <SymbolView name="chevron.down" size={11} tintColor={colors.textMuted} /> : null}</Pressable>;
}

const styles = StyleSheet.create({ button: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, maxWidth: 120, minHeight: 36, paddingHorizontal: spacing.xs }, label: { color: colors.textMuted, flexShrink: 1, fontSize: 15 } });
