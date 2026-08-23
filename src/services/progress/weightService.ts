import { randomUUID } from 'expo-crypto';

import type { DatabaseConnection } from '@/data/database/types';
import { WeightRepository, type WeightRecord } from '@/data/repositories/weightRepository';
import { assertLocalDate, toLocalDateString } from '@/utils/dates';

export type WeightInput = Readonly<{ date: string; weightLb: number }>;
type Options = Readonly<{ createId?: () => string; now?: () => Date }>;

export class WeightValidationError extends Error {}

export class WeightService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly database: DatabaseConnection, options: Options = {}) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  private validate(input: WeightInput): void {
    assertLocalDate(input.date);
    if (input.date > toLocalDateString(this.now())) {
      throw new WeightValidationError('Future weight dates are not supported.');
    }
    if (!Number.isFinite(input.weightLb) || input.weightLb <= 0) {
      throw new WeightValidationError('Weight must be greater than zero.');
    }
  }

  async save(input: WeightInput): Promise<WeightRecord> {
    this.validate(input);
    const repository = new WeightRepository(this.database);
    const existing = await repository.findByDate(input.date);
    const timestamp = this.now().toISOString();
    const record: WeightRecord = existing === null
      ? { id: this.createId(), date: input.date, weight_lb: input.weightLb, created_at: timestamp, updated_at: timestamp }
      : { ...existing, weight_lb: input.weightLb, updated_at: timestamp };
    await repository.upsert(record);
    return record;
  }

  async update(id: string, input: WeightInput): Promise<WeightRecord> {
    this.validate(input);
    const repository = new WeightRepository(this.database);
    const existing = await repository.findById(id);
    if (existing === null) throw new Error('Weigh-in was not found.');
    const dateConflict = await repository.findByDate(input.date);
    if (dateConflict !== null && dateConflict.id !== id) {
      throw new WeightValidationError('A weigh-in already exists for this date.');
    }
    const record = { ...existing, date: input.date, weight_lb: input.weightLb, updated_at: this.now().toISOString() };
    await repository.update(record);
    return record;
  }

  async delete(id: string): Promise<void> {
    const repository = new WeightRepository(this.database);
    if (await repository.findById(id) === null) throw new Error('Weigh-in was not found.');
    await repository.delete(id);
  }
}
