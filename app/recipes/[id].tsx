import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeForm } from '@/components/recipe/RecipeForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService, type RecipeDetails, type RecipeDraft } from '@/services/recipes/recipeService';
import type { RecipeVariationRecord } from '@/data/repositories/recipeRepository';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0]! : value!; }

export default function RecipeScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = first(params.id);
  const database = useAppDatabase();
  const service = useMemo(() => new RecipeService(database), [database]);
  const router = useRouter();
  const [details, setDetails] = useState<RecipeDetails | null>(null);
  const [variations, setVariations] = useState<RecipeVariationRecord[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([service.load(id), service.listVariations(id)]).then(([recipe, rows]) => {
      if (active) { setDetails(recipe); setVariations(rows); }
    }).catch((error) => Alert.alert('Could not load recipe', error instanceof Error ? error.message : 'Please try again.'));
    return () => { active = false; };
  }, [id, service]));

  const save = async (draft: RecipeDraft) => {
    setBusy(true);
    try { setDetails(await service.update(id, draft)); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Delete recipe?', 'It will disappear from active recipes, but past log entries will not change.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await service.softDelete(id); router.back(); } },
  ]);

  if (!details) return <SafeAreaView style={styles.safeArea} />;
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable>
      <Text style={styles.title}>EDIT RECIPE</Text>
      <Pressable accessibilityLabel="Delete recipe" hitSlop={12} onPress={remove}><SymbolView name="trash" size={18} tintColor={colors.calorieOver} /></Pressable>
    </View>
    <RecipeForm
      busy={busy}
      initialValues={{ name: details.recipe.name, finishedWeightG: details.recipe.finished_weight_g, ingredients: details.ingredients.map((row) => ({ id: row.id, foodId: row.food_id, name: row.food_name, weightG: row.weight_g })) }}
      onSubmit={save}
      submitLabel="SAVE CHANGES"
      footer={<View style={styles.variations}>
        <Text style={styles.sectionTitle}>VARIATIONS</Text>
        {variations.map((variation) => <Pressable key={variation.id} onPress={() => router.push({ pathname: '/recipes/[id]/variation/[variationId]', params: { id, variationId: variation.id } })} style={styles.variationRow}>
          <View style={styles.variationText}><Text style={styles.variationName}>{variation.name}</Text><Text style={styles.variationWeight}>{Number(variation.finished_weight_g!.toFixed(2))} g finished</Text></View>
          <SymbolView name="chevron.right" size={15} tintColor={colors.textMuted} />
        </Pressable>)}
        <Pressable disabled={details.ingredients.length === 0} onPress={() => router.push({ pathname: '/recipes/[id]/variation/new', params: { id } })} style={[styles.newVariation, details.ingredients.length === 0 && styles.disabled]}>
          <Text style={styles.newVariationText}>+ NEW VARIATION</Text>
        </Pressable>
        {details.ingredients.length === 0 ? <Text style={styles.variationHelp}>Add an ingredient before creating a variation.</Text> : null}
      </View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  variations: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xl, paddingTop: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  variationRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 58 },
  variationText: { flex: 1 },
  variationName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  variationWeight: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  newVariation: { justifyContent: 'center', minHeight: 50 },
  newVariationText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  variationHelp: { color: colors.textMuted, fontSize: 12 },
  disabled: { opacity: 0.4 },
});
