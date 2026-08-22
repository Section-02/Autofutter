import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Nutrition } from '@/domain/nutrition/nutritionTypes';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export type FoodFormInitialValues = Readonly<{
  name: string;
  referenceWeightG: number | null;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
}>;

export type FoodFormSubmission = Readonly<{
  name: string;
  referenceWeightG: number;
  nutrition: Nutrition;
}>;

type FoodFormProps = Readonly<{
  initialValues: FoodFormInitialValues;
  submitLabel: string;
  busy?: boolean;
  provenanceLabel?: string;
  onSubmit: (values: FoodFormSubmission) => Promise<void>;
  secondarySubmitLabel?: string;
  onSecondarySubmit?: (values: FoodFormSubmission) => Promise<void>;
  onDelete?: () => void;
}>;

type NumericKey =
  | 'calories'
  | 'proteinG'
  | 'fatG'
  | 'carbsG'
  | 'sodiumMg'
  | 'cholesterolMg';

const nutrients: readonly {
  key: NumericKey;
  label: string;
  unit: string;
}[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'fatG', label: 'Total Fat', unit: 'g' },
  { key: 'carbsG', label: 'Carbohydrates', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
  { key: 'cholesterolMg', label: 'Cholesterol', unit: 'mg' },
];

function displayNumber(value: number | null): string {
  return value === null ? '' : String(Number(value.toFixed(6)));
}

function parseNumber(value: string): number {
  if (value.trim() === '') return Number.NaN;
  return Number(value);
}

export function FoodForm({
  initialValues,
  submitLabel,
  busy = false,
  provenanceLabel,
  onSubmit,
  secondarySubmitLabel,
  onSecondarySubmit,
  onDelete,
}: FoodFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [referenceWeightG, setReferenceWeightG] = useState(
    displayNumber(initialValues.referenceWeightG),
  );
  const [values, setValues] = useState<Record<NumericKey, string>>({
    calories: displayNumber(initialValues.calories),
    proteinG: displayNumber(initialValues.proteinG),
    fatG: displayNumber(initialValues.fatG),
    carbsG: displayNumber(initialValues.carbsG),
    sodiumMg: displayNumber(initialValues.sodiumMg),
    cholesterolMg: displayNumber(initialValues.cholesterolMg),
  });
  const lastAppliedWeight = useRef(initialValues.referenceWeightG);
  const [error, setError] = useState<string | null>(null);

  const changeValue = (key: NumericKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const applyReferenceWeightChange = () => {
    const previous = lastAppliedWeight.current;
    const next = parseNumber(referenceWeightG);
    if (
      previous === null ||
      !Number.isFinite(previous) ||
      previous <= 0 ||
      !Number.isFinite(next) ||
      next <= 0 ||
      previous === next
    ) {
      return;
    }
    const factor = next / previous;
    setValues((current) => {
      const scaled = { ...current };
      for (const { key } of nutrients) {
        const value = parseNumber(current[key]);
        if (Number.isFinite(value)) scaled[key] = displayNumber(value * factor);
      }
      return scaled;
    });
    lastAppliedWeight.current = next;
  };

  const submit = async (handler: (values: FoodFormSubmission) => Promise<void>) => {
    setError(null);
    const submission: FoodFormSubmission = {
      name,
      referenceWeightG: parseNumber(referenceWeightG),
      nutrition: {
        calories: parseNumber(values.calories),
        proteinG: parseNumber(values.proteinG),
        fatG: parseNumber(values.fatG),
        carbsG: parseNumber(values.carbsG),
        sodiumMg: parseNumber(values.sodiumMg),
        cholesterolMg: parseNumber(values.cholesterolMg),
      },
    };
    try {
      await handler(submission);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Food could not be saved.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {provenanceLabel ? <Text style={styles.provenance}>{provenanceLabel}</Text> : null}
        <Text style={styles.sectionTitle}>NAME</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setName}
          placeholder="Food name"
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
          value={name}
        />

        <Text style={styles.sectionTitle}>NUTRITION FACTS</Text>
        <Text style={styles.help}>These nutrition facts are for:</Text>
        <View style={styles.referenceRow}>
          <TextInput
            accessibilityLabel="Reference weight"
            keyboardType="decimal-pad"
            onBlur={applyReferenceWeightChange}
            onChangeText={setReferenceWeightG}
            placeholder="100"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            style={styles.numberInput}
            value={referenceWeightG}
          />
          <Text style={styles.unit}>g</Text>
        </View>
        <Text style={styles.referenceHint}>
          Changing this weight updates nutrition proportionally.
        </Text>

        <View style={styles.nutrientList}>
          {nutrients.map(({ key, label, unit }) => (
            <View key={key} style={styles.nutrientRow}>
              <Text style={styles.nutrientLabel}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                keyboardType="decimal-pad"
                onChangeText={(value) => changeValue(key, value)}
                placeholder="Required"
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
                style={styles.nutrientInput}
                value={values[key]}
              />
              <Text style={styles.nutrientUnit}>{unit}</Text>
            </View>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={busy}
          onPress={() => submit(onSubmit)}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? 'SAVING…' : submitLabel}
          </Text>
        </Pressable>
        {secondarySubmitLabel && onSecondarySubmit ? (
          <Pressable
            disabled={busy}
            onPress={() => submit(onSecondarySubmit)}
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || busy) && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{secondarySubmitLabel}</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete Food</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.lg,
  },
  provenance: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  help: { color: colors.text, fontSize: 15, marginBottom: spacing.sm },
  nameInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  referenceRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  numberInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    textAlign: 'right',
    width: 120,
  },
  unit: { color: colors.text, fontSize: 16 },
  referenceHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  nutrientList: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  nutrientRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 48,
  },
  nutrientLabel: { color: colors.text, flex: 1, fontSize: 15 },
  nutrientInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    width: 104,
  },
  nutrientUnit: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.sm,
    width: 34,
  },
  error: { color: colors.calorieOver, marginTop: spacing.lg },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 50,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  deleteButton: { alignItems: 'center', padding: spacing.lg },
  deleteText: { color: colors.calorieOver, fontSize: 15 },
  pressed: { opacity: 0.6 },
});
