import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { NumericTextInput } from '@/components/common/NumericTextInput';
import type { QuickEntryInput } from '@/services/logging/quickEntryService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type InitialValues = Readonly<{
  name: string;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
  isEstimated: boolean;
}>;

type Props = Readonly<{
  date: string;
  initialValues: InitialValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (input: QuickEntryInput) => Promise<void>;
  onDelete?: () => void;
}>;

type OptionalKey = 'proteinG' | 'fatG' | 'carbsG' | 'sodiumMg' | 'cholesterolMg';
const details: readonly { key: OptionalKey; label: string; unit: string }[] = [
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'fatG', label: 'Total Fat', unit: 'g' },
  { key: 'carbsG', label: 'Carbohydrates', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
  { key: 'cholesterolMg', label: 'Cholesterol', unit: 'mg' },
];
function shown(value: number | null): string { return value === null ? '' : String(value); }
function requiredNumber(value: string): number { return value.trim() === '' ? Number.NaN : Number(value.replace(',', '.')); }
function optionalNumber(value: string): number | null { return value.trim() === '' ? null : Number(value.replace(',', '.')); }

export function QuickEntryForm({ date, initialValues, submitLabel, busy, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(initialValues.name);
  const [calories, setCalories] = useState(shown(initialValues.calories));
  const [values, setValues] = useState<Record<OptionalKey, string>>({
    proteinG: shown(initialValues.proteinG), fatG: shown(initialValues.fatG),
    carbsG: shown(initialValues.carbsG), sodiumMg: shown(initialValues.sodiumMg),
    cholesterolMg: shown(initialValues.cholesterolMg),
  });
  const [estimated, setEstimated] = useState(initialValues.isEstimated);
  const [expanded, setExpanded] = useState(details.some(({ key }) => initialValues[key] !== null));

  const submit = async () => {
    const input: QuickEntryInput = {
      name,
      logDate: date,
      nutrition: {
        calories: requiredNumber(calories),
        proteinG: optionalNumber(values.proteinG),
        fatG: optionalNumber(values.fatG),
        carbsG: optionalNumber(values.carbsG),
        sodiumMg: optionalNumber(values.sodiumMg),
        cholesterolMg: optionalNumber(values.cholesterolMg),
      },
      isEstimated: estimated,
    };
    try { await onSubmit(input); }
    catch (error) { Alert.alert('Could not save Quick Entry', error instanceof Error ? error.message : 'Please try again.'); }
  };

  return <View style={styles.flex}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>NAME</Text>
      <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Burger and fries" placeholderTextColor={colors.textMuted} style={styles.textInput} value={name} />
      <Text style={styles.label}>CALORIES</Text>
      <View style={styles.numberRow}><NumericTextInput onChangeText={setCalories} placeholder="Required" placeholderTextColor={colors.textMuted} style={styles.mainNumber} value={calories} /><Text style={styles.unit}>kcal</Text></View>
      <View style={styles.estimatedRow}><View style={styles.estimatedText}><Text style={styles.estimatedLabel}>Estimated</Text><Text style={styles.help}>Use the higher number when you have a range.</Text></View><Switch onValueChange={setEstimated} trackColor={{ false: colors.border, true: colors.accentSoft }} thumbColor={estimated ? colors.accent : colors.surface} value={estimated} /></View>
      <Pressable onPress={() => setExpanded((current) => !current)} style={styles.expand}>
        <Text style={styles.expandText}>{expanded ? 'Hide nutrition details' : 'Add nutrition details'}</Text>
        <SymbolView name={expanded ? 'chevron.up' : 'chevron.down'} size={14} tintColor={colors.accent} />
      </Pressable>
      {expanded ? <View style={styles.details}>{details.map(({ key, label, unit }) => <View key={key} style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><NumericTextInput accessibilityLabel={label} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} placeholder="Unknown" placeholderTextColor={colors.textMuted} style={styles.detailInput} value={values[key]} /><Text style={styles.detailUnit}>{unit}</Text></View>)}</View> : null}
      {onDelete ? <Pressable onPress={onDelete} style={styles.delete}><Text style={styles.deleteText}>Delete Entry</Text></Pressable> : null}
    </ScrollView>
    <View style={styles.actionArea}><Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.button, (busy || pressed) && styles.dim]}><Text style={styles.buttonText}>{busy ? 'SAVING…' : submitLabel}</Text></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.screenHorizontal }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.lg }, textInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md }, numberRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, mainNumber: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 20, height: 48, paddingHorizontal: spacing.md, textAlign: 'right', width: 150 }, unit: { color: colors.textMuted, fontSize: 15 }, estimatedRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingVertical: spacing.lg }, estimatedText: { flex: 1 }, estimatedLabel: { color: colors.text, fontSize: 15, fontWeight: '600' }, help: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, expand: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 50 }, expandText: { color: colors.accent, fontSize: 15, fontWeight: '700' }, details: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, detailRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 50 }, detailLabel: { color: colors.text, flex: 1, fontSize: 14 }, detailInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, height: 38, paddingHorizontal: spacing.sm, textAlign: 'right', width: 100 }, detailUnit: { color: colors.textMuted, fontSize: 12, marginLeft: spacing.sm, width: 30 }, delete: { alignItems: 'center', marginTop: spacing.xl, padding: spacing.md }, deleteText: { color: colors.calorieOver, fontSize: 15, fontWeight: '600' }, actionArea: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md }, button: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 50 }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: '800' }, dim: { opacity: 0.55 },
});
