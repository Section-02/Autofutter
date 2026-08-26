import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodPreferredAmountInput } from '@/components/measurements/FoodPreferredAmountInput';
import { PreferredAmountInput } from '@/components/measurements/PreferredAmountInput';
import { NutritionFacts } from '@/components/nutrition/NutritionFacts';
import { QuickEntryForm } from '@/components/quick/QuickEntryForm';
import { FoodLogRepository, type FoodLogEntryRecord } from '@/data/repositories/foodLogRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { FoodLoggingService } from '@/services/logging/foodLoggingService';
import { QuickEntryService, type QuickEntryInput } from '@/services/logging/quickEntryService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string { return (Array.isArray(value) ? value[0] : value) ?? ''; }
function parseAmount(value: string): number | null { const number = Number(value.replace(',', '.')); return Number.isFinite(number) && number > 0 ? number : null; }

export default function LogEntryEditorScreen() {
  const id = first(useLocalSearchParams<{ id?: string | string[] }>().id);
  const database = useAppDatabase();
  const weighedService = useMemo(() => new FoodLoggingService(database), [database]);
  const quickService = useMemo(() => new QuickEntryService(database), [database]);
  const measurementSystem = useMeasurementSystem();
  const router = useRouter();
  const [entry, setEntry] = useState<FoodLogEntryRecord | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    new FoodLogRepository(database).findById(id).then((result) => {
      if (result === null) { setError('Entry could not be loaded.'); return; }
      if (result.entry_type !== 'quick' && result.amount_g === null) { setError('Weighed entry could not be loaded.'); return; }
      setEntry(result);
      if (result.amount_g !== null) setAmount(String(result.amount_g));
    });
  }, [database, id]);

  const preview = useMemo(() => {
    const grams = parseAmount(amount);
    if (entry === null || entry.entry_type === 'quick' || grams === null) return null;
    try { return weighedService.previewEntryEdit(entry, grams); } catch { return null; }
  }, [amount, entry, weighedService]);

  const finish = (date: string) => router.replace({ pathname: '/', params: { date } });
  const deleteEntry = () => {
    if (!entry) return;
    Alert.alert('Delete Entry?', 'This removes the entry from this day.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { setSaving(true); try { await weighedService.deleteEntry(entry.id); finish(entry.log_date); } catch { setError('Unable to delete entry.'); setSaving(false); } } },
    ]);
  };
  const saveWeighed = async () => {
    const grams = parseAmount(amount); if (grams === null || entry === null) return;
    setSaving(true); try { await weighedService.updateWeighedEntry(entry.id, grams); finish(entry.log_date); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save changes.'); setSaving(false); }
  };
  const saveQuick = async (input: QuickEntryInput) => {
    if (!entry) return; setSaving(true); try { await quickService.update(entry.id, input); finish(entry.log_date); } finally { setSaving(false); }
  };

  if (entry?.entry_type === 'quick') {
    return <SafeAreaView style={styles.safeArea}><View style={styles.quickHeader}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.quickTitle}>EDIT QUICK ENTRY</Text><View style={styles.spacer} /></View><QuickEntryForm busy={saving} date={entry.log_date} initialValues={{ name: entry.display_name_snapshot, calories: entry.calories, proteinG: entry.protein_g, fatG: entry.fat_g, carbsG: entry.carbs_g, sodiumMg: entry.sodium_mg, cholesterolMg: entry.cholesterol_mg, isEstimated: entry.is_estimated === 1 }} onDelete={deleteEntry} onSubmit={saveQuick} submitLabel="SAVE CHANGES" /></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.quickHeader}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{entry?.display_name_snapshot.toUpperCase() ?? ''}</Text><Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>{entry?.source_food_id ? <FoodPreferredAmountInput accessibilityLabel="Logged amount" foodId={entry.source_food_id} inputStyle={styles.amountInput} measurementSystem={measurementSystem} onChangeGrams={setAmount} selectTextOnFocus valueG={amount} /> : <PreferredAmountInput accessibilityLabel="Logged amount" inputStyle={styles.amountInput} measurementSystem={measurementSystem} onChangeGrams={setAmount} selectTextOnFocus valueG={amount} />}</View>
      {preview ? <View style={styles.preview}><Text style={styles.calories}>{preview.calories.toLocaleString()} kcal</Text><NutritionFacts nutrition={preview} /></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={deleteEntry} style={styles.deleteAction}><Text style={styles.deleteText}>Delete Entry</Text></Pressable>
    </ScrollView>
    <View style={styles.actionArea}><Pressable disabled={!preview || saving} onPress={saveWeighed} style={({ pressed }) => [styles.button, (!preview || saving) && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</Text></Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, quickHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, quickTitle: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.screenHorizontal }, title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.xxl }, label: { color: colors.text, fontSize: 16, fontWeight: '600' }, amountRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }, amountInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 26, fontWeight: '600', height: 56, minWidth: 150, paddingHorizontal: spacing.md }, preview: { gap: spacing.xl, marginTop: spacing.xxl }, calories: { color: colors.text, fontSize: 24, fontWeight: '700' }, error: { color: colors.calorieOver, marginTop: spacing.lg }, deleteAction: { marginTop: spacing.xl, paddingVertical: spacing.lg }, deleteText: { color: colors.calorieOver, fontSize: 15, fontWeight: '600' }, actionArea: { padding: spacing.lg }, button: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, height: 50, justifyContent: 'center' }, disabled: { opacity: 0.35 }, pressed: { opacity: 0.7 }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
});
