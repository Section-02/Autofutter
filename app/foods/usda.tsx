import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UsdaClient } from '@/services/usda/usdaClient';
import type { UsdaFoodCandidate } from '@/services/usda/usdaTypes';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function valueParam(value: number | null): string {
  return value === null ? '' : String(Number(value.toFixed(6)));
}

export default function UsdaSearchScreen() {
  const params = useLocalSearchParams<{
    query?: string | string[];
    returnTo?: string | string[];
    date?: string | string[];
    returnToken?: string | string[];
  }>();
  const initialQuery = first(params.query) ?? '';
  const requestedReturn = first(params.returnTo);
  const returnTo = requestedReturn === 'log' ? 'log' : requestedReturn === 'recipe' ? 'recipe' : 'foods';
  const date = first(params.date) ?? todayLocalDate();
  const returnToken = first(params.returnToken);
  const client = useMemo(() => new UsdaClient(), []);
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<UsdaFoodCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialSearchStarted = useRef(false);
  const searchInFlight = useRef(false);

  const search = useCallback(async (requestedQuery = query) => {
    const trimmed = requestedQuery.trim();
    if (!trimmed || searchInFlight.current) return;
    searchInFlight.current = true;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setResults(await client.search(trimmed));
    } catch (caught) {
      setResults([]);
      setError(
        caught instanceof Error
          ? caught.message
          : 'USDA search requires an internet connection.',
      );
    } finally {
      searchInFlight.current = false;
      setLoading(false);
    }
  }, [client, query]);

  useEffect(() => {
    if (initialQuery && !initialSearchStarted.current) {
      initialSearchStarted.current = true;
      void search(initialQuery);
    }
  }, [initialQuery, search]);

  const review = (food: UsdaFoodCandidate) => {
    router.push({
      pathname: '/foods/new',
      params: {
        returnTo,
        returnToken,
        date,
        sourceType: 'usda',
        sourceId: food.fdcId,
        name: food.name,
        referenceWeightG: String(food.referenceWeightG),
        calories: valueParam(food.nutrition.calories),
        proteinG: valueParam(food.nutrition.proteinG),
        fatG: valueParam(food.nutrition.fatG),
        carbsG: valueParam(food.nutrition.carbsG),
        sodiumMg: valueParam(food.nutrition.sodiumMg),
        cholesterolMg: valueParam(food.nutrition.cholesterolMg),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>SEARCH USDA</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          onSubmitEditing={() => search()}
          placeholder="Search FoodData Central..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        <Pressable onPress={() => search()} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
      >
        {results.map((food) => (
          <Pressable
            key={food.fdcId}
            onPress={() => review(food)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={styles.name}>{food.name}</Text>
              <Text numberOfLines={1} style={styles.source}>
                {food.brandOwner ? `${food.brandOwner} · ` : ''}{food.dataType}
              </Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} />
          </Pressable>
        ))}
        {!loading && searched && !error && results.length === 0 ? (
          <Text style={styles.empty}>No USDA foods found.</Text>
        ) : null}
        {!searched ? (
          <Text style={styles.help}>
            USDA results are separate from your saved foods. Select one to review and edit it before saving.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  spacer: { width: 20 },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  searchButtonText: { color: colors.surface, fontWeight: '700' },
  loading: { marginTop: spacing.lg },
  error: {
    color: colors.calorieOver,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    textAlign: 'center',
  },
  results: { padding: spacing.screenHorizontal },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 72,
  },
  rowText: { flex: 1, paddingRight: spacing.sm },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  source: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  help: { color: colors.textMuted, lineHeight: 20, marginTop: spacing.xl, textAlign: 'center' },
  empty: { color: colors.textMuted, marginTop: spacing.xl, textAlign: 'center' },
  pressed: { opacity: 0.55 },
});
