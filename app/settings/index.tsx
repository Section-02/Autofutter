import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GoalValues } from '@/domain/goals/goalCalculator';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { GoalService } from '@/services/goals/goalService';
import { backupRuntime, type BackupStatusSnapshot } from '@/services/backup/backupRuntime';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RowProps = Readonly<{ label: string; value: string; onPress?: () => void }>;
function Row({ label, value, onPress }: RowProps) { return <Pressable disabled={!onPress} onPress={onPress} style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text>{onPress ? <SymbolView name="chevron.right" size={15} tintColor={colors.textMuted} /> : null}</Pressable>; }
export default function SettingsScreen() {
  const database = useAppDatabase(); const service = useMemo(() => new GoalService(database), [database]); const router = useRouter(); const [goal, setGoal] = useState<GoalValues | null>(null); const [backup, setBackup] = useState<BackupStatusSnapshot | null>(null);
  useFocusEffect(useCallback(() => { let active = true; service.loadToday().then((value) => active && setGoal(value)); backupRuntime.getSnapshot().then((value) => active && setBackup(value)); const unsubscribe = backupRuntime.subscribe((value) => active && setBackup(value)); return () => { active = false; unsubscribe(); }; }, [service]));
  const backupLabel = backup?.status === 'up_to_date' ? 'Up to date' : backup?.status === 'failed' ? 'Backup failed' : 'Backup pending';
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>SETTINGS</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.content}><Text style={styles.section}>GOALS</Text><Row label="Daily Calories" onPress={() => router.push('/settings/calories')} value={goal ? `${goal.calorieTarget.toLocaleString()} kcal` : '—'} /><Row label="Protein Minimum" onPress={() => router.push('/settings/protein')} value={goal ? `${goal.proteinMinimumG.toLocaleString()} g` : '—'} /><Row label="Calorie Target Range" onPress={() => router.push('/settings/tolerance')} value={goal ? `±${goal.calorieTolerancePercent}%` : '—'} /><Text style={styles.section}>DATA</Text><Row label="Backup" onPress={() => router.push('/settings/backup')} value={backupLabel} /><Row label="Deleted Items" onPress={() => router.push('/settings/deleted')} value="" /><Text style={styles.section}>ABOUT</Text><Row label="App Version" value="1.0.0" /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.screenHorizontal }, section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xl }, row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 58 }, rowLabel: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' }, rowValue: { color: colors.textMuted, fontSize: 14, marginRight: spacing.sm } });
