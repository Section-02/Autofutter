import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumericTextInput } from '@/components/common/NumericTextInput';
import { NutritionFacts } from '@/components/nutrition/NutritionFacts';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import type { LoggedNutrition } from '@/domain/nutrition/nutritionTypes';
import { calculateWeighedNutrition, FoodLoggingService } from '@/services/logging/foodLoggingService';
import type { LoggableSource, LoggableSourceKind } from '@/services/logging/loggableSourceService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseAmount(value: string): number | null {
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function FoodAmountScreen() {
  const params = useLocalSearchParams<{ date?: string | string[]; kind?: string | string[]; id?: string | string[] }>();
  const date = first(params.date) ?? todayLocalDate();
  const kindValue = first(params.kind);
  const kind: LoggableSourceKind =
    kindValue === 'recipe_variation'
      ? 'recipe_variation'
      : kindValue === 'recipe'
        ? 'recipe'
        : 'food';
  const id = first(params.id) ?? '';
  const database = useAppDatabase();
  const service = useMemo(() => new FoodLoggingService(database), [database]);
  const router = useRouter();
  const [source, setSource] = useState<LoggableSource | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    service.loadSource(kind, id).then(setSource).catch(() => setError('Item could not be loaded.'));
  }, [id, kind, service]);

  const grams = parseAmount(amount);
  let preview: LoggedNutrition | null = null;
  if (source !== null && grams !== null) {
    try {
      preview = calculateWeighedNutrition(source.nutritionBasis, source.nutritionBasisWeightG, grams);
    } catch {
      preview = null;
    }
  }

  const add = async () => {
    if (grams === null) return;
    setSaving(true);
    setError(null);
    try {
      await service.addWeighedEntry({ kind, sourceId: id, amountG: grams, logDate: date });
      router.replace({ pathname: '/', params: { date } });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to add food.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>{source?.name.toUpperCase() ?? ''}</Text>
          <Text style={styles.prompt}>How much?</Text>
          <View style={styles.amountRow}>
            <NumericTextInput
              autoFocus
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              selectTextOnFocus
              style={styles.amountInput}
              value={amount}
            />
            <Text style={styles.unit}>g</Text>
          </View>
          {preview !== null ? (
            <View style={styles.preview}>
              <Text style={styles.calories}>{preview.calories.toLocaleString()} kcal</Text>
              <NutritionFacts nutrition={preview} />
            </View>
          ) : null}
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actionArea}>
          <Pressable
            disabled={preview === null || saving}
            onPress={add}
            style={({ pressed }) => [styles.button, (preview === null || saving) && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{saving ? 'ADDING…' : 'ADD TO LOG'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  content: { paddingHorizontal: spacing.screenHorizontal },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.xxl },
  prompt: { color: colors.text, fontSize: 18, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  amountInput: { minWidth: 150, height: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 28, fontWeight: '600' },
  unit: { color: colors.textMuted, fontSize: 20 },
  preview: { marginTop: spacing.xxl, gap: spacing.xl },
  calories: { color: colors.text, fontSize: 24, fontWeight: '700' },
  error: { color: colors.calorieOver, marginTop: spacing.lg },
  actionArea: { padding: spacing.lg },
  button: { height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
});
