import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeForm } from '@/components/recipe/RecipeForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService, type RecipeDraft } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function NewRecipeScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new RecipeService(database), [database]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const save = async (draft: RecipeDraft) => {
    setBusy(true);
    try { await service.create(draft); router.back(); } finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable>
      <Text style={styles.title}>NEW RECIPE</Text><View style={styles.spacer} />
    </View>
    <RecipeForm busy={busy} initialValues={{ name: '', finishedWeightG: null, ingredients: [] }} onSubmit={save} submitLabel="SAVE RECIPE" />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 } });
