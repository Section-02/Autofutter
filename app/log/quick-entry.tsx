import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuickEntryForm } from '@/components/quick/QuickEntryForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { QuickEntryService, type QuickEntryInput } from '@/services/logging/quickEntryService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { todayLocalDate } from '@/utils/dates';
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
export default function QuickEntryScreen() {
  const date = first(useLocalSearchParams<{ date?: string | string[] }>().date) ?? todayLocalDate();
  const database = useAppDatabase(); const service = useMemo(() => new QuickEntryService(database), [database]); const router = useRouter(); const [busy, setBusy] = useState(false);
  const save = async (input: QuickEntryInput) => { setBusy(true); try { await service.add(input); router.replace({ pathname: '/', params: { date } }); } finally { setBusy(false); } };
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>QUICK ENTRY</Text><View style={styles.spacer} /></View><QuickEntryForm busy={busy} date={date} initialValues={{ name: '', calories: null, proteinG: null, fatG: null, carbsG: null, sodiumMg: null, cholesterolMg: null, isEstimated: true }} onSubmit={save} submitLabel="ADD TO LOG" /></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 } });
