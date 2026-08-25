import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { selectBackupDocument } from '../../src/services/backup/backupDocumentPicker';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn() }));

const getDocumentAsync = jest.mocked(DocumentPicker.getDocumentAsync);
const readAsStringAsync = jest.mocked(FileSystem.readAsStringAsync);

describe('selectBackupDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when file selection is canceled', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(selectBackupDocument()).resolves.toBeNull();
    expect(readAsStringAsync).not.toHaveBeenCalled();
  });

  it('reads the selected JSON file from the document picker cache', async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        lastModified: 1_776_888_000_000,
        mimeType: 'application/json',
        name: 'backup.json',
        size: 100,
        uri: 'file:///cache/backup.json',
      }],
    });
    readAsStringAsync.mockResolvedValue('{"version":1}');

    await expect(selectBackupDocument()).resolves.toBe('{"version":1}');
    expect(readAsStringAsync).toHaveBeenCalledWith('file:///cache/backup.json');
  });

  it('rejects an incomplete document-picker result', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: false, assets: [] });

    await expect(selectBackupDocument()).rejects.toThrow('No backup file was selected.');
  });
});
