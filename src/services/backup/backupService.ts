import type { DatabaseConnection } from '@/data/database/types';
import { BackupRepository } from '@/data/repositories/backupRepository';
import {
  backupDocumentSchema,
  parseBackupDocument,
  type BackupDocument,
} from '@/schemas/backup';

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
  constructor(private readonly database: DatabaseConnection) {}

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

  async createBackupContents(createdAt = new Date().toISOString()): Promise<string> {
    const document = await this.createDocument(createdAt);
    const contents = JSON.stringify(document, null, 2);
    parseBackupDocument(contents);
    return contents;
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
