import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VariationForm } from '@/components/recipe/VariationForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService, type VariationDetails, type VariationDraft } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

function first(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0]! : value!; }
export default function EditVariationScreen() {
  const params = useLocalSearchParams<{ variationId: string | string[] }>(); const variationId = first(params.variationId);
  const database = useAppDatabase(); const service = useMemo(() => new RecipeService(database), [database]); const router = useRouter();
  const [details, setDetails] = useState<VariationDetails | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { service.loadVariation(variationId).then(setDetails).catch((error) => Alert.alert('Could not load variation', error instanceof Error ? error.message : 'Please try again.')); }, [service, variationId]);
  const save = async (draft: VariationDraft) => { setBusy(true); try { setDetails(await service.updateVariation(variationId, draft)); } finally { setBusy(false); } };
  const remove = () => Alert.alert('Delete variation?', 'The base recipe and past log entries will not change.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await service.softDeleteVariation(variationId); router.back(); } }]);
  if (!details) return <SafeAreaView style={styles.safeArea} />;
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>EDIT VARIATION</Text><Pressable accessibilityLabel="Delete variation" hitSlop={12} onPress={remove}><SymbolView name="trash" size={18} tintColor={colors.calorieOver} /></Pressable></View><VariationForm baseIngredients={details.baseIngredients} baseName={details.recipe.name} busy={busy} initialFinishedWeightG={details.variation.finished_weight_g} initialName={details.variation.name} initialOverrides={details.overrides} onSubmit={save} submitLabel="SAVE CHANGES" /></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 } });
