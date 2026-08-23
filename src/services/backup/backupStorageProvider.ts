export interface BackupStorageProvider {
  isAvailable(): Promise<boolean>;
  writeCurrentBackup(contents: string): Promise<void>;
  readCurrentBackup(): Promise<string | null>;
}
