import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FoodRecord } from '@/data/repositories/foodRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { FoodInUseError, FoodService } from '@/services/foods/foodService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
export default function DeletedFoodsScreen() {
  const database = useAppDatabase(); const service = useMemo(() => new FoodService(database), [database]); const router = useRouter(); const [foods, setFoods] = useState<FoodRecord[]>([]);
  const reload = useCallback(() => service.listDeleted().then(setFoods), [service]); useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const restore = async (id: string) => { await service.restore(id); await reload(); };
  const remove = (food: FoodRecord) => Alert.alert('Permanently delete food?', `“${food.name}” cannot be recovered.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete Forever', style: 'destructive', onPress: async () => { try { await service.permanentlyDelete(food.id); await reload(); } catch (error) { Alert.alert('Cannot delete food', error instanceof FoodInUseError ? error.message : 'Please try again.'); } } }]);
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>DELETED FOODS</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}>{foods.map((food) => <View key={food.id} style={styles.row}><View style={styles.rowText}><Text style={styles.name}>{food.name}</Text><Text style={styles.detail}>{Number(food.calories.toFixed(2))} kcal / {Number(food.reference_weight_g.toFixed(2))} g</Text></View><Pressable onPress={() => restore(food.id)} style={styles.action}><Text style={styles.restoreText}>RESTORE</Text></Pressable><Pressable accessibilityLabel={`Permanently delete ${food.name}`} hitSlop={8} onPress={() => remove(food)} style={styles.action}><SymbolView name="trash" size={17} tintColor={colors.calorieOver} /></Pressable></View>)}{foods.length === 0 ? <Text style={styles.empty}>No deleted foods.</Text> : null}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingHorizontal: spacing.screenHorizontal }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 70 }, rowText: { flex: 1 }, name: { color: colors.text, fontSize: 15, fontWeight: '600' }, detail: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, action: { padding: spacing.sm }, restoreText: { color: colors.accent, fontSize: 11, fontWeight: '800' }, empty: { color: colors.textMuted, marginTop: spacing.xxl, textAlign: 'center' } });
