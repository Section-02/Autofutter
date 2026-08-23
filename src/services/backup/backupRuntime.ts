import type { DatabaseConnection } from '@/data/database/types';
import {
  BackupStateRepository,
  getBackupStatus,
  type BackupStateRecord,
  type BackupStatus,
} from '@/data/repositories/backupStateRepository';

import { BackupService } from './backupService';
import type { BackupStorageProvider } from './backupStorageProvider';

const BACKUP_DEBOUNCE_MS = 5_000;

export type BackupStatusSnapshot = Readonly<{
  status: BackupStatus;
  lastSuccessAt: string | null;
  lastError: string | null;
}>;

type Listener = (snapshot: BackupStatusSnapshot) => void;

class BackupRuntime {
  private database: DatabaseConnection | null = null;
  private storage: BackupStorageProvider | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<Listener>();

  async configure(database: DatabaseConnection, storage: BackupStorageProvider): Promise<void> {
    this.database = database;
    this.storage = storage;
    const state = await new BackupStateRepository(database).get();
    this.emit(state);
    if (state.is_dirty === 1) {
      this.schedule();
    }
  }

  markDirty(): Promise<void> {
    if (!this.database) {
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      if (!this.database) return;
      const repository = new BackupStateRepository(this.database);
      await repository.markDirty();
      this.emit(await repository.get());
      this.schedule();
    });
  }

  backupNow(): Promise<void> {
    this.clearTimer();
    return this.enqueue(async () => {
      if (!this.database || !this.storage) {
        throw new Error('Backup is not ready yet.');
      }
      const repository = new BackupStateRepository(this.database);
      const timestamp = new Date().toISOString();
      try {
        await new BackupService(this.database, this.storage).writeCurrentBackup(timestamp);
        await repository.markSucceeded(timestamp);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Backup failed.';
        await repository.markFailed(timestamp, message);
        this.emit(await repository.get());
        throw error;
      }
      this.emit(await repository.get());
    });
  }

  flushPending(): Promise<void> {
    if (!this.database) return Promise.resolve();
    this.clearTimer();
    return this.enqueue(async () => {
      if (!this.database || !this.storage) return;
      const state = await new BackupStateRepository(this.database).get();
      if (state.is_dirty === 0) return;
      const timestamp = new Date().toISOString();
      const repository = new BackupStateRepository(this.database);
      try {
        await new BackupService(this.database, this.storage).writeCurrentBackup(timestamp);
        await repository.markSucceeded(timestamp);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Backup failed.';
        await repository.markFailed(timestamp, message);
      }
      this.emit(await repository.get());
    });
  }

  async getSnapshot(): Promise<BackupStatusSnapshot> {
    if (!this.database) {
      return { status: 'pending', lastSuccessAt: null, lastError: null };
    }
    return toSnapshot(await new BackupStateRepository(this.database).get());
  }

  getService(): BackupService {
    if (!this.database || !this.storage) {
      throw new Error('Backup is not ready yet.');
    }
    return new BackupService(this.database, this.storage);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private schedule(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flushPending();
    }, BACKUP_DEBOUNCE_MS);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit(state: BackupStateRecord): void {
    const snapshot = toSnapshot(state);
    for (const listener of this.listeners) listener(snapshot);
  }
}

function toSnapshot(state: BackupStateRecord): BackupStatusSnapshot {
  return {
    status: getBackupStatus(state),
    lastSuccessAt: state.last_success_at,
    lastError: state.last_error,
  };
}

export const backupRuntime = new BackupRuntime();
