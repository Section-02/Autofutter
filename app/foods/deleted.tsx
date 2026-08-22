import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FoodRecord } from '@/data/repositories/foodRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { FoodService } from '@/services/foods/foodService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function DeletedFoodsScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new FoodService(database), [database]);
  const router = useRouter();
  const [foods, setFoods] = useState<FoodRecord[]>([]);

  const load = useCallback(() => {
    let active = true;
    service.listDeleted().then((items) => {
      if (active) setFoods(items);
    });
    return () => {
      active = false;
    };
  }, [service]);

  useFocusEffect(load);

  const restore = async (id: string) => {
    await service.restore(id);
    setFoods((current) => current.filter((food) => food.id !== id));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>DELETED FOODS</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {foods.map((food) => (
          <View key={food.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{food.name}</Text>
              <Text style={styles.detail}>
                {Number(food.calories.toFixed(2))} kcal /{' '}
                {Number(food.reference_weight_g.toFixed(2))} g
              </Text>
            </View>
            <Pressable onPress={() => restore(food.id)} style={styles.restoreButton}>
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
          </View>
        ))}
        {foods.length === 0 ? (
          <Text style={styles.empty}>No deleted foods.</Text>
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
  content: { paddingHorizontal: spacing.screenHorizontal },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 70,
  },
  rowText: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  restoreButton: { padding: spacing.md },
  restoreText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  empty: { color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' },
});
