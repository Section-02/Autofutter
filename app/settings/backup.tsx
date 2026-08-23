import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { backupRuntime, type BackupStatusSnapshot } from '@/services/backup/backupRuntime';
import { selectBackupDocument } from '@/services/backup/backupDocumentPicker';
import type { BackupSummary } from '@/services/backup/backupService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function BackupScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<BackupStatusSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void backupRuntime.getSnapshot().then(setSnapshot);
  }, []);

  useEffect(() => {
    refresh();
    return backupRuntime.subscribe(setSnapshot);
  }, [refresh]);

  const backUpNow = async () => {
    setBusy(true);
    try {
      await backupRuntime.backupNow();
      Alert.alert('Backup complete', 'Your current data is saved in iCloud Drive.');
    } catch (error: unknown) {
      Alert.alert('Backup failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const chooseRestore = async () => {
    setBusy(true);
    try {
      const contents = await selectBackupDocument();
      if (!contents) return;
      const service = backupRuntime.getService();
      const summary = service.preview(contents);
      Alert.alert(
        'Restore this backup?',
        summaryText(summary),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              setBusy(true);
              void service.restore(contents).then(async () => {
                await backupRuntime.markDirty();
                Alert.alert('Restore complete', 'The backup was restored successfully.');
              }).catch((error: unknown) => {
                Alert.alert('Restore failed', errorMessage(error));
              }).finally(() => setBusy(false));
            },
          },
        ],
      );
    } catch (error: unknown) {
      Alert.alert('Cannot restore backup', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const status = snapshot?.status === 'up_to_date'
    ? 'Up to date'
    : snapshot?.status === 'failed'
      ? 'Backup failed'
      : 'Backup pending';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="BACKUP" onBack={router.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>ICLOUD BACKUP</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{status}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Last successful backup</Text>
          <Text style={styles.value}>{formatTimestamp(snapshot?.lastSuccessAt ?? null)}</Text>
        </View>
        {snapshot?.lastError ? <Text style={styles.error}>{snapshot.lastError}</Text> : null}
        <Text style={styles.help}>
          Changes are saved locally immediately. The iCloud backup updates automatically a few seconds later.
        </Text>
        <Pressable disabled={busy} onPress={backUpNow} style={[styles.primaryButton, busy && styles.disabled]}>
          <Text style={styles.primaryText}>BACK UP NOW</Text>
        </Pressable>

        <Text style={styles.section}>RESTORE</Text>
        <Text style={styles.help}>
          Choose a Personal Nutrition Tracker JSON backup. You will see its contents before anything is replaced.
        </Text>
        <Pressable disabled={busy} onPress={chooseRestore} style={[styles.secondaryButton, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>CHOOSE BACKUP TO RESTORE</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function summaryText(summary: BackupSummary): string {
  const created = new Date(summary.createdAt);
  const date = Number.isNaN(created.getTime()) ? summary.createdAt : created.toLocaleString();
  return [
    `Created: ${date}`,
    `${summary.foods} foods`,
    `${summary.recipes} recipes`,
    `${summary.detailedLogEntries} detailed log entries`,
    `${summary.dailySummaries} daily summaries`,
    `${summary.weighIns} weigh-ins`,
    '',
    'Your current data will be replaced only if the restore completes successfully.',
  ].join('\n');
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.screenHorizontal },
  section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.xl },
  statusRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 54 },
  label: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' },
  value: { color: colors.textMuted, fontSize: 14 },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
  error: { color: colors.calorieOver, fontSize: 13, lineHeight: 18, marginTop: spacing.md },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, marginTop: spacing.lg, padding: spacing.md },
  primaryText: { color: colors.surface, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  secondaryButton: { alignItems: 'center', borderColor: colors.accent, borderRadius: 12, borderWidth: 1.5, marginTop: spacing.lg, padding: spacing.md },
  secondaryText: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.5 },
});
