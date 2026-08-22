import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FoodRecord, FoodSort } from '@/data/repositories/foodRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { FoodService } from '@/services/foods/foodService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const sortOptions: readonly { value: FoodSort; label: string }[] = [
  { value: 'most_used', label: 'Most Used' },
  { value: 'recently_used', label: 'Recently Used' },
  { value: 'name', label: 'A–Z' },
  { value: 'recently_added', label: 'Recently Added' },
];

export default function FoodsScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new FoodService(database), [database]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<FoodSort>('most_used');
  const [foods, setFoods] = useState<FoodRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      service.list(query, sort).then((items) => {
        if (active) setFoods(items);
      });
      return () => {
        active = false;
      };
    }, [query, service, sort]),
  );

  const chooseSort = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: sortOptions.length,
        options: [...sortOptions.map(({ label }) => label), 'Cancel'],
        title: 'Sort foods',
      },
      (index) => {
        const selected = sortOptions[index];
        if (selected) setSort(selected.value);
      },
    );
  };

  const addFood = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 2,
        options: ['Create Custom Food', 'Search USDA', 'Cancel'],
        title: 'Add Food',
      },
      (index) => {
        if (index === 0) {
          router.push({ pathname: '/foods/new', params: { returnTo: 'foods' } });
        } else if (index === 1) {
          router.push({ pathname: '/foods/usda', params: { returnTo: 'foods' } });
        }
      },
    );
  };

  const currentSort = sortOptions.find(({ value }) => value === sort)?.label;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>FOODS</Text>
        <Pressable
          accessibilityLabel="Deleted foods"
          hitSlop={10}
          onPress={() => router.push('/foods/deleted')}
        >
          <SymbolView name="trash" size={19} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search foods..."
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={query}
        />
        <Pressable onPress={chooseSort} style={styles.sortButton}>
          <Text style={styles.sortLabel}>SORT: {currentSort}</Text>
          <SymbolView name="chevron.down" size={13} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {foods.map((food) => (
          <Pressable
            key={food.id}
            onPress={() =>
              router.push({ pathname: '/foods/[id]', params: { id: food.id } })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={styles.foodName}>{food.name}</Text>
              <Text style={styles.nutrition}>
                {Number(food.calories.toFixed(2))} kcal /{' '}
                {Number(food.reference_weight_g.toFixed(2))} g
              </Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor={colors.textMuted} />
          </Pressable>
        ))}
        {foods.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim() ? `No foods found for "${query.trim()}"` : 'No foods yet.'}
          </Text>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={addFood} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ ADD FOOD</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  title: { ...typography.screenTitle, color: colors.text },
  content: { paddingHorizontal: spacing.screenHorizontal },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    height: 48,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sortButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
  },
  sortLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  list: { paddingBottom: 100, paddingHorizontal: spacing.screenHorizontal },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 68,
  },
  rowText: { flex: 1, paddingRight: spacing.sm },
  foodName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  nutrition: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  empty: { color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
  },
  addButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.55 },
});
