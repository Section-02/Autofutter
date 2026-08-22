import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDatabase } from '@/hooks/useAppDatabase';
import {
  LocalFoodSearchService,
  type LocalFoodSearchResult,
} from '@/services/logging/localFoodSearchService';
import { RecipeService } from '@/services/recipes/recipeService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function suggestedName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const date = first(params.date) ?? todayLocalDate();
  const database = useAppDatabase();
  const searchService = useMemo(() => new LocalFoodSearchService(database), [database]);
  const recipeService = useMemo(() => new RecipeService(database), [database]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalFoodSearchResult[]>([]);
  const [recent, setRecent] = useState<LocalFoodSearchResult[]>([]);
  const [recipes, setRecipes] = useState<LocalFoodSearchResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        searchService.recent(),
        recipeService.list('', 'most_used'),
      ]).then(([recentItems, recipeItems]) => {
        if (!active) return;
        setRecent(recentItems);
        setRecipes(recipeItems
          .filter(({ isComplete }) => isComplete)
          .map(({ recipe }) => ({
            kind: 'recipe' as const,
            id: recipe.id,
            name: recipe.name,
            useCount: recipe.use_count,
            lastUsedAt: recipe.last_used_at,
          })));
      });
      return () => { active = false; };
    }, [recipeService, searchService]),
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    let active = true;
    const timeout = setTimeout(() => {
      searchService.search(trimmed).then((items) => {
        if (active) setResults(items);
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, searchService]);

  const trimmedQuery = query.trim();
  const select = async (result: LocalFoodSearchResult) => {
    if (result.kind === 'recipe') {
      const variations = await recipeService.listVariations(result.id);
      if (variations.length > 0) {
        router.push({ pathname: '/log/recipe-version', params: { date, id: result.id } });
        return;
      }
    }
    router.push({
      pathname: '/log/amount',
      params: { date, kind: result.kind, id: result.id },
    });
  };
  const createCustom = () => {
    router.push({
      pathname: '/foods/new',
      params: { returnTo: 'log', date, query: suggestedName(trimmedQuery) },
    });
  };
  const searchUsda = () => {
    router.push({
      pathname: '/foods/usda',
      params: { returnTo: 'log', date, query: trimmedQuery },
    });
  };

  const resultRow = (result: LocalFoodSearchResult) => (
    <Pressable
      key={`${result.kind}-${result.id}`}
      onPress={() => select(result)}
      style={({ pressed }) => [styles.result, pressed && styles.pressed]}
    >
      <View style={styles.resultText}>
        <Text style={styles.name}>{result.name}</Text>
        <Text style={styles.kind}>{result.kind === 'recipe' ? 'Recipe' : 'Food'}</Text>
      </View>
      <SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} />
    </Pressable>
  );

  const recentRecipeIds = new Set(
    recent.filter(({ kind }) => kind === 'recipe').map(({ id }) => id),
  );
  const unlistedRecipes = recipes.filter(({ id }) => !recentRecipeIds.has(id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to Log" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>ADD TO LOG</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search foods and recipes..."
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={query}
        />

        {trimmedQuery === '' ? (
          <>
            <Text style={styles.sectionTitle}>RECENT</Text>
            {recent.map(resultRow)}
            {recent.length === 0 ? <Text style={styles.empty}>No recently logged items.</Text> : null}
            {unlistedRecipes.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>RECIPES</Text>
                {unlistedRecipes.map(resultRow)}
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>RESULTS</Text>
            {results.map(resultRow)}
            {results.length === 0 ? <Text style={styles.empty}>{`No foods or recipes found for ""`}</Text> : null}
          </>
        )}

        <View style={styles.actions}>
          <Pressable onPress={createCustom} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>{trimmedQuery ? `+ Create "${suggestedName(trimmedQuery)}"` : '+ Create Custom Food'}</Text>
          </Pressable>
          <Pressable onPress={searchUsda} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>{trimmedQuery ? `Search USDA for "${suggestedName(trimmedQuery)}"` : 'Search USDA'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  headerSpacer: { width: 20 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  search: { height: 48, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: spacing.xl, marginBottom: spacing.sm },
  result: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  resultText: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  kind: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: spacing.xl },
  actions: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, paddingTop: spacing.sm },
  action: { justifyContent: 'center', minHeight: 48 },
  actionText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.55 },
});
