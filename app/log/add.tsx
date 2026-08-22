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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalFoodSearchResult[]>([]);
  const [recent, setRecent] = useState<LocalFoodSearchResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      searchService.recent().then((items) => {
        if (active) setRecent(items);
      });
      return () => {
        active = false;
      };
    }, [searchService]),
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
  const shown = trimmedQuery.length === 0 ? recent : results;
  const select = (result: LocalFoodSearchResult) => {
    router.push({
      pathname: '/log/amount',
      params: { date, kind: result.kind, id: result.id },
    });
  };
  const createCustom = () => {
    router.push({
      pathname: '/foods/new',
      params: {
        returnTo: 'log',
        date,
        query: suggestedName(trimmedQuery),
      },
    });
  };
  const searchUsda = () => {
    router.push({
      pathname: '/foods/usda',
      params: { returnTo: 'log', date, query: trimmedQuery },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to Log" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>ADD FOOD</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search your foods..."
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={query}
        />
        <Text style={styles.sectionTitle}>{trimmedQuery === '' ? 'RECENT' : 'RESULTS'}</Text>
        {shown.map((result) => (
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
        ))}
        {shown.length === 0 ? (
          <Text style={styles.empty}>
            {trimmedQuery === ''
              ? 'No recently used foods.'
              : `No foods found for "${trimmedQuery}"`}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={createCustom}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>
              {trimmedQuery ? `+ Create "${suggestedName(trimmedQuery)}"` : '+ Create Custom Food'}
            </Text>
          </Pressable>
          <Pressable
            onPress={searchUsda}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>
              {trimmedQuery ? `Search USDA for "${suggestedName(trimmedQuery)}"` : 'Search USDA'}
            </Text>
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
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
  },
  action: { justifyContent: 'center', minHeight: 48 },
  actionText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.55 },
});
