import ICloudBackupStorage from '@modules/icloud-backup-storage';

import type { BackupStorageProvider } from './backupStorageProvider';

export class ICloudBackupStorageProvider implements BackupStorageProvider {
  async isAvailable(): Promise<boolean> {
    return (await ICloudBackupStorage?.isAvailable()) ?? false;
  }

  async writeCurrentBackup(contents: string): Promise<void> {
    if (!ICloudBackupStorage) {
      throw new Error('iCloud backup requires a new development build.');
    }
    await ICloudBackupStorage.writeBackup(contents);
  }

  async readCurrentBackup(): Promise<string | null> {
    if (!ICloudBackupStorage) {
      throw new Error('iCloud backup requires a new development build.');
    }
    return ICloudBackupStorage.readBackup();
  }
}
