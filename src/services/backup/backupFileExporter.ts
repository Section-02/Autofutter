import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareBackupFile(
  contents: string,
  createdAt = new Date(),
): Promise<void> {
  return shareJsonFile(contents, 'autofutter-backup', 'Save Autofutter Backup', createdAt);
}

export async function shareLibraryFile(
  contents: string,
  kind: 'foods' | 'recipes',
  createdAt = new Date(),
): Promise<void> {
  const label = kind === 'foods' ? 'Foods' : 'Recipes';
  return shareJsonFile(contents, `autofutter-${kind}`, `Share Autofutter ${label}`, createdAt);
}

async function shareJsonFile(
  contents: string,
  filenamePrefix: string,
  dialogTitle: string,
  createdAt: Date,
): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Temporary file storage is unavailable.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Saving backup files is unavailable on this device.');
  }

  const timestamp = createdAt.toISOString().replace(/[:.]/g, '-');
  const uri = `${FileSystem.cacheDirectory}${filenamePrefix}-${timestamp}.json`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  try {
    await Sharing.shareAsync(uri, {
      dialogTitle,
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
