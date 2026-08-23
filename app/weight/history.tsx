import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { WeightRepository, type WeightRecord } from '@/data/repositories/weightRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { formatLongLocalDate } from '@/utils/dates';

export default function WeightHistoryScreen() {
  const database = useAppDatabase(); const router = useRouter(); const [rows, setRows] = useState<WeightRecord[]>([]);
  useFocusEffect(useCallback(() => { let active = true; new WeightRepository(database).listAll().then((values) => { if (active) setRows(values.reverse()); }); return () => { active = false; }; }, [database]));
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="WEIGHT HISTORY" onBack={router.back} />
      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? <Text style={styles.empty}>No weigh-ins yet.</Text> : rows.map((row) => (
          <Pressable key={row.id} onPress={() => router.push({ pathname: '/weight/[id]', params: { id: row.id } })} style={styles.row}>
            <View><Text style={styles.date}>{formatLongLocalDate(row.date)}</Text><Text style={styles.hint}>Tap to edit</Text></View>
            <Text style={styles.weight}>{row.weight_lb.toFixed(1)} lb</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72 },
  date: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs },
  weight: { color: colors.text, fontSize: 17, fontWeight: '700' },
  empty: { color: colors.textMuted, paddingVertical: spacing.xxl, textAlign: 'center' },
});
