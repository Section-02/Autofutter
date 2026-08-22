import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RecipeRecord, RecipeVariationRecord } from '@/data/repositories/recipeRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
export default function RecipeVersionScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; date?: string | string[] }>(); const id = first(params.id)!; const date = first(params.date) ?? todayLocalDate();
  const database = useAppDatabase(); const service = useMemo(() => new RecipeService(database), [database]); const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null); const [variations, setVariations] = useState<RecipeVariationRecord[]>([]);
  useEffect(() => { Promise.all([service.load(id), service.listVariations(id)]).then(([details, rows]) => { setRecipe(details.recipe); setVariations(rows); }).catch((error) => Alert.alert('Could not load versions', error instanceof Error ? error.message : 'Please try again.')); }, [id, service]);
  const choose = (kind: 'recipe' | 'recipe_variation', sourceId: string) => router.push({ pathname: '/log/amount', params: { date, kind, id: sourceId } });
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>WHICH VERSION?</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}>{recipe ? <><Text style={styles.recipeName}>{recipe.name}</Text><Pressable onPress={() => choose('recipe', recipe.id)} style={styles.row}><View style={styles.rowText}><Text style={styles.name}>Base Recipe</Text><Text style={styles.detail}>{Number(recipe.finished_weight_g!.toFixed(2))} g finished</Text></View><SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} /></Pressable>{variations.map((variation) => <Pressable key={variation.id} onPress={() => choose('recipe_variation', variation.id)} style={styles.row}><View style={styles.rowText}><Text style={styles.name}>{variation.name}</Text><Text style={styles.detail}>{Number(variation.finished_weight_g!.toFixed(2))} g finished</Text></View><SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} /></Pressable>)}</> : null}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingHorizontal: spacing.screenHorizontal }, recipeName: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginBottom: spacing.md }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 68 }, rowText: { flex: 1 }, name: { color: colors.text, fontSize: 16, fontWeight: '600' }, detail: { color: colors.textMuted, fontSize: 12, marginTop: 3 } });
