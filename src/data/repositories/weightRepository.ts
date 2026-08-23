import type { DatabaseConnection } from '@/data/database/types';

export type WeightRecord = Readonly<{
  id: string;
  date: string;
  weight_lb: number;
  created_at: string;
  updated_at: string;
}>;

export class WeightRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findById(id: string): Promise<WeightRecord | null> {
    return this.database.getFirstAsync<WeightRecord>(
      'SELECT * FROM weigh_ins WHERE id = ?;',
      id,
    );
  }

  async findByDate(date: string): Promise<WeightRecord | null> {
    return this.database.getFirstAsync<WeightRecord>(
      'SELECT * FROM weigh_ins WHERE date = ?;',
      date,
    );
  }

  async listAll(): Promise<WeightRecord[]> {
    return this.database.getAllAsync<WeightRecord>(
      'SELECT * FROM weigh_ins ORDER BY date ASC;',
    );
  }

  async listBetween(startDate: string | null, endDate: string): Promise<WeightRecord[]> {
    if (startDate === null) {
      return this.database.getAllAsync<WeightRecord>(
        'SELECT * FROM weigh_ins WHERE date <= ? ORDER BY date ASC;',
        endDate,
      );
    }
    return this.database.getAllAsync<WeightRecord>(
      'SELECT * FROM weigh_ins WHERE date >= ? AND date <= ? ORDER BY date ASC;',
      startDate,
      endDate,
    );
  }

  async upsert(record: WeightRecord): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO weigh_ins (id, date, weight_lb, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_lb = excluded.weight_lb,
         updated_at = excluded.updated_at;`,
      record.id,
      record.date,
      record.weight_lb,
      record.created_at,
      record.updated_at,
    );
  }

  async update(record: WeightRecord): Promise<void> {
    await this.database.runAsync(
      'UPDATE weigh_ins SET date = ?, weight_lb = ?, updated_at = ? WHERE id = ?;',
      record.date,
      record.weight_lb,
      record.updated_at,
      record.id,
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM weigh_ins WHERE id = ?;', id);
  }
}
