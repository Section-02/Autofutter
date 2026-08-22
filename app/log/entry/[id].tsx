import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionFacts } from '@/components/nutrition/NutritionFacts';
import { FoodLogRepository, type FoodLogEntryRecord } from '@/data/repositories/foodLogRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { FoodLoggingService } from '@/services/logging/foodLoggingService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string {
  const result = Array.isArray(value) ? value[0] : value;
  return result ?? '';
}

function parseAmount(value: string): number | null {
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function LogEntryEditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = first(params.id);
  const database = useAppDatabase();
  const service = useMemo(() => new FoodLoggingService(database), [database]);
  const router = useRouter();
  const [entry, setEntry] = useState<FoodLogEntryRecord | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    new FoodLogRepository(database).findById(id).then((result) => {
      if (result === null || result.amount_g === null) {
        setError('Weighed entry could not be loaded.');
        return;
      }
      setEntry(result);
      setAmount(String(result.amount_g));
    });
  }, [database, id]);

  const preview = useMemo(() => {
    const grams = parseAmount(amount);
    if (entry === null || grams === null) return null;
    try {
      return service.previewEntryEdit(entry, grams);
    } catch {
      return null;
    }
  }, [amount, entry, service]);

  const save = async () => {
    const grams = parseAmount(amount);
    if (grams === null || entry === null) return;
    setSaving(true);
    try {
      await service.updateWeighedEntry(entry.id, grams);
      router.replace({ pathname: '/', params: { date: entry.log_date } });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save changes.');
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (entry === null) return;
    Alert.alert('Delete Entry?', 'This removes the entry from this day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          service.deleteEntry(entry.id)
            .then(() => router.replace({ pathname: '/', params: { date: entry.log_date } }))
            .catch(() => {
              setError('Unable to delete entry.');
              setSaving(false);
            });
        },
      },
    ]);
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
          <Text accessibilityRole="header" style={styles.title}>{entry?.display_name_snapshot.toUpperCase() ?? ''}</Text>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <TextInput keyboardType="decimal-pad" onChangeText={setAmount} selectTextOnFocus style={styles.amountInput} value={amount} />
            <Text style={styles.unit}>g</Text>
          </View>
          {preview !== null ? (
            <View style={styles.preview}>
              <Text style={styles.calories}>{preview.calories.toLocaleString()} kcal</Text>
              <NutritionFacts nutrition={preview} />
            </View>
          ) : null}
          {error !== null ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={confirmDelete} style={styles.deleteAction}>
            <Text style={styles.deleteText}>Delete Entry</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.actionArea}>
          <Pressable disabled={preview === null || saving} onPress={save} style={({ pressed }) => [styles.button, (preview === null || saving) && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</Text>
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
  content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.xxl },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  amountInput: { minWidth: 150, height: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 26, fontWeight: '600' },
  unit: { color: colors.textMuted, fontSize: 20 },
  preview: { marginTop: spacing.xxl, gap: spacing.xl },
  calories: { color: colors.text, fontSize: 24, fontWeight: '700' },
  error: { color: colors.calorieOver, marginTop: spacing.lg },
  deleteAction: { paddingVertical: spacing.lg, marginTop: spacing.xl },
  deleteText: { color: colors.calorieOver, fontSize: 15, fontWeight: '600' },
  actionArea: { padding: spacing.lg },
  button: { height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
});
