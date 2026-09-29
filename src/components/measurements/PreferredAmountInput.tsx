import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { NumericTextInput } from '@/components/common/NumericTextInput';
import { UnitPicker } from '@/components/measurements/UnitPicker';
import {
  amountToGrams,
  buildFoodMeasurementOptions,
  buildMassMeasurementOptions,
  displayMeasurementAmount,
  gramsToAmount,
  type MeasurementOption,
  type PortionConversion,
} from '@/domain/measurements/measurementOptions';
import type { MeasurementSystem } from '@/domain/measurements/measurementSystem';
import { colors } from '@/theme/colors';

type Props = Readonly<{
  accessibilityLabel: string;
  autoFocus?: boolean;
  inputStyle: StyleProp<TextStyle>;
  measurementSystem: MeasurementSystem;
  onChangeGrams: (value: string) => void;
  placeholder?: string;
  portions?: readonly PortionConversion[];
  selectTextOnFocus?: boolean;
  showStandardPortionChoice?: boolean;
  standardPortion?: Readonly<{ label: string; weightG: number }> | null;
  valueG: string;
}>;

function parsePositive(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function PreferredAmountInput({
  accessibilityLabel,
  autoFocus = false,
  inputStyle,
  measurementSystem,
  onChangeGrams,
  placeholder = '0',
  portions,
  selectTextOnFocus = false,
  showStandardPortionChoice = false,
  standardPortion = null,
  valueG,
}: Props) {
  const options = useMemo(
    () => portions === undefined
      ? buildMassMeasurementOptions(measurementSystem)
      : buildFoodMeasurementOptions(measurementSystem, portions, standardPortion),
    [measurementSystem, portions, standardPortion],
  );
  const optionSignature = options.map(({ key, gramsPerUnit }) => `${key}:${gramsPerUnit}`).join('|');
  return <PreferredAmountControl accessibilityLabel={accessibilityLabel} autoFocus={autoFocus} inputStyle={inputStyle} key={optionSignature} onChangeGrams={onChangeGrams} options={options} placeholder={placeholder} selectTextOnFocus={selectTextOnFocus} showStandardPortionChoice={showStandardPortionChoice && measurementSystem === 'grams'} valueG={valueG} />;
}

type ControlProps = Pick<Props,
  | 'accessibilityLabel'
  | 'autoFocus'
  | 'inputStyle'
  | 'onChangeGrams'
  | 'placeholder'
  | 'selectTextOnFocus'
  | 'showStandardPortionChoice'
  | 'valueG'
> & Readonly<{ options: readonly MeasurementOption[] }>;

function PreferredAmountControl({
  accessibilityLabel,
  autoFocus,
  inputStyle,
  onChangeGrams,
  options,
  placeholder,
  selectTextOnFocus,
  showStandardPortionChoice,
  valueG,
}: ControlProps) {
  const [selectedKey, setSelectedKey] = useState(options[0]!.key);
  const [displayValue, setDisplayValue] = useState(() => {
    const grams = parsePositive(valueG);
    return grams === null ? '' : displayMeasurementAmount(gramsToAmount(grams, options[0]!));
  });
  const selected = options.find(({ key }) => key === selectedKey) ?? options[0]!;
  const standardOption = options.find(({ key }) => key === 'standard') ?? null;
  const useQuickStandardChoice = showStandardPortionChoice && standardOption !== null;

  const changeAmount = (value: string) => {
    setDisplayValue(value);
    const amount = parsePositive(value);
    onChangeGrams(amount === null ? '' : String(amountToGrams(amount, selected)));
  };

  const changeOption = (option: MeasurementOption) => {
    const grams = parsePositive(valueG);
    setSelectedKey(option.key);
    setDisplayValue(grams === null ? '' : displayMeasurementAmount(gramsToAmount(grams, option)));
  };

  const chooseQuickOption = (option: MeasurementOption) => {
    const grams = parsePositive(valueG);
    setSelectedKey(option.key);
    if (grams === null && option.key === 'standard') {
      setDisplayValue('1');
      onChangeGrams(String(option.gramsPerUnit));
      return;
    }
    setDisplayValue(grams === null ? '' : displayMeasurementAmount(gramsToAmount(grams, option)));
  };

  return <View style={styles.container}>
    <View style={styles.inputRow}>
      <NumericTextInput accessibilityLabel={accessibilityLabel} autoFocus={autoFocus} keyboardType="decimal-pad" onChangeText={changeAmount} placeholder={placeholder} placeholderTextColor={colors.textMuted} selectTextOnFocus={selectTextOnFocus} style={inputStyle} value={displayValue} />
      {useQuickStandardChoice ? null : <UnitPicker onSelect={changeOption} options={options} selected={selected} />}
    </View>
    {useQuickStandardChoice && standardOption ? <>
      <View style={styles.choiceRow}>
        {([options.find(({ key }) => key === 'grams')!, standardOption]).map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: selected.key === option.key }}
            onPress={() => chooseQuickOption(option)}
            style={[styles.choiceButton, selected.key === option.key && styles.choiceButtonSelected]}
          >
            <Text numberOfLines={1} style={[styles.choiceText, selected.key === option.key && styles.choiceTextSelected]}>
              {option.key === 'grams' ? 'GRAMS' : option.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.portionHint}>1 {standardOption.label} = {displayMeasurementAmount(standardOption.gramsPerUnit)} g</Text>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start' },
  inputRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  choiceButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 9, borderWidth: 1, justifyContent: 'center', minHeight: 38, minWidth: 104, paddingHorizontal: 10 },
  choiceButtonSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  choiceText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  choiceTextSelected: { color: colors.accent },
  portionHint: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
});
