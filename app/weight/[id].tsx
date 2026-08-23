import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { WeightForm } from '@/components/progress/WeightForm';
import { WeightRepository, type WeightRecord } from '@/data/repositories/weightRepository';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { WeightService, type WeightInput } from '@/services/progress/weightService';
import { colors } from '@/theme/colors';

export default function EditWeightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useAppDatabase();
  const service = useMemo(() => new WeightService(database), [database]);
  const router = useRouter();
  const [record, setRecord] = useState<WeightRecord | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { new WeightRepository(database).findById(id).then(setRecord); }, [database, id]);
  const save = async (input: WeightInput) => {
    setBusy(true);
    try { await service.update(id, input); router.back(); }
    catch (error) { Alert.alert('Could not save weight', error instanceof Error ? error.message : 'Please try again.'); setBusy(false); }
  };
  const remove = () => Alert.alert('Delete weigh-in?', 'This permanently removes this weight entry.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { setBusy(true); try { await service.delete(id); router.back(); } catch { Alert.alert('Could not delete weigh-in', 'Please try again.'); setBusy(false); } } },
  ]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="EDIT WEIGHT" onBack={router.back} />
      {record ? <WeightForm busy={busy} initialDate={record.date} initialWeightLb={record.weight_lb} onDelete={remove} onSubmit={save} submitLabel="SAVE CHANGES" /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.background, flex: 1 } });
