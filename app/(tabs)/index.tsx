import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateNavigator } from '@/components/log/DateNavigator';
import { FoodLogList } from '@/components/log/FoodLogList';
import { CalorieGauge } from '@/components/nutrition/CalorieGauge';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { ProteinProgress } from '@/components/nutrition/ProteinProgress';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { calculateGaugeState } from '@/domain/nutrition/calorieGaugeCalculator';
import {
  LogQueryService,
  type DayLogData,
} from '@/services/logging/logQueryService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { assertLocalDate, todayLocalDate } from '@/utils/dates';

function safeRequestedDate(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === undefined || candidate > todayLocalDate()) return todayLocalDate();
  try {
    assertLocalDate(candidate);
    return candidate;
  } catch {
    return todayLocalDate();
  }
}

export default function LogScreen() {
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const database = useAppDatabase();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => safeRequestedDate(params.date));
  const [data, setData] = useState<DayLogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      new LogQueryService(database)
        .loadDay(selectedDate)
        .then((result) => {
          if (active) setData(result);
        })
        .catch(() => {
          if (active) setError('Unable to load this day.');
        });
      return () => {
        active = false;
      };
    }, [database, selectedDate]),
  );

  const summary = data?.summary;
  const goal = data?.goal;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>LOG</Text>
        <Pressable accessibilityLabel="Settings" hitSlop={12} style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <SymbolView name="gearshape" size={21} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <DateNavigator date={selectedDate} onChange={setSelectedDate} />
        {error !== null ? <Text style={styles.error}>{error}</Text> : null}
        {summary !== undefined && goal !== undefined ? (
          <>
            <CalorieGauge
              state={calculateGaugeState(
                summary.calories,
                goal.calorieTarget,
                goal.calorieTolerancePercent,
              )}
            />
            <ProteinProgress
              consumedG={summary.protein_g ?? 0}
              minimumG={goal.proteinMinimumG}
            />
            <View style={styles.divider} />
            <NutritionGrid
              fatG={summary.fat_g}
              carbsG={summary.carbs_g}
              sodiumMg={summary.sodium_mg}
              cholesterolMg={summary.cholesterol_mg}
            />
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>FOOD</Text>
              {summary.has_partial_nutrition === 1 ? (
                <Text style={styles.partial}>ⓘ Partial nutrition data today</Text>
              ) : null}
              <FoodLogList
                entries={data?.entries ?? []}
                onPressEntry={(id) =>
                  router.push({ pathname: '/log/entry/[id]', params: { id } })
                }
              />
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={styles.actionArea}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/log/add', params: { date: selectedDate } })
          }
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addButtonText}>+ ADD TO LOG</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.md },
  settingsButton: { marginRight: 48 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xl },
  error: { color: colors.calorieOver, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xl },
  entriesSection: { marginTop: spacing.xl },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  partial: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  actionArea: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  addButton: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  addButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  pressed: { opacity: 0.72 },
});
