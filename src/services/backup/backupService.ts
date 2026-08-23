import type { DatabaseConnection } from '@/data/database/types';
import { BackupRepository } from '@/data/repositories/backupRepository';
import {
  backupDocumentSchema,
  parseBackupDocument,
  type BackupDocument,
} from '@/schemas/backup';

import type { BackupStorageProvider } from './backupStorageProvider';

export type BackupSummary = Readonly<{
  createdAt: string;
  foods: number;
  recipes: number;
  detailedLogEntries: number;
  dailySummaries: number;
  weighIns: number;
  goals: number;
}>;

export class BackupService {
  constructor(
    private readonly database: DatabaseConnection,
    private readonly storage: BackupStorageProvider,
  ) {}

  async createDocument(createdAt = new Date().toISOString()): Promise<BackupDocument> {
    let data: BackupDocument['data'] | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      data = await new BackupRepository(transaction).exportData();
    });
    if (!data) {
      throw new Error('The backup snapshot could not be created.');
    }
    const document: BackupDocument = {
      format: 'personal-nutrition-tracker',
      version: 1,
      createdAt,
      data,
    };
    return backupDocumentSchema.parse(document);
  }

  async writeCurrentBackup(createdAt = new Date().toISOString()): Promise<void> {
    if (!(await this.storage.isAvailable())) {
      throw new Error('iCloud Drive is unavailable. Check iCloud Drive in Settings.');
    }
    const document = await this.createDocument(createdAt);
    await this.storage.writeCurrentBackup(JSON.stringify(document, null, 2));

    const saved = await this.storage.readCurrentBackup();
    if (!saved) {
      throw new Error('The iCloud backup could not be read after saving.');
    }
    parseBackupDocument(saved);
  }

  preview(contents: string): BackupSummary {
    return summarizeBackup(parseBackupDocument(contents));
  }

  async restore(contents: string): Promise<BackupSummary> {
    const document = parseBackupDocument(contents);
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repository = new BackupRepository(transaction);
      await repository.replaceAll(document.data);
      await repository.verifyIntegrity();
    });
    return summarizeBackup(document);
  }
}

export function summarizeBackup(document: BackupDocument): BackupSummary {
  return {
    createdAt: document.createdAt,
    foods: document.data.foods.length,
    recipes: document.data.recipes.length,
    detailedLogEntries: document.data.foodLogs.length,
    dailySummaries: document.data.dailyNutrition.length,
    weighIns: document.data.weighIns.length,
    goals: document.data.goals.length,
  };
}
