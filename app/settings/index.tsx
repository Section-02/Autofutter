import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GoalValues } from '@/domain/goals/goalCalculator';
import { measurementSystemLabel, type MeasurementSystem } from '@/domain/measurements/measurementSystem';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { GoalService } from '@/services/goals/goalService';
import { DataResetService } from '@/services/settings/dataResetService';
import { MeasurementPreferenceService } from '@/services/settings/measurementPreferenceService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RowProps = Readonly<{ destructive?: boolean; label: string; value: string; onPress?: () => void }>;
function Row({ destructive = false, label, value, onPress }: RowProps) { return <Pressable disabled={!onPress} onPress={onPress} style={styles.row}><Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text><Text style={styles.rowValue}>{value}</Text>{onPress ? <SymbolView name="chevron.right" size={15} tintColor={destructive ? colors.calorieOver : colors.textMuted} /> : null}</Pressable>; }
export default function SettingsScreen() {
  const database = useAppDatabase(); const service = useMemo(() => new GoalService(database), [database]); const preferenceService = useMemo(() => new MeasurementPreferenceService(database), [database]); const router = useRouter(); const [goal, setGoal] = useState<GoalValues | null>(null); const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('grams');
  useFocusEffect(useCallback(() => { let active = true; Promise.all([service.loadToday(), preferenceService.load()]).then(([goalValue, system]) => { if (active) { setGoal(goalValue); setMeasurementSystem(system); } }); return () => { active = false; }; }, [preferenceService, service]));
  const confirmReset = () => {
    Alert.alert(
      'Erase all data?',
      'This permanently deletes all foods, recipes, food logs, goals, weights, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase All Data',
          style: 'destructive',
          onPress: () => {
            void new DataResetService(database).eraseAllData().then(() => {
              router.replace('/');
            }).catch(() => {
              Alert.alert('Could not erase data', 'Your data was not erased. Please try again.');
            });
          },
        },
      ],
    );
  };
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>SETTINGS</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}><Text style={styles.section}>GOALS</Text><Row label="Daily Calories" onPress={() => router.push('/settings/calories')} value={goal ? `${goal.calorieTarget.toLocaleString()} kcal` : '—'} /><Row label="Protein Minimum" onPress={() => router.push('/settings/protein')} value={goal ? `${goal.proteinMinimumG.toLocaleString()} g` : '—'} /><Row label="Calorie Target Range" onPress={() => router.push('/settings/tolerance')} value={goal ? `±${goal.calorieTolerancePercent}%` : '—'} /><Text style={styles.section}>PREFERENCES</Text><Row label="Measurements" onPress={() => router.push('/settings/measurements')} value={measurementSystemLabel(measurementSystem)} /><Text style={styles.section}>DATA</Text><Row label="Backup" onPress={() => router.push('/settings/backup')} value="Create or restore" /><Row label="Deleted Items" onPress={() => router.push('/settings/deleted')} value="" /><Row destructive label="Reset Data" onPress={confirmReset} value="" /><Text style={styles.section}>ABOUT</Text><Row label="App Version" value="1.0.0" /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.screenHorizontal }, section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xl }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 58 }, rowLabel: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' }, rowValue: { color: colors.textMuted, fontSize: 14, marginRight: spacing.sm }, destructive: { color: colors.calorieOver } });
