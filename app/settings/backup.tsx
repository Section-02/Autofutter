import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { selectBackupDocument } from '@/services/backup/backupDocumentPicker';
import { shareBackupFile } from '@/services/backup/backupFileExporter';
import { BackupService, type BackupSummary } from '@/services/backup/backupService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function BackupScreen() {
  const router = useRouter();
  const database = useAppDatabase();
  const service = useMemo(() => new BackupService(database), [database]);
  const [busy, setBusy] = useState(false);

  const createBackup = async () => {
    setBusy(true);
    try {
      const createdAt = new Date();
      const contents = await service.createBackupContents(createdAt.toISOString());
      await shareBackupFile(contents, createdAt);
    } catch (error: unknown) {
      Alert.alert('Cannot create backup', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const chooseRestore = async () => {
    setBusy(true);
    try {
      const contents = await selectBackupDocument();
      if (!contents) return;
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
              void service.restore(contents).then(() => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="BACKUP" onBack={router.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>CREATE BACKUP FILE</Text>
        <Text style={styles.help}>
          Create a portable JSON backup, then choose Save to Files from the share sheet.
        </Text>
        <Pressable disabled={busy} onPress={createBackup} style={[styles.primaryButton, busy && styles.disabled]}>
          <Text style={styles.primaryText}>CREATE BACKUP FILE</Text>
        </Pressable>

        <Text style={styles.section}>RESTORE</Text>
        <Text style={styles.help}>
          Choose an Autofutter JSON backup. You will see its contents before anything is replaced.
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
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, marginTop: spacing.lg, padding: spacing.md },
  primaryText: { color: colors.surface, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  secondaryButton: { alignItems: 'center', borderColor: colors.accent, borderRadius: 12, borderWidth: 1.5, marginTop: spacing.lg, padding: spacing.md },
  secondaryText: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.5 },
});
