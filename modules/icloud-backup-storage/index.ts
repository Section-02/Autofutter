import { requireOptionalNativeModule } from 'expo-modules-core';

export type ICloudBackupStorageNativeModule = {
  isAvailable(): Promise<boolean>;
  writeBackup(contents: string): Promise<void>;
  readBackup(): Promise<string | null>;
};

export default requireOptionalNativeModule<ICloudBackupStorageNativeModule>(
  'ICloudBackupStorage',
);
