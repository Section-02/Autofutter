import { useMemo, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

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
  return <PreferredAmountControl accessibilityLabel={accessibilityLabel} autoFocus={autoFocus} inputStyle={inputStyle} key={optionSignature} onChangeGrams={onChangeGrams} options={options} placeholder={placeholder} selectTextOnFocus={selectTextOnFocus} valueG={valueG} />;
}

type ControlProps = Pick<Props,
  | 'accessibilityLabel'
  | 'autoFocus'
  | 'inputStyle'
  | 'onChangeGrams'
  | 'placeholder'
  | 'selectTextOnFocus'
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
  valueG,
}: ControlProps) {
  const [selectedKey, setSelectedKey] = useState(options[0]!.key);
  const [displayValue, setDisplayValue] = useState(() => {
    const grams = parsePositive(valueG);
    return grams === null ? '' : displayMeasurementAmount(gramsToAmount(grams, options[0]!));
  });
  const selected = options.find(({ key }) => key === selectedKey) ?? options[0]!;

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

  return <><NumericTextInput accessibilityLabel={accessibilityLabel} autoFocus={autoFocus} keyboardType="decimal-pad" onChangeText={changeAmount} placeholder={placeholder} placeholderTextColor={colors.textMuted} selectTextOnFocus={selectTextOnFocus} style={inputStyle} value={displayValue} /><UnitPicker onSelect={changeOption} options={options} selected={selected} /></>;
}
