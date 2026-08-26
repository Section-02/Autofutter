import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  measurementSystemLabel,
  measurementSystems,
  type MeasurementSystem,
} from '@/domain/measurements/measurementSystem';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { MeasurementPreferenceService } from '@/services/settings/measurementPreferenceService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function MeasurementsScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new MeasurementPreferenceService(database), [database]);
  const router = useRouter();
  const [selected, setSelected] = useState<MeasurementSystem>('grams');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    service.load().then((system) => active && setSelected(system));
    return () => { active = false; };
  }, [service]);

  const choose = async (system: MeasurementSystem) => {
    if (busy || system === selected) return;
    const previous = selected;
    setSelected(system);
    setBusy(true);
    try {
      await service.save(system);
    } catch {
      setSelected(previous);
      Alert.alert('Could not save preference', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={router.back}><SymbolView name="chevron.left" size={20} tintColor={colors.text} /></Pressable><Text style={styles.title}>MEASUREMENTS</Text><View style={styles.spacer} /></View><View style={styles.content}><Text style={styles.notice}>Choose how cooking amounts are shown and entered. Nutrition calculations continue to use grams internally.</Text><View style={styles.options}>{measurementSystems.map((system) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === system, disabled: busy }} disabled={busy} key={system} onPress={() => void choose(system)} style={styles.option}><View><Text style={styles.optionTitle}>{measurementSystemLabel(system)}</Text><Text style={styles.optionDetail}>{system === 'grams' ? 'Enter food amounts by weight.' : 'Use teaspoons, tablespoons, and cups when a food-specific conversion is available.'}</Text></View>{selected === system ? <SymbolView name="checkmark.circle.fill" size={23} tintColor={colors.accent} /> : <View style={styles.emptyChoice} />}</Pressable>)}</View></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, title: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 }, spacer: { width: 20 }, content: { paddingHorizontal: spacing.screenHorizontal }, notice: { color: colors.textMuted, fontSize: 13, lineHeight: 19 }, options: { marginTop: spacing.xl }, option: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 84, paddingVertical: spacing.md }, optionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, optionDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs, maxWidth: 300 }, emptyChoice: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 23, width: 23 } });
