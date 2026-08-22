import { useCallback, useMemo, useState } from 'react';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RecipeSort } from '@/data/repositories/recipeRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { RecipeService, type RecipeListItem } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const sortOptions: readonly { value: RecipeSort; label: string }[] = [
  { value: 'most_used', label: 'Most Used' },
  { value: 'recently_used', label: 'Recently Used' },
  { value: 'name', label: 'A–Z' },
  { value: 'recently_added', label: 'Recently Added' },
];

export default function RecipesScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new RecipeService(database), [database]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<RecipeSort>('most_used');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    service.list(query, sort).then((items) => active && setRecipes(items));
    return () => { active = false; };
  }, [query, service, sort]));

  const chooseSort = () => ActionSheetIOS.showActionSheetWithOptions({
    cancelButtonIndex: sortOptions.length,
    options: [...sortOptions.map(({ label }) => label), 'Cancel'],
    title: 'Sort recipes',
  }, (index) => { const selected = sortOptions[index]; if (selected) setSort(selected.value); });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>RECIPES</Text>
        <Pressable accessibilityLabel="Deleted recipes" hitSlop={10} onPress={() => router.push('/recipes/deleted')}>
          <SymbolView name="trash" size={19} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.controls}>
        <TextInput autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" onChangeText={setQuery} placeholder="Search recipes..." placeholderTextColor={colors.textMuted} style={styles.search} value={query} />
        <Pressable onPress={chooseSort} style={styles.sortButton}>
          <Text style={styles.sortLabel}>SORT: {sortOptions.find(({ value }) => value === sort)?.label}</Text>
          <SymbolView name="chevron.down" size={13} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {recipes.map((item) => (
          <Pressable key={item.recipe.id} onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.recipe.id } })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={styles.name}>{item.recipe.name}</Text>
              <Text style={[styles.detail, !item.isComplete && styles.incomplete]}>
                {item.isComplete ? `${Number(item.caloriesPer100G!.toFixed(2))} kcal / 100 g` : 'Incomplete'}
              </Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} />
          </Pressable>
        ))}
        {recipes.length === 0 ? <Text style={styles.empty}>{query.trim() ? `No recipes found for "${query.trim()}"` : 'No recipes yet.'}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/recipes/new')} style={styles.addButton}><Text style={styles.addText}>+ NEW RECIPE</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.lg },
  title: { ...typography.screenTitle, color: colors.text },
  controls: { paddingHorizontal: spacing.screenHorizontal },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, height: 48, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sortButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing.xs, minHeight: 42 },
  sortLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  list: { paddingBottom: 100, paddingHorizontal: spacing.screenHorizontal },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 68 },
  rowText: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  incomplete: { color: colors.calorieOver, fontWeight: '600' },
  empty: { color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' },
  footer: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  addButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 50 },
  addText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.55 },
});
