import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VariationForm } from '@/components/recipe/VariationForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService, type RecipeDetails, type VariationDraft } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0]! : value!; }
export default function NewVariationScreen() {
  const id = first(useLocalSearchParams<{ id: string | string[] }>().id);
  const database = useAppDatabase(); const service = useMemo(() => new RecipeService(database), [database]); const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { service.load(id).then(setRecipe).catch((error) => Alert.alert('Could not load recipe', error instanceof Error ? error.message : 'Please try again.')); }, [id, service]);
  const save = async (draft: VariationDraft) => { setBusy(true); try { await service.createVariation(id, draft); router.back(); } finally { setBusy(false); } };
  if (!recipe) return <SafeAreaView style={styles.safeArea} />;
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>NEW VARIATION</Text><View style={styles.spacer} /></View><VariationForm baseIngredients={recipe.ingredients} baseName={recipe.recipe.name} busy={busy} onSubmit={save} submitLabel="SAVE VARIATION" /></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 } });
