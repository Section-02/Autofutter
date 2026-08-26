import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { FoodPreferredAmountInput } from '@/components/measurements/FoodPreferredAmountInput';
import { PreferredAmountInput } from '@/components/measurements/PreferredAmountInput';
import { IngredientPicker } from '@/components/recipe/IngredientPicker';
import type { FoodRecord } from '@/data/repositories/foodRepository';
import type { RecipeIngredientNutritionRecord, RecipeVariationOverrideRecord } from '@/data/repositories/recipeRepository';
import type { VariationDraft, VariationOverrideInput } from '@/services/recipes/recipeService';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Line = { key: string; baseId?: string; originalFoodId?: string; originalWeight?: number; foodId: string; name: string; weight: string; removed: boolean };

type Props = Readonly<{
  baseName: string;
  baseIngredients: readonly RecipeIngredientNutritionRecord[];
  initialName?: string;
  initialFinishedWeightG?: number | null;
  initialOverrides?: readonly RecipeVariationOverrideRecord[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: VariationDraft) => Promise<void>;
  footer?: React.ReactNode;
}>;

function initialLines(base: readonly RecipeIngredientNutritionRecord[], overrides: readonly RecipeVariationOverrideRecord[]): Line[] {
  const rows = base.map((item): Line => ({ key: item.id, baseId: item.id, originalFoodId: item.food_id, originalWeight: item.weight_g, foodId: item.food_id, name: item.food_name, weight: String(item.weight_g), removed: false }));
  for (const override of overrides) {
    if (override.action === 'add') rows.push({ key: `add-${override.id}`, foodId: override.food_id!, name: override.food_name!, weight: String(override.weight_g), removed: false });
    else {
      const index = rows.findIndex(({ baseId }) => baseId === override.base_recipe_ingredient_id);
      const row = rows[index];
      if (!row) continue;
      if (override.action === 'remove') rows[index] = { ...row, removed: true };
      if (override.action === 'change_weight') rows[index] = { ...row, weight: String(override.weight_g) };
      if (override.action === 'replace') rows[index] = { ...row, foodId: override.food_id!, name: override.food_name!, weight: String(override.weight_g ?? row.originalWeight) };
    }
  }
  return rows;
}

