import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useAppDatabase } from '@/hooks/useAppDatabase';
import { selectBackupDocument } from '@/services/backup/backupDocumentPicker';
import { shareBackupFile, shareLibraryFile } from '@/services/backup/backupFileExporter';
import { BackupService, type BackupSummary } from '@/services/backup/backupService';
import { ShareExportService } from '@/services/backup/shareExportService';
import {
  ShareImportService,
  type ImportConflictChoice,
  type ShareImportPreview,
  type ShareImportResult,
} from '@/services/backup/shareImportService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function BackupScreen() {
  const router = useRouter();
  const database = useAppDatabase();
  const service = useMemo(() => new BackupService(database), [database]);
  const shareService = useMemo(() => new ShareExportService(database), [database]);
  const importService = useMemo(() => new ShareImportService(database), [database]);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    contents: string;
    preview: ShareImportPreview;
    choices: Record<string, ImportConflictChoice>;
  } | null>(null);

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

  const shareLibrary = async (kind: 'foods' | 'recipes') => {
    setBusy(true);
    try {
      const createdAt = new Date();
      const contents = kind === 'foods'
        ? await shareService.createFoodContents(createdAt.toISOString())
        : await shareService.createRecipeContents(createdAt.toISOString());
      await shareLibraryFile(contents, kind, createdAt);
    } catch (error: unknown) {
      Alert.alert(`Cannot export ${kind}`, errorMessage(error));
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

  const performImport = async (contents: string, choices: Readonly<Record<string, ImportConflictChoice>>) => {
    setBusy(true);
    try {
      const result = await importService.import(contents, choices);
      setPendingImport(null);
      Alert.alert('Import complete', importResultText(result));
    } catch (error: unknown) {
      Alert.alert('Import failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const chooseLibraryImport = async () => {
    setBusy(true);
    try {
      const contents = await selectBackupDocument();
      if (!contents) return;
      const preview = await importService.preview(contents);
      const choices = Object.fromEntries(preview.conflicts.map(({ key }) => [key, 'keep' as const]));
      if (preview.conflicts.length > 0) {
        setPendingImport({ contents, preview, choices });
      } else {
        Alert.alert(
          'Import shared library?',
          `Add ${preview.foods} foods and ${preview.recipes} recipes?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Import', onPress: () => { void performImport(contents, choices); } },
          ],
        );
      }
    } catch (error: unknown) {
      Alert.alert('Cannot import library', errorMessage(error));
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

        <Text style={styles.section}>SHARE LIBRARY</Text>
        <Text style={styles.help}>
          Export foods or recipes without including your logs, goals, weights, or settings.
          Recipe exports include the foods needed to recreate them accurately.
        </Text>
        <Pressable disabled={busy} onPress={() => shareLibrary('foods')} style={[styles.secondaryButton, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>EXPORT FOODS</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => shareLibrary('recipes')} style={[styles.secondaryButton, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>EXPORT RECIPES</Text>
        </Pressable>

        <Text style={styles.section}>IMPORT SHARED LIBRARY</Text>
        <Text style={styles.help}>
          Choose a shared Foods or Recipes file. You can review every duplicate before importing.
        </Text>
        <Pressable disabled={busy} onPress={chooseLibraryImport} style={[styles.secondaryButton, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>CHOOSE FILE TO IMPORT</Text>
        </Pressable>

        <Text style={styles.section}>RESTORE</Text>
        <Text style={styles.help}>
          Choose an Autofutter JSON backup. You will see its contents before anything is replaced.
        </Text>
        <Pressable disabled={busy} onPress={chooseRestore} style={[styles.secondaryButton, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>CHOOSE BACKUP TO RESTORE</Text>
        </Pressable>
      </ScrollView>
      <Modal animationType="slide" onRequestClose={() => setPendingImport(null)} presentationStyle="pageSheet" visible={pendingImport !== null}>
        {pendingImport ? (
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Pressable disabled={busy} onPress={() => setPendingImport(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Text style={styles.modalTitle}>RESOLVE DUPLICATES</Text>
              <View style={styles.headerSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.conflictContent}>
              <Text style={styles.conflictHelp}>
                Choose what to do with each matching item. Keep Existing is selected by default.
              </Text>
              {pendingImport.preview.conflicts.map((conflict) => {
                const choice = pendingImport.choices[conflict.key] ?? 'keep';
                return (
                  <View key={conflict.key} style={styles.conflictCard}>
                    <Text style={styles.conflictKind}>{conflict.kind.toUpperCase()}</Text>
                    <Text style={styles.conflictName}>{conflict.incomingName}</Text>
                    {conflict.existingName !== conflict.incomingName ? <Text style={styles.existingName}>Existing: {conflict.existingName}</Text> : null}
                    <View style={styles.choiceRow}>
                      {(['keep', 'overwrite'] as const).map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => setPendingImport((current) => current ? {
                            ...current,
                            choices: { ...current.choices, [conflict.key]: option },
                          } : null)}
                          style={[styles.choiceButton, choice === option && styles.choiceButtonSelected]}
                        >
                          <Text style={[styles.choiceText, choice === option && styles.choiceTextSelected]}>
                            {option === 'keep' ? 'KEEP EXISTING' : 'OVERWRITE'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActionArea}>
              <Pressable disabled={busy} onPress={() => { void performImport(pendingImport.contents, pendingImport.choices); }} style={[styles.primaryButton, busy && styles.disabled]}>
                <Text style={styles.primaryText}>{busy ? 'IMPORTING…' : 'IMPORT'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
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

function importResultText(result: ShareImportResult): string {
  return [
    `${result.foodsAdded} foods added`,
    `${result.foodsOverwritten} foods overwritten`,
    `${result.foodsKept} existing foods kept`,
    `${result.recipesAdded} recipes added`,
    `${result.recipesOverwritten} recipes overwritten`,
    `${result.recipesKept} existing recipes kept`,
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
  modalSafeArea: { backgroundColor: colors.background, flex: 1 },
  modalHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  cancelText: { color: colors.accent, fontSize: 15, minWidth: 55 },
  headerSpacer: { width: 55 },
  conflictContent: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  conflictHelp: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  conflictCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  conflictKind: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  conflictName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.xs },
  existingName: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  choiceButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 9, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.xs },
  choiceButtonSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  choiceText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  choiceTextSelected: { color: colors.accent },
  modalActionArea: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
});
