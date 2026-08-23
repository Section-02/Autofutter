import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeRecord } from '@/data/repositories/recipeRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeRestoreError, RecipeService } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
export default function DeletedRecipesScreen() {
  const database = useAppDatabase(); const service = useMemo(() => new RecipeService(database), [database]); const router = useRouter(); const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const reload = useCallback(() => service.listDeleted().then(setRecipes), [service]); useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const restore = async (id: string) => { try { await service.restore(id); await reload(); } catch (error) { Alert.alert('Cannot restore recipe', error instanceof RecipeRestoreError ? error.message : 'Please try again.'); } };
  const remove = (recipe: RecipeRecord) => Alert.alert('Permanently delete recipe?', `“${recipe.name}” and its variations cannot be recovered. Past log entries will remain unchanged.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete Forever', style: 'destructive', onPress: async () => { try { await service.permanentlyDelete(recipe.id); await reload(); } catch { Alert.alert('Cannot delete recipe', 'Please try again.'); } } }]);
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>DELETED RECIPES</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}>{recipes.map((recipe) => <View key={recipe.id} style={styles.row}><Text style={styles.name}>{recipe.name}</Text><Pressable onPress={() => restore(recipe.id)} style={styles.action}><Text style={styles.restoreText}>RESTORE</Text></Pressable><Pressable accessibilityLabel={`Permanently delete ${recipe.name}`} hitSlop={8} onPress={() => remove(recipe)} style={styles.action}><SymbolView name="trash" size={17} tintColor={colors.calorieOver} /></Pressable></View>)}{recipes.length === 0 ? <Text style={styles.empty}>No deleted recipes.</Text> : null}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingHorizontal: spacing.screenHorizontal }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64 }, name: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' }, action: { padding: spacing.sm }, restoreText: { color: colors.accent, fontSize: 11, fontWeight: '800' }, empty: { color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' } });