export function VariationForm({ baseName, baseIngredients, initialName = '', initialFinishedWeightG = null, initialOverrides = [], busy, submitLabel, onSubmit, footer }: Props) {
  const measurementSystem = useMeasurementSystem();
  const [name, setName] = useState(initialName);
  const [finishedWeight, setFinishedWeight] = useState(initialFinishedWeightG === null ? '' : String(initialFinishedWeightG));
  const [lines, setLines] = useState<Line[]>(() => initialLines(baseIngredients, initialOverrides));
  const [picker, setPicker] = useState<{ visible: boolean; key?: string }>({ visible: false });

  const overrides = useMemo<VariationOverrideInput[]>(() => {
    const result: VariationOverrideInput[] = [];
    for (const line of lines) {
      const weight = Number(line.weight);
      if (!line.baseId) { if (!line.removed) result.push({ action: 'add', foodId: line.foodId, weightG: weight }); continue; }
      if (line.removed) { result.push({ action: 'remove', baseIngredientId: line.baseId }); continue; }
      if (line.foodId !== line.originalFoodId) {
        result.push({ action: 'replace', baseIngredientId: line.baseId, foodId: line.foodId, ...(weight !== line.originalWeight ? { weightG: weight } : {}) });
      } else if (weight !== line.originalWeight) result.push({ action: 'change_weight', baseIngredientId: line.baseId, weightG: weight });
    }
    return result;
  }, [lines]);
  const draft = useMemo<VariationDraft>(() => ({ name, finishedWeightG: Number(finishedWeight), overrides }), [finishedWeight, name, overrides]);



  const select = (food: FoodRecord) => {
    if (picker.key) setLines((current) => current.map((line) => line.key === picker.key ? { ...line, foodId: food.id, name: food.name, removed: false } : line));
    else setLines((current) => [...current, { key: `add-${Date.now()}-${food.id}`, foodId: food.id, name: food.name, weight: '', removed: false }]);
  };
  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a variation name.'); return; }
    if (!Number.isFinite(Number(finishedWeight)) || Number(finishedWeight) <= 0) { Alert.alert('Finished weight required', 'Every variation needs its own positive finished weight.'); return; }
    const active = lines.filter(({ removed }) => !removed);
    if (active.length === 0 || active.some(({ weight }) => !Number.isFinite(Number(weight)) || Number(weight) <= 0)) { Alert.alert('Check ingredients', 'Keep at least one ingredient and use positive weights.'); return; }
    try { await onSubmit(draft); } catch (error) { Alert.alert('Could not save variation', error instanceof Error ? error.message : 'Please try again.'); }
  };

  return <>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.base}>BASE RECIPE · {baseName}</Text>
      <Text style={styles.label}>VARIATION NAME</Text>
      <TextInput onChangeText={setName} placeholder="e.g. Pinto Beans" placeholderTextColor={colors.textMuted} style={styles.nameInput} value={name} />
      <Text style={styles.section}>CHANGES FROM BASE</Text>
      {lines.map((line) => <View key={line.key} style={[styles.row, line.removed && styles.removedRow]}>
        <Pressable disabled={line.removed} onPress={() => setPicker({ visible: true, key: line.key })} style={styles.rowName}>
          <Text numberOfLines={2} style={[styles.foodName, line.removed && styles.removedText]}>{line.name}</Text>
          <Text style={styles.origin}>{line.baseId ? (line.foodId === line.originalFoodId ? 'Base ingredient' : 'Replacement') : 'Added ingredient'}</Text>
        </Pressable>
        {!line.removed ? <FoodPreferredAmountInput accessibilityLabel={`${line.name} amount`} foodId={line.foodId} inputStyle={styles.weight} measurementSystem={measurementSystem} onChangeGrams={(weight) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, weight } : item))} valueG={line.weight} /> : null}
        <Pressable accessibilityLabel={line.removed ? `Restore ${line.name}` : `Remove ${line.name}`} hitSlop={8} onPress={() => line.baseId ? setLines((current) => current.map((item) => item.key === line.key ? { ...item, removed: !item.removed } : item)) : setLines((current) => current.filter((item) => item.key !== line.key))}>
          <SymbolView name={line.removed ? 'arrow.uturn.backward.circle' : 'minus.circle'} size={20} tintColor={line.removed ? colors.accent : colors.calorieOver} />
        </Pressable>
      </View>)}
      <Pressable onPress={() => setPicker({ visible: true })} style={styles.add}><Text style={styles.addText}>+ ADD INGREDIENT</Text></Pressable>
      <Text style={styles.section}>FINISHED WEIGHT</Text>
      <View style={styles.finished}><PreferredAmountInput accessibilityLabel="Finished variation weight" inputStyle={styles.finishedInput} measurementSystem={measurementSystem} onChangeGrams={setFinishedWeight} placeholder="Required" valueG={finishedWeight} /></View>
      <Text style={styles.help}>Weigh this finished version of the complete recipe.</Text>
      <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.save, (busy || pressed) && styles.dim]}><Text style={styles.saveText}>{busy ? 'SAVING…' : submitLabel}</Text></Pressable>
      {footer}
    </ScrollView>
    <IngredientPicker onClose={() => setPicker((current) => ({ ...current, visible: false }))} onSelect={select} title={picker.key ? 'REPLACE INGREDIENT' : 'ADD INGREDIENT'} visible={picker.visible} />
  </>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 60, paddingHorizontal: spacing.screenHorizontal }, base: { color: colors.accent, fontSize: 12, fontWeight: '800', marginBottom: spacing.xl }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }, nameInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, height: 50, marginTop: spacing.sm, paddingHorizontal: spacing.md }, section: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.xl }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 68 }, removedRow: { opacity: 0.65 }, rowName: { flex: 1, paddingRight: spacing.sm }, foodName: { color: colors.text, fontSize: 14, fontWeight: '600' }, removedText: { textDecorationLine: 'line-through' }, origin: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, weight: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 9, borderWidth: 1, color: colors.text, height: 40, paddingHorizontal: spacing.sm, textAlign: 'right', width: 70 }, add: { justifyContent: 'center', minHeight: 50 }, addText: { color: colors.accent, fontSize: 14, fontWeight: '800' }, finished: { alignItems: 'center', flexDirection: 'row' }, finishedInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 17, height: 48, paddingHorizontal: spacing.md, textAlign: 'right', width: 140 }, help: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm }, save: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: spacing.xl, minHeight: 52 }, saveText: { color: colors.surface, fontSize: 15, fontWeight: '800' }, dim: { opacity: 0.55 },
});
