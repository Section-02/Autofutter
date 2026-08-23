import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { NumericTextInput } from '@/components/common/NumericTextInput';
import { IngredientPicker } from '@/components/recipe/IngredientPicker';
import type { FoodRecord } from '@/data/repositories/foodRepository';
import type { RecipeDraft, RecipeIngredientInput } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type IngredientLine = {
  key: string;
  id?: string;
  foodId: string;
  name: string;
  weight: string;
};

export type RecipeFormInitialValues = Readonly<{
  name: string;
  finishedWeightG: number | null;
  ingredients: readonly Readonly<{ id?: string; foodId: string; name: string; weightG: number }>[];
}>;

type Props = Readonly<{
  initialValues: RecipeFormInitialValues;
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: RecipeDraft) => Promise<void>;
  footer?: React.ReactNode;
}>;

export function RecipeForm({ initialValues, busy, submitLabel, onSubmit, footer }: Props) {
  const [name, setName] = useState(initialValues.name);
  const [finishedWeight, setFinishedWeight] = useState(
    initialValues.finishedWeightG === null ? '' : String(initialValues.finishedWeightG),
  );
  const [ingredients, setIngredients] = useState<IngredientLine[]>(() =>
    initialValues.ingredients.map((item, index) => ({
      key: item.id ?? `initial-${index}`,
      id: item.id,
      foodId: item.foodId,
      name: item.name,
      weight: String(item.weightG),
    })),
  );
  const [picker, setPicker] = useState<{ visible: boolean; replaceKey?: string }>({ visible: false });

  const draft = useMemo<RecipeDraft>(() => ({
    name,
    finishedWeightG: finishedWeight.trim() === '' ? null : Number(finishedWeight),
    ingredients: ingredients.map<RecipeIngredientInput>((item) => ({
      id: item.id,
      foodId: item.foodId,
      weightG: Number(item.weight),
    })),
  }), [finishedWeight, ingredients, name]);

  const isIncomplete = ingredients.length === 0 || finishedWeight.trim() === '';

  const selectFood = (food: FoodRecord) => {
    if (picker.replaceKey) {
      setIngredients((current) => current.map((item) => item.key === picker.replaceKey
        ? { ...item, foodId: food.id, name: food.name }
        : item));
    } else {
      setIngredients((current) => [...current, {
        key: `new-${Date.now()}-${food.id}`,
        foodId: food.id,
        name: food.name,
        weight: '',
      }]);
    }
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a recipe name.'); return; }
    if (ingredients.some(({ weight }) => !Number.isFinite(Number(weight)) || Number(weight) <= 0)) {
      Alert.alert('Check ingredient weights', 'Every ingredient weight must be greater than zero.');
      return;
    }
    if (finishedWeight.trim() !== '' && (!Number.isFinite(Number(finishedWeight)) || Number(finishedWeight) <= 0)) {
      Alert.alert('Check finished weight', 'Finished weight must be greater than zero, or left blank to save an incomplete recipe.');
      return;
    }
    try { await onSubmit(draft); }
    catch (error) { Alert.alert('Could not save recipe', error instanceof Error ? error.message : 'Please try again.'); }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>NAME</Text>
        <TextInput onChangeText={setName} placeholder="Recipe name" placeholderTextColor={colors.textMuted} style={styles.nameInput} value={name} />

        <Text style={styles.sectionTitle}>INGREDIENTS</Text>
        {ingredients.map((ingredient) => (
          <View key={ingredient.key} style={styles.ingredientRow}>
            <Pressable onPress={() => setPicker({ visible: true, replaceKey: ingredient.key })} style={styles.ingredientName}>
              <Text numberOfLines={2} style={styles.ingredientNameText}>{ingredient.name}</Text>
              <Text style={styles.replace}>Tap to replace</Text>
            </Pressable>
            <NumericTextInput
              accessibilityLabel={`${ingredient.name} weight in grams`}
              keyboardType="decimal-pad"
              onChangeText={(weight) => setIngredients((current) => current.map((item) => item.key === ingredient.key ? { ...item, weight } : item))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.weightInput}
              value={ingredient.weight}
            />
            <Text style={styles.unit}>g</Text>
            <Pressable accessibilityLabel={`Remove ${ingredient.name}`} hitSlop={8} onPress={() => setIngredients((current) => current.filter((item) => item.key !== ingredient.key))}>
              <SymbolView name="minus.circle" size={20} tintColor={colors.calorieOver} />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => setPicker({ visible: true })} style={styles.addIngredient}>
          <Text style={styles.addIngredientText}>+ ADD INGREDIENT</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>FINISHED WEIGHT</Text>
        <View style={styles.finishedRow}>
          <NumericTextInput onChangeText={setFinishedWeight} placeholder="Optional" placeholderTextColor={colors.textMuted} style={styles.finishedInput} value={finishedWeight} />
          <Text style={styles.finishedUnit}>g</Text>
        </View>
        <Text style={styles.help}>Weigh the complete cooked recipe. Leave blank to save it as Incomplete.</Text>

        {isIncomplete ? (
          <View style={styles.incomplete}><Text style={styles.incompleteText}>Incomplete recipes are saved but cannot be logged.</Text></View>
        ) : null}

        <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.save, (busy || pressed) && styles.dimmed]}>
          <Text style={styles.saveText}>{busy ? 'SAVING…' : submitLabel}</Text>
        </Pressable>
        {footer}
      </ScrollView>
      <IngredientPicker
        onClose={() => setPicker((current) => ({ ...current, visible: false }))}
        onSelect={selectFood}
        title={picker.replaceKey ? 'REPLACE INGREDIENT' : 'ADD INGREDIENT'}
        visible={picker.visible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 60, paddingHorizontal: spacing.screenHorizontal },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  nameInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, height: 50, marginTop: spacing.sm, paddingHorizontal: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.xl },
  ingredientRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 68 },
  ingredientName: { flex: 1, paddingRight: spacing.sm },
  ingredientNameText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  replace: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  weightInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 9, borderWidth: 1, color: colors.text, fontSize: 15, height: 40, paddingHorizontal: spacing.sm, textAlign: 'right', width: 74 },
  unit: { color: colors.textMuted, marginHorizontal: spacing.sm },
  addIngredient: { justifyContent: 'center', minHeight: 50 },
  addIngredientText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  finishedRow: { alignItems: 'center', flexDirection: 'row' },
  finishedInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 17, height: 48, paddingHorizontal: spacing.md, textAlign: 'right', width: 140 },
  finishedUnit: { color: colors.textMuted, fontSize: 16, marginLeft: spacing.sm },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  incomplete: { backgroundColor: colors.accentSoft, borderRadius: 12, marginTop: spacing.xl, padding: spacing.md },
  incompleteText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  save: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', marginTop: spacing.xl, minHeight: 52 },
  saveText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  dimmed: { opacity: 0.55 },
});
