import { useCallback, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieChart } from '@/components/charts/CalorieChart';
import { ChartLegend } from '@/components/charts/ChartLegend';
import { CombinedChart } from '@/components/charts/CombinedChart';
import { WeightChart } from '@/components/charts/WeightChart';
import type { ProgressMode, ProgressRange } from '@/domain/progress/progressRange';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { ProgressService, type ProgressData } from '@/services/progress/progressService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { parseLocalDate, toLocalDateString, todayLocalDate } from '@/utils/dates';

const MODES: ProgressMode[] = ['Weight', 'Calories', 'Both'];
const RANGES: ProgressRange[] = ['1W', '1M', '6W', '3M', 'All'];

function shownWeight(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} lb`;
}

function shownChange(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} lb`;
}

function shownRangeDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(parseLocalDate(value));
}

export default function ProgressScreen() {
  const database = useAppDatabase();
  const router = useRouter();
  const [mode, setMode] = useState<ProgressMode>('Weight');
  const [range, setRange] = useState<ProgressRange>('3M');
  const [customRange, setCustomRange] = useState<Readonly<{ startDate: string; endDate: string }> | null>(null);
  const [draftStartDate, setDraftStartDate] = useState(todayLocalDate);
  const [draftEndDate, setDraftEndDate] = useState(todayLocalDate);
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setError(null);
    const progress = new ProgressService(database);
    const request = customRange === null
      ? progress.load(range)
      : progress.loadCustomRange(customRange.startDate, customRange.endDate);
    request
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError('Unable to load progress.'); });
    return () => { active = false; };
  }, [customRange, database, range]));

  const applyCustomRange = () => {
    if (draftStartDate > draftEndDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setError(null);
    setCustomRange({ startDate: draftStartDate, endDate: draftEndDate });
  };

  const selectQuickRange = (value: ProgressRange) => {
    setCustomRange(null);
    setRange(value);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>PROGRESS</Text>
        <Pressable accessibilityLabel="Settings" hitSlop={12} onPress={() => router.push('/settings')}>
          <SymbolView name="gearshape" size={21} tintColor={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <SummaryItem label="CURRENT WEIGHT" value={shownWeight(data?.weightSummary.current ?? null)} />
          <SummaryItem label="STARTING WEIGHT" value={shownWeight(data?.weightSummary.starting ?? null)} />
          <SummaryItem label="TOTAL CHANGE" value={shownChange(data?.weightSummary.totalChange ?? null)} />
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push('/weight/new')} style={styles.primaryAction}><Text style={styles.primaryActionText}>+ LOG WEIGHT</Text></Pressable>
          <Pressable onPress={() => router.push('/weight/history')} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>HISTORY</Text></Pressable>
        </View>
        <Segmented values={MODES} selected={mode} onChange={setMode} />
        <View style={styles.rangeRow}>
          {RANGES.map((value) => (
            <Pressable key={value} onPress={() => selectQuickRange(value)} style={[styles.rangeButton, customRange === null && range === value && styles.rangeSelected]}>
              <Text style={[styles.rangeText, customRange === null && range === value && styles.rangeTextSelected]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? (
          <View style={styles.chartSection}>
            {mode === 'Weight' ? (
              <><ChartLegend items={[{ kind: 'weight', label: 'Weight' }]} /><WeightChart points={data.weights} startDate={data.startDate} endDate={data.endDate} /></>
            ) : mode === 'Calories' ? (
              <><ChartLegend items={[{ kind: 'calories', label: 'Calories' }, { kind: 'target', label: 'Target' }, { kind: 'range', label: 'Target range' }]} /><CalorieChart points={data.calories} goals={data.goals} startDate={data.startDate} endDate={data.endDate} /></>
            ) : (
              <><ChartLegend items={[{ kind: 'weight', label: 'Weight' }, { kind: 'calories', label: 'Calories' }, { kind: 'range', label: 'Target range' }]} /><CombinedChart weights={data.weights} calories={data.calories} goals={data.goals} startDate={data.startDate} endDate={data.endDate} /></>
            )}
          </View>
        ) : null}
        <View style={styles.dateRangeSection}>
          <Text style={styles.dateRangeLabel}>CUSTOM DATE RANGE</Text>
          <View style={styles.dateRangeInputs}>
            <Pressable accessibilityLabel="Start date" onPress={() => setDatePicker('start')} style={styles.dateButton}>
              <Text style={styles.dateInputLabel}>START</Text>
              <Text style={styles.dateButtonText}>{shownRangeDate(draftStartDate)}</Text>
            </Pressable>
            <Pressable accessibilityLabel="End date" onPress={() => setDatePicker('end')} style={styles.dateButton}>
              <Text style={styles.dateInputLabel}>END</Text>
              <Text style={styles.dateButtonText}>{shownRangeDate(draftEndDate)}</Text>
            </Pressable>
          </View>
          <Pressable onPress={applyCustomRange} style={styles.applyDatesButton}><Text style={styles.applyDatesText}>APPLY DATES</Text></Pressable>
        </View>
      </ScrollView>
      <Modal animationType="slide" transparent visible={datePicker !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT {datePicker === 'start' ? 'START' : 'END'} DATE</Text>
              <Pressable onPress={() => setDatePicker(null)}><Text style={styles.done}>Done</Text></Pressable>
            </View>
            {datePicker !== null ? <DateTimePicker
              display="inline"
              maximumDate={parseLocalDate(datePicker === 'start' ? draftEndDate : todayLocalDate())}
              minimumDate={datePicker === 'end' ? parseLocalDate(draftStartDate) : undefined}
              mode="date"
              onChange={(_, selected) => {
                if (selected === undefined) return;
                if (datePicker === 'start') setDraftStartDate(toLocalDateString(selected));
                else setDraftEndDate(toLocalDateString(selected));
              }}
              value={parseLocalDate(datePicker === 'start' ? draftStartDate : draftEndDate)}
            /> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return <View style={styles.summaryItem}><Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text><Text numberOfLines={1} style={styles.summaryValue}>{value}</Text></View>;
}

function Segmented<T extends string>({ values, selected, onChange }: Readonly<{ values: T[]; selected: T; onChange: (value: T) => void }>) {
  return <View style={styles.segmented}>{values.map((value) => <Pressable key={value} onPress={() => onChange(value)} style={[styles.segment, selected === value && styles.segmentSelected]}><Text style={[styles.segmentText, selected === value && styles.segmentTextSelected]}>{value}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: 0.5 },
  content: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  summary: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  summaryItem: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.45 },
  summaryValue: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  primaryAction: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 40 },
  primaryActionText: { color: colors.surface, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  secondaryAction: { alignItems: 'center', borderColor: colors.accent, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.lg },
  secondaryActionText: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  segmented: { backgroundColor: colors.border, borderRadius: 10, flexDirection: 'row', padding: 2 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 34 },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextSelected: { color: colors.accent, fontWeight: '800' },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.md },
  rangeButton: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 32, minWidth: 48 },
  rangeSelected: { backgroundColor: colors.accentSoft },
  rangeText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  rangeTextSelected: { color: colors.accent },
  chartSection: { marginTop: spacing.sm },
  dateRangeSection: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xl, paddingTop: spacing.lg },
  dateRangeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.sm },
  dateRangeInputs: { flexDirection: 'row', gap: spacing.sm },
  dateButton: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 58, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dateInputLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  dateButtonText: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 3 },
  applyDatesButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 10, justifyContent: 'center', marginTop: spacing.md, minHeight: 42 },
  applyDatesText: { color: colors.surface, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.25)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
  done: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  error: { color: colors.calorieOver, marginTop: spacing.lg, textAlign: 'center' },
});
