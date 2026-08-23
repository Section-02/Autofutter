import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDatabase } from '@/hooks/useAppDatabase';
import { GoalService } from '@/services/goals/goalService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = Readonly<{ kind: 'calories' | 'protein'; title: string; label: string; unit: string }>;
export function GoalNumberEditor({ kind, title, label, unit }: Props) {
  const database = useAppDatabase(); const service = useMemo(() => new GoalService(database), [database]); const router = useRouter(); const [value, setValue] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { service.loadToday().then((goal) => setValue(String(kind === 'calories' ? goal.calorieTarget : goal.proteinMinimumG))); }, [kind, service]);
  const save = async () => {
    const parsed = Number(value); if (!Number.isInteger(parsed) || parsed <= 0) { Alert.alert('Check value', `${label} must be a positive whole number.`); return; }
    setBusy(true); try { const current = await service.loadToday(); await service.saveToday({ ...current, ...(kind === 'calories' ? { calorieTarget: parsed } : { proteinMinimumG: parsed }) }); router.back(); } catch (error) { Alert.alert('Could not save goal', error instanceof Error ? error.message : 'Please try again.'); setBusy(false); }
  };
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>{title}</Text><View style={styles.spacer} /></View><View style={styles.content}><Text style={styles.notice}>Changes take effect today. Previous days are not changed.</Text><Text style={styles.label}>{label.toUpperCase()}</Text><View style={styles.inputRow}><TextInput autoFocus keyboardType="number-pad" onChangeText={setValue} selectTextOnFocus style={styles.input} value={value} /><Text style={styles.unit}>{unit}</Text></View></View><View style={styles.action}><Pressable disabled={busy} onPress={save} style={[styles.button, busy && styles.dim]}><Text style={styles.buttonText}>{busy ? 'SAVING…' : 'SAVE'}</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { flex: 1, paddingHorizontal: spacing.screenHorizontal }, notice: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.xl }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }, inputRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 28, height: 58, paddingHorizontal: spacing.md, textAlign: 'right', width: 170 }, unit: { color: colors.textMuted, fontSize: 17 }, action: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md }, button: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 50 }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: '800' }, dim: { opacity: 0.55 } });
