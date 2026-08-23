import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareBackupFile(
  contents: string,
  createdAt = new Date(),
): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Temporary file storage is unavailable.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Saving backup files is unavailable on this device.');
  }

  const timestamp = createdAt.toISOString().replace(/[:.]/g, '-');
  const uri = `${FileSystem.cacheDirectory}personal-nutrition-tracker-backup-${timestamp}.json`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  try {
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Save Nutrition Tracker Backup',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
