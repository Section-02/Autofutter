import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { shareBackupFile } from '../../src/services/backup/backupFileExporter';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const deleteAsync = jest.mocked(FileSystem.deleteAsync);
const isAvailableAsync = jest.mocked(Sharing.isAvailableAsync);
const shareAsync = jest.mocked(Sharing.shareAsync);
const writeAsStringAsync = jest.mocked(FileSystem.writeAsStringAsync);

describe('shareBackupFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteAsync.mockResolvedValue();
    isAvailableAsync.mockResolvedValue(true);
    shareAsync.mockResolvedValue();
    writeAsStringAsync.mockResolvedValue();
  });

  it('writes, shares, and removes the temporary JSON file', async () => {
    await shareBackupFile('{"version":1}', new Date('2026-08-22T20:00:00.000Z'));

    const uri = 'file:///cache/autofutter-backup-2026-08-22T20-00-00-000Z.json';
    expect(writeAsStringAsync).toHaveBeenCalledWith(uri, '{"version":1}', { encoding: 'utf8' });
    expect(shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({
      mimeType: 'application/json',
      UTI: 'public.json',
    }));
    expect(deleteAsync).toHaveBeenCalledWith(uri, { idempotent: true });
  });

  it('reports unavailable sharing before creating a temporary file', async () => {
    isAvailableAsync.mockResolvedValue(false);

    await expect(shareBackupFile('{}')).rejects.toThrow(
      'Saving backup files is unavailable on this device.',
    );
    expect(writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('removes the temporary file when the share sheet fails', async () => {
    shareAsync.mockRejectedValue(new Error('Share failed'));

    await expect(shareBackupFile('{}')).rejects.toThrow('Share failed');
    expect(deleteAsync).toHaveBeenCalledWith(
      expect.stringMatching(/autofutter-backup-.+\.json$/),
      { idempotent: true },
    );
  });
});
