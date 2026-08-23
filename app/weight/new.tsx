import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { WeightForm } from '@/components/progress/WeightForm';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { WeightService, type WeightInput } from '@/services/progress/weightService';
import { colors } from '@/theme/colors';
import { todayLocalDate } from '@/utils/dates';

export default function NewWeightScreen() {
  const database = useAppDatabase();
  const service = useMemo(() => new WeightService(database), [database]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const save = async (input: WeightInput) => {
    setBusy(true);
    try { await service.save(input); router.back(); }
    catch (error) { Alert.alert('Could not save weight', error instanceof Error ? error.message : 'Please try again.'); setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="LOG WEIGHT" onBack={router.back} />
      <WeightForm busy={busy} initialDate={todayLocalDate()} onSubmit={save} submitLabel="SAVE" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
